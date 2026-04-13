import { and, eq, sql } from "drizzle-orm";
import { gisBasisGrid, gisProperties, gisSalesEvidence } from "@gis-app/db/schema/index";
import type { BasisGridOutput, SourceEvidenceRow } from "./types";
import { db } from "@gis-app/db";

export async function runBasisGridPipeline(): Promise<{ inserted: number }> {
  const batchSize = 1000;

  const sourceRows = await loadSourceEvidence();
  const computedRows = computeBasisGrid(sourceRows);

  if (computedRows.length === 0) {
    return { inserted: 0 };
  }

  await db.transaction(async (tx) => {
    await tx.delete(gisBasisGrid);
    for (let i = 0; i < computedRows.length; i += batchSize) {
      const chunk = computedRows.slice(i, i + batchSize);
      await tx.insert(gisBasisGrid).values(chunk);
    }
  });

  return { inserted: computedRows.length };
}

export async function loadSourceEvidence(): Promise<SourceEvidenceRow[]> {
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
      },
    })
    .from(gisSalesEvidence)
    .innerJoin(gisProperties, eq(gisSalesEvidence.propertyId, gisProperties.propertyId))
    .where(
      and(
        sql`${gisProperties.latitude} is not null`,
        sql`${gisProperties.longitude} is not null`,
        sql`${gisSalesEvidence.salePricePerSf} is not null`,
      ),
    );

  return rows;
}

export function computeBasisGrid(sourceRows: SourceEvidenceRow[]): BasisGridOutput[] {
  const CELL_DLAT = 0.05;
  const CELL_DLON = 0.05;

  type Group = {
    count: number;
    sumPsf: number;
    market: string;
    suiteSizeBucket: string;
    buildingClass: string;
    cellLat: number;
    cellLon: number;
    cellDlat: number;
    cellDlon: number;
  };

  const groups = new Map<string, Group>();

  for (const row of sourceRows) {
    const lat = row.property.latitude;
    const lon = row.property.longitude;
    const market = row.property.market ?? "UNKNOWN";
    const suiteSizeBucket =
      row.sale.suiteSizeBucket ?? row.property.avgSuiteSizeBucket ?? "UNKNOWN";
    const buildingClass = row.sale.buildingClass ?? row.property.buildingClass ?? "UNKNOWN";
    const salePricePerSf = toNumber(row.sale.salePricePerSf);

    if (lat == null || lon == null || salePricePerSf == null) {
      continue;
    }

    const cellLat = Math.floor(lat / CELL_DLAT) * CELL_DLAT;
    const cellLon = Math.floor(lon / CELL_DLON) * CELL_DLON;

    const key = [
      market,
      suiteSizeBucket,
      buildingClass,
      cellLat.toFixed(6),
      cellLon.toFixed(6),
    ].join("|");

    const current = groups.get(key);

    if (current) {
      current.count += 1;
      current.sumPsf += salePricePerSf;
    } else {
      groups.set(key, {
        count: 1,
        sumPsf: salePricePerSf,
        market,
        suiteSizeBucket,
        buildingClass,
        cellLat,
        cellLon,
        cellDlat: CELL_DLAT,
        cellDlon: CELL_DLON,
      });
    }
  }

  const outputs: BasisGridOutput[] = [];

  for (const group of groups.values()) {
    const basisPsf = group.sumPsf / group.count;
    const ess = group.count;

    outputs.push({
      cellLat: group.cellLat,
      cellLon: group.cellLon,
      cellDlat: group.cellDlat,
      cellDlon: group.cellDlon,
      suiteSizeBucket: group.suiteSizeBucket,
      buildingClass: group.buildingClass,
      basisPsf: toNumericString(basisPsf),
      ess: toNumericString(ess),
      confidence: classifyConfidence(ess),
      method: "simple_average_placeholder",
      market: group.market,
      renderBasisPsf: toNumericString(basisPsf),
      renderOpacity: toNumericString(renderOpacityFromEss(ess)),
    });
  }

  return outputs;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function toNumericString(value: number, scale = 6): string {
  return value.toFixed(scale);
}

function classifyConfidence(ess: number): string {
  if (ess >= 15) return "high";
  if (ess >= 7) return "medium";
  return "low";
}

function renderOpacityFromEss(ess: number): number {
  if (ess >= 15) return 0.95;
  if (ess >= 7) return 0.75;
  return 0.5;
}
