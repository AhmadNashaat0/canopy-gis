import { and, eq, sql } from "drizzle-orm";
import { gisBasisGrid, gisProperties, gisSalesEvidence } from "@gis-app/db/schema/index";
import type { BasisGridOutput, SourceEvidenceRow } from "./types";
import { db } from "@gis-app/db";

export async function runBasisGridPipeline({
  logger = console.log,
}: {
  logger?: any;
}): Promise<{ inserted: number }> {
  logger("Stating basis grid pipeline...");

  let processedRows = 0;
  const batchSize = 2000;

  const [markets] = await db
    .select({ marketList: sql<string[]>`array_agg(distinct market)` })
    .from(gisProperties);

  for (const market of markets?.marketList ?? []) {
    logger(`Running basis grid pipeline for market ${market}...`);
    const sourceRows = await loadSourceEvidence({ market: market });
    const computedRows = computeBasisGrid({ data: sourceRows, logger });

    if (computedRows.length === 0) {
      logger(`No basis grid rows for market ${market}.`);
      return { inserted: 0 };
    }

    await db.transaction(async (tx) => {
      await tx.delete(gisBasisGrid).where(eq(gisBasisGrid.market, market));
      for (let i = 0; i < computedRows.length; i += batchSize) {
        logger(`Inserting: ${i}/${computedRows.length}`);
        const chunk = computedRows.slice(i, i + batchSize);
        await tx.insert(gisBasisGrid).values(chunk);
      }
    });

    processedRows += computedRows.length;
    logger(`Processed ${computedRows.length} basis grid rows for market ${market}.`);
  }

  return { inserted: processedRows };
}

export async function loadSourceEvidence({
  market,
  logger = console.log,
}: {
  market?: string;
  logger?: any;
}): Promise<SourceEvidenceRow[]> {
  logger("Loading source evidence...");
  const rows = await db
    .select({
      property: {
        propertyId: gisProperties.propertyId,
        propertyName: gisProperties.propertyName,
        addressText: gisProperties.addressText,
        market: gisProperties.market,
        submarket: gisProperties.submarket,
        totalSf: gisProperties.totalSf,
        avgSuiteSf: gisProperties.avgSuiteSf,
        avgSuiteSizeBucket: gisProperties.avgSuiteSizeBucket,
        buildingClass: gisProperties.buildingClass,
        locationClass: gisProperties.locationClass,
        propertyType: gisProperties.propertyType,
        latitude: gisProperties.latitude,
        longitude: gisProperties.longitude,
      },
      sale: {
        id: gisSalesEvidence.id,
        propertyId: gisSalesEvidence.propertyId,
        saleDate: gisSalesEvidence.saleDate,
        salePrice: gisSalesEvidence.salePrice,
        salePricePerSf: gisSalesEvidence.salePricePerSf,
        buildingClass: gisSalesEvidence.buildingClass,
        locationClass: gisSalesEvidence.locationClass,
        suiteSizeBucket: gisSalesEvidence.suiteSizeBucket,
        dataSource: gisSalesEvidence.dataSource,
        confidenceScore: gisSalesEvidence.confidenceScore,
        saleAgeMonths: sql<number>`case
          when ${gisSalesEvidence.saleDate} is null then null
          else (
            extract(year from age(current_date, ${gisSalesEvidence.saleDate})) * 12 +
            extract(month from age(current_date, ${gisSalesEvidence.saleDate}))
          )::int
        end`,
        hasValidSale: sql<boolean>`(
          ${gisSalesEvidence.saleDate} is not null and
          ${gisSalesEvidence.salePricePerSf} is not null and
          ${gisProperties.latitude} is not null and
          ${gisProperties.longitude} is not null
        )`,
        saleQualityFlag: sql<string>`case
          when ${gisSalesEvidence.confidenceScore} is not null and ${gisSalesEvidence.confidenceScore}::numeric < 0.5 then 'excluded'
          else 'normal'
        end`,
      },
    })
    .from(gisSalesEvidence)
    .innerJoin(gisProperties, eq(gisSalesEvidence.propertyId, gisProperties.propertyId))
    .where(
      market
        ? and(
            eq(gisProperties.market, market),
            sql`${gisProperties.latitude} is not null`,
            sql`${gisProperties.longitude} is not null`,
            sql`${gisSalesEvidence.salePricePerSf} is not null`,
          )
        : and(
            sql`${gisProperties.latitude} is not null`,
            sql`${gisProperties.longitude} is not null`,
            sql`${gisSalesEvidence.salePricePerSf} is not null`,
          ),
    );

  logger(`Loaded ${rows.length} source evidence rows`);
  return rows;
}

