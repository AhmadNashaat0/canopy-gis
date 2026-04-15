import { and, eq, sql } from "drizzle-orm";
import { db } from "@gis-app/db";
import { gisBasisGrid, gisBasisLayer, gisProperties } from "@gis-app/db/schema/index";
import type { BasisSurfaceGridRow } from "./types";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@gis-app/env/worker";

function cellPolygonFromCenter(
  latC: number,
  lonC: number,
  dlat: number,
  dlon: number,
): [number, number][] {
  const halfLat = dlat / 2.0;
  const halfLon = dlon / 2.0;

  const latS = latC - halfLat;
  const latN = latC + halfLat;
  const lonW = lonC - halfLon;
  const lonE = lonC + halfLon;

  // GeoJSON ring expects [lon, lat]
  return [
    [lonW, latS],
    [lonE, latS],
    [lonE, latN],
    [lonW, latN],
    [lonW, latS],
  ];
}

function safeKeyPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildPublicUrl(bucket: string, region: string, key: string): string {
  const base = env.AWS_S3_PUBLIC_BASE_URL?.replace(/\/+$/g, "");
  if (base) return `${base}/${key}`;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function makeGeoJson(rows: BasisSurfaceGridRow[]) {
  const features = rows.map((row) => {
    const ring = cellPolygonFromCenter(row.cellLat, row.cellLon, row.cellDlat, row.cellDlon);
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [ring],
      },
      properties: {
        cell_id: row.cellId,
        market: row.market,
        suite_size_bucket: row.suiteSizeBucket,
        building_class: row.buildingClass,
        render_basis_psf: Number(row.renderBasisPsf),
      },
    };
  });

  return { type: "FeatureCollection", features };
}

async function uploadGeoJsonToS3(args: {
  market: string;
  buildingClass: string;
  suiteSize: string;
  body: string;
}) {
  const s3 = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const key = `${env.AWS_S3_PREFIX}/basis_layer_${safeKeyPart(args.market)}_${safeKeyPart(
    args.buildingClass,
  )}_${safeKeyPart(args.suiteSize)}.geojson`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET_BASIS_LAYERS,
      Key: key,
      Body: args.body,
      ContentType: "application/geo+json; charset=utf-8",
    }),
  );

  return { key, url: buildPublicUrl(env.AWS_S3_BUCKET_BASIS_LAYERS, env.AWS_REGION, key) };
}

export async function runBasisSurfaceLayerPipeline() {
  console.log("Starting basis surface layer pipeline...");

  const [dataList] = await db
    .select({
      marketList: sql<string[]>`array_agg(distinct market)`,
      buildingClassList: sql<string[]>`array_agg(distinct building_class)`,
      suiteSizeBucketList: sql<string[]>`array_agg(distinct avg_suite_size_bucket)`,
    })
    .from(gisProperties);

  for (const market of dataList?.marketList ?? []) {
    for (const suiteSize of dataList?.suiteSizeBucketList ?? []) {
      for (const buildingClass of dataList?.buildingClassList ?? []) {
        console.log(
          `Running basis surface layer pipeline for market ${market} class ${buildingClass} size ${suiteSize}...`,
        );

        // log time taken to load data
        console.time("loading data");
        const rows = await db
          .select({
            cellId: gisBasisGrid.id,
            cellLat: gisBasisGrid.cellLat,
            cellLon: gisBasisGrid.cellLon,
            cellDlat: gisBasisGrid.cellDlat,
            cellDlon: gisBasisGrid.cellDlon,
            renderBasisPsf: sql<string>`${gisBasisGrid.renderBasisPsf}::text`,
            buildingClass: gisBasisGrid.buildingClass,
            suiteSizeBucket: gisBasisGrid.suiteSizeBucket,
            market: gisBasisGrid.market,
          })
          .from(gisBasisGrid)
          .where(
            and(
              eq(gisBasisGrid.market, market),
              eq(gisBasisGrid.suiteSizeBucket, suiteSize),
              eq(gisBasisGrid.buildingClass, buildingClass),
            ),
          );

        console.timeEnd("loading data");
        console.log(`Loaded ${rows.length} basis surface grid rows`);

        if (rows.length === 0) {
          console.log("No rows found in gis_basis_grid; nothing to render.");
          return { rendered: 0, uploaded: 0, upserted: 0 };
        }

        console.time("generate geojson");
        const geojson = makeGeoJson(rows);
        const body = JSON.stringify(geojson);
        console.timeEnd("generate geojson");

        const uploadedObj = await uploadGeoJsonToS3({
          market,
          buildingClass,
          suiteSize,
          body,
        });

        console.log("uploaded file to s3");

        await db
          .insert(gisBasisLayer)
          .values({
            market,
            buildingClass,
            suiteSize,
            url: uploadedObj.url,
          })
          .onConflictDoUpdate({
            target: [gisBasisLayer.market, gisBasisLayer.buildingClass, gisBasisLayer.suiteSize],
            set: {
              url: uploadedObj.url,
            },
          });

        console.log("saved in db");

        console.log(
          `Uploaded basis surface layer: market=${market} class=${buildingClass} size=${suiteSize}`,
        );
      }
    }
  }

  return { success: true };
}