export function computeBasisGrid({
  data: sourceRows,
  logger,
}: {
  data: SourceEvidenceRow[];
  logger: any;
}): BasisGridOutput[] {
  logger("Computing basis grid...");

  const MAX_SALE_AGE_MONTHS = 36;
  const TIME_HALF_LIFE_MONTHS = 18.0;
  const BANDWIDTH_MILES: Record<string, number> = {
    small: 0.75,
    medium: 1.0,
    large: 1.25,
  };
  const KERNEL_CUTOFF_MULT = 3.0;
  const ESS_HIGH = 10.0;
  const ESS_MED = 5.0;
  const CELL_METERS = 500.0;

  const sales = sourceRows
    .map((row) => ({
      latitude: row.property.latitude,
      longitude: row.property.longitude,
      buildingClass: (row.sale.buildingClass ?? row.property.buildingClass ?? "")
        .trim()
        .toUpperCase(),
      suiteSizeBucket: (row.sale.suiteSizeBucket ?? row.property.avgSuiteSizeBucket ?? "")
        .trim()
        .toLowerCase(),
      basisPsf: toNumber(row.sale.salePricePerSf),
      saleAgeMonths: row.sale.saleAgeMonths,
      hasValidSale: row.sale.hasValidSale,
      saleQualityFlag: (row.sale.saleQualityFlag ?? "normal").toLowerCase(),
      market: row.property.market ?? "UNKNOWN",
    }))
    .filter(
      (row) =>
        row.hasValidSale === true &&
        row.saleQualityFlag === "normal" &&
        row.saleAgeMonths != null &&
        row.saleAgeMonths <= MAX_SALE_AGE_MONTHS &&
        row.basisPsf != null &&
        row.latitude != null &&
        row.longitude != null &&
        ["small", "medium", "large"].includes(row.suiteSizeBucket) &&
        ["A", "B", "C"].includes(row.buildingClass),
    );

  if (sales.length === 0) {
    return [];
  }

  const minLat = Math.min(...sales.map((r) => r.latitude as number)) - 0.01;
  const maxLat = Math.max(...sales.map((r) => r.latitude as number)) + 0.01;
  const minLon = Math.min(...sales.map((r) => r.longitude as number)) - 0.01;
  const maxLon = Math.max(...sales.map((r) => r.longitude as number)) + 0.01;

  const { latCenters, lonCenters, dlat, dlon } = makeGrid(
    minLat,
    maxLat,
    minLon,
    maxLon,
    CELL_METERS,
  );
  logger("Computed grid centers:", latCenters.length, lonCenters.length);

  const market = sales[0]?.market ?? "UNKNOWN";
  const outputs: BasisGridOutput[] = [];

  for (const suiteBucket of ["medium", "large"]) {
    logger(`Computing basis grid for suite size bucket ${suiteBucket}...`);
    for (const cls of ["A", "B", "C"]) {
      logger(`  Computing basis grid for building class ${cls}...`);

      const seg = sales.filter((s) => s.suiteSizeBucket === suiteBucket && s.buildingClass === cls);

      if (seg.length === 0) {
        for (const cellLat of latCenters) {
          for (const cellLon of lonCenters) {
            outputs.push({
              cellLat,
              cellLon,
              cellDlat: dlat,
              cellDlon: dlon,
              suiteSizeBucket: suiteBucket,
              buildingClass: cls,
              basisPsf: "0",
              ess: "0",
              confidence: "low",
              method: "no_sales_in_segment",
              market,
              renderBasisPsf: "0",
              renderOpacity: toNumericString(0.25),
            });
          }
        }
        continue;
      }

      const bandwidthMiles = BANDWIDTH_MILES[suiteBucket] ?? 1;
      const cutoff = bandwidthMiles * KERNEL_CUTOFF_MULT;
      const sLat = seg.map((s) => s.latitude as number);
      const sLon = seg.map((s) => s.longitude as number);
      const sBasis = seg.map((s) => s.basisPsf as number);
      const sAge = seg.map((s) => s.saleAgeMonths as number);
      const wTime = sAge.map((months) => timeWeight(months, TIME_HALF_LIFE_MONTHS));

      for (const cellLat of latCenters) {
        for (const cellLon of lonCenters) {
          const distances = sLat.map((lat, i) =>
            haversineMiles(cellLat, cellLon, lat, sLon[i] ?? 0),
          );
          const kept = distances.map((d, i) => ({ d, i })).filter((x) => x.d <= cutoff);

          if (kept.length === 0) {
            outputs.push({
              cellLat,
              cellLon,
              cellDlat: dlat,
              cellDlon: dlon,
              suiteSizeBucket: suiteBucket,
              buildingClass: cls,
              basisPsf: "0",
              ess: "0",
              confidence: "low",
              method: "no_local_sales",
              market,
              renderBasisPsf: "0",
              renderOpacity: toNumericString(0.25),
            });
            continue;
          }

          const values = kept.map(({ i }) => sBasis[i]) as number[];
          const weights = kept.map(
            ({ d, i }) => gaussianKernel(d / bandwidthMiles) * (wTime[i] as number),
          );
          const ess = effectiveSampleSize(weights);
          const basisPsf = weightedMedian(values, weights);
          const renderBasisPsf = Number.isFinite(basisPsf) && ess >= 1.0 ? basisPsf : null;

          outputs.push({
            cellLat,
            cellLon,
            cellDlat: dlat,
            cellDlon: dlon,
            suiteSizeBucket: suiteBucket,
            buildingClass: cls,
            basisPsf: Number.isFinite(basisPsf) ? toNumericString(basisPsf) : "0",
            ess: toNumericString(ess),
            confidence: ess >= ESS_HIGH ? "high" : ess >= ESS_MED ? "medium" : "low",
            method: "weighted_median_gaussian",
            market,
            renderBasisPsf: renderBasisPsf == null ? "0" : toNumericString(renderBasisPsf),
            renderOpacity: toNumericString(clamp(ess / 2.0, 0.25, 1.0)),
          });
        }
      }
    }
  }
  logger("Computed basis grid rows:", outputs.length);
  return outputs;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function timeWeight(monthsOld: number, halfLifeMonths: number): number {
  return Math.pow(2, -monthsOld / halfLifeMonths);
}

function gaussianKernel(u: number): number {
  return Math.exp(-0.5 * u * u);
}

function weightedMedian(values: number[], weights: number[]): number {
  if (values.length === 0) return Number.NaN;
  const pairs = values
    .map((value, i) => ({ value, weight: weights[i] ?? 0 }))
    .sort((a, b) => a.value - b.value);
  const totalWeight = pairs.reduce((sum, p) => sum + p.weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) return Number.NaN;

  let cumulative = 0;
  for (const pair of pairs) {
    cumulative += pair.weight;
    if (cumulative / totalWeight >= 0.5) return pair.value;
  }
  return pairs[pairs.length - 1]?.value ?? Number.NaN;
}

function effectiveSampleSize(weights: number[]): number {
  const s1 = weights.reduce((sum, w) => sum + w, 0);
  const s2 = weights.reduce((sum, w) => sum + w * w, 0);
  if (s1 <= 0 || s2 <= 0) return 0;
  return (s1 * s1) / s2;
}

function degreesPerMeterLat(): number {
  return 1 / 111320;
}

function degreesPerMeterLon(atLat: number): number {
  return 1 / (111320 * Math.cos((atLat * Math.PI) / 180));
}

function makeGrid(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  cellMeters: number,
): { latCenters: number[]; lonCenters: number[]; dlat: number; dlon: number } {
  const midLat = (minLat + maxLat) / 2;
  const dlat = cellMeters * degreesPerMeterLat();
  const dlon = cellMeters * degreesPerMeterLon(midLat);
  const latCenters: number[] = [];
  const lonCenters: number[] = [];

  for (let lat = minLat; lat <= maxLat + dlat; lat += dlat) latCenters.push(lat);
  for (let lon = minLon; lon <= maxLon + dlon; lon += dlon) lonCenters.push(lon);

  return { latCenters, lonCenters, dlat, dlon };
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rEarthMiles = 3958.7613;
  const lat1r = (lat1 * Math.PI) / 180;
  const lon1r = (lon1 * Math.PI) / 180;
  const lat2r = (lat2 * Math.PI) / 180;
  const lon2r = (lon2 * Math.PI) / 180;
  const dlat = lat2r - lat1r;
  const dlon = lon2r - lon1r;
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(lat1r) * Math.cos(lat2r) * Math.sin(dlon / 2) ** 2;
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  return rEarthMiles * c;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toNumericString(value: number, scale = 6): string {
  return value.toFixed(scale);
}
