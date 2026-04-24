import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import jwt from "jsonwebtoken";

/**
 * Salesforce -> GIS loader for BullMQ workers.
 *
 * This is a TypeScript/Drizzle conversion of sf_to_gis_loader.py.
 * It uses Salesforce JWT Bearer auth, so it is safe for headless workers.
 * No browser login is required after the Salesforce Connected App is approved.
 */

export type SfToGisLoaderOptions = {
  db: NodePgDatabase<any>;
  testMarket?: string;
  minTotalSf?: number;
  saleLookbackMonths?: number;
  geocodeMinConfidence?: number;
  batchSize?: number;
  geocoderProvider?: "google" | "mapbox" | "none";
};

type SalesforceAuthResponse = {
  access_token: string;
  instance_url: string;
  token_type: string;
  issued_at?: string;
  signature?: string;
};

type SalesforceQueryResponse<T> = {
  totalSize: number;
  done: boolean;
  records: T[];
  nextRecordsUrl?: string;
};

type SfPropertyRecord = {
  Id?: string;
  Name?: string;
  Property_Address__c?: string;
  Market__c?: string;
  Submarket_new__r?: { Name?: string } | null;
  Square_Footage_RBA__c?: number | string | null;
  Average_Suite_Size__c?: number | string | null;
  Avg_Suite_Size_Range__c?: string | null;
  Site_Size_AC__c?: number | string | null;
  Construction_Type__c?: string | null;
  Year_Built__c?: number | string | null;
  Building_Class__c?: string | null;
  Location_Class__c?: string | null;
  Property_Type__c?: string | null;
  IOS_Viable__c?: string | boolean | null;
  Cold_Storage__c?: string | boolean | null;
  Legal_Owner_Name__c?: string | null;
  Last_Sale_Date__c?: string | null;
  Last_Sale_Price__c?: number | string | null;
  Last_Sale_Price_SF__c?: number | string | null;
  Per_Sq_Feet_Valuation__c?: number | string | null;
  LastModifiedDate?: string | null;
  Account?: { Name?: string } | null;
};

type PropertyRow = {
  propertyId: string;
  propertyName: string | null;
  addressText: string;
  market: string | null;
  submarket: string | null;
  totalSf: number;
  avgSuiteSf: number | null;
  avgSuiteSizeBucket: string | null;
  siteAcres: number | null;
  constructionType: string | null;
  yearBuilt: number | null;
  buildingClass: string | null;
  locationClass: string | null;
  propertyType: string | null;
  iosViable: boolean | null;
  coldStorage: boolean | null;
  trueOwnerName: string | null;
  legalOwnerName: string | null;
  sfLastModified: Date | null;
};

type SaleEvidenceRow = {
  propertyId: string;
  saleDate: string;
  salePrice: number | null;
  salePricePerSf: number;
  buildingClass: string | null;
  locationClass: string | null;
  suiteSizeBucket: string | null;
};

type GeocodeResult = {
  lat: number | null;
  lon: number | null;
  confidence: number;
  source: string;
};

const SF_CLIENT_ID = requiredEnv("SF_CLIENT_ID");
const SF_USERNAME = requiredEnv("SF_USERNAME");
const SF_PRIVATE_KEY = process.env.SF_PRIVATE_KEY?.replace(/\\n/g, "\n");
const SF_PRIVATE_KEY_PATH = process.env.SF_PRIVATE_KEY_PATH;
const SF_AUTH_URL = process.env.SF_AUTH_URL ?? "https://login.salesforce.com";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN ?? "";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function readPrivateKey(): Promise<string> {
  if (SF_PRIVATE_KEY) return SF_PRIVATE_KEY;
  if (!SF_PRIVATE_KEY_PATH) throw new Error("Set SF_PRIVATE_KEY or SF_PRIVATE_KEY_PATH");
  const { readFile } = await import("node:fs/promises");
  return readFile(SF_PRIVATE_KEY_PATH, "utf8");
}

function salesforcePropertySoql(testMarket?: string): string {
  const marketFilter = testMarket ? `WHERE Market__c = '${testMarket.replace(/'/g, "\\'")}'` : "";

  return `
SELECT
  Id,
  Name,
  Property_Address__c,
  Market__c,
  Submarket_new__r.Name,
  Square_Footage_RBA__c,
  Average_Suite_Size__c,
  Avg_Suite_Size_Range__c,
  Site_Size_AC__c,
  Construction_Type__c,
  Year_Built__c,
  Building_Class__c,
  Location_Class__c,
  Property_Type__c,
  IOS_Viable__c,
  Cold_Storage__c,
  Legal_Owner_Name__c,
  Last_Sale_Date__c,
  Last_Sale_Price__c,
  Last_Sale_Price_SF__c,
  Per_Sq_Feet_Valuation__c,
  LastModifiedDate
FROM Property__c
${marketFilter}`;
}

async function salesforceJwtLogin(): Promise<SalesforceAuthResponse> {
  const privateKey = await readPrivateKey();
  const now = Math.floor(Date.now() / 1000);

  const assertion = jwt.sign(
    {
      iss: SF_CLIENT_ID,
      sub: SF_USERNAME,
      aud: SF_AUTH_URL,
      exp: now + 300,
    },
    privateKey,
    { algorithm: "RS256" },
  );

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetch(`${SF_AUTH_URL}/services/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Salesforce JWT login failed: ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<SalesforceAuthResponse>;
}

async function sfGet<T>(auth: SalesforceAuthResponse, path: string): Promise<T> {
  const response = await fetch(`${auth.instance_url}${path}`, {
    headers: { authorization: `Bearer ${auth.access_token}` },
  });
  if (!response.ok) throw new Error(`Salesforce request failed: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function fetchAllProperties(auth: SalesforceAuthResponse, soql: string): Promise<SfPropertyRecord[]> {
  const records: SfPropertyRecord[] = [];
  let result = await sfGet<SalesforceQueryResponse<SfPropertyRecord>>(
    auth,
    `/services/data/v60.0/query?q=${encodeURIComponent(soql)}`,
  );
  records.push(...result.records);

  while (!result.done && result.nextRecordsUrl) {
    result = await sfGet<SalesforceQueryResponse<SfPropertyRecord>>(auth, result.nextRecordsUrl);
    records.push(...result.records);
  }

  return records;
}

function safeInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function safeFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeBoolPicklist(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (["yes", "y", "true", "1", "viable"].includes(s)) return true;
  if (["no", "n", "false", "0", "not viable"].includes(s)) return false;
  return null;
}

function normalizeClass(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim().toUpperCase();
  if (["A", "B", "C"].includes(s)) return s;
  return s && ["A", "B", "C"].includes(s[0]) ? s[0] : s;
}

function suiteBucketFromSf(avgSuiteSf: number | null): string | null {
  if (avgSuiteSf === null) return null;
  if (avgSuiteSf < 25_000) return "small";
  if (avgSuiteSf <= 100_000) return "medium";
  return "large";
}

function monthsAgo(date: Date): number {
  const today = new Date();
  return (today.getUTCFullYear() - date.getUTCFullYear()) * 12 + (today.getUTCMonth() - date.getUTCMonth());
}

function parseSfDatetime(value?: string | null): Date | null {
  if (!value) return null;
  const normalized = value.endsWith("Z")
    ? value
    : value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizePropertyRow(rec: SfPropertyRecord, minTotalSf: number): PropertyRow | null {
  if (!rec.Id || !rec.Property_Address__c) return null;

  const totalSf = safeInt(rec.Square_Footage_RBA__c);
  if (totalSf === null || totalSf < minTotalSf) return null;

  const avgSuiteSf = safeInt(rec.Average_Suite_Size__c);

  return {
    propertyId: rec.Id,
    propertyName: rec.Name ?? null,
    addressText: String(rec.Property_Address__c),
    market: rec.Market__c ?? null,
    submarket: rec.Submarket_new__r?.Name ?? null,
    totalSf,
    avgSuiteSf,
    avgSuiteSizeBucket: suiteBucketFromSf(avgSuiteSf),
    siteAcres: safeFloat(rec.Site_Size_AC__c),
    constructionType: rec.Construction_Type__c ?? null,
    yearBuilt: safeInt(rec.Year_Built__c),
    buildingClass: normalizeClass(rec.Building_Class__c),
    locationClass: normalizeClass(rec.Location_Class__c),
    propertyType: rec.Property_Type__c ?? null,
    iosViable: safeBoolPicklist(rec.IOS_Viable__c),
    coldStorage: safeBoolPicklist(rec.Cold_Storage__c),
    trueOwnerName: rec.Account?.Name ?? null,
    legalOwnerName: rec.Legal_Owner_Name__c ?? null,
    sfLastModified: parseSfDatetime(rec.LastModifiedDate),
  };
}

function normalizeSaleRow(rec: SfPropertyRecord, suiteBucket: string | null, saleLookbackMonths: number): SaleEvidenceRow | null {
  const saleDate = rec.Last_Sale_Date__c;
  const salePricePerSf = safeFloat(rec.Last_Sale_Price_SF__c);
  if (!rec.Id || !saleDate || salePricePerSf === null || salePricePerSf <= 0) return null;

  const date = new Date(`${saleDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || monthsAgo(date) > saleLookbackMonths) return null;

  return {
    propertyId: rec.Id,
    saleDate,
    salePrice: safeFloat(rec.Last_Sale_Price__c),
    salePricePerSf,
    buildingClass: normalizeClass(rec.Building_Class__c),
    locationClass: normalizeClass(rec.Location_Class__c),
    suiteSizeBucket: suiteBucket ?? suiteBucketFromSf(safeInt(rec.Average_Suite_Size__c)),
  };
}

async function geocodeAddress(address: string, provider: "google" | "mapbox" | "none"): Promise<GeocodeResult> {
  const clean = address.trim();
  if (!clean || provider === "none") return { lat: null, lon: null, confidence: 0, source: "none" };

  if (provider === "google") {
    if (!GOOGLE_MAPS_API_KEY) throw new Error("GEOCODER_PROVIDER=google but GOOGLE_MAPS_API_KEY is missing");
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", clean);
    url.searchParams.set("key", GOOGLE_MAPS_API_KEY);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Google geocode failed: ${response.status} ${await response.text()}`);
    const data: any = await response.json();
    if (data.status !== "OK" || !data.results?.length) return { lat: null, lon: null, confidence: 0, source: "google" };
    const first = data.results[0];
    const loc = first.geometry.location;
    const locType = first.geometry.location_type;
    const confidence = locType === "ROOFTOP" ? 0.9 : locType ? 0.75 : 0.6;
    return { lat: Number(loc.lat), lon: Number(loc.lng), confidence, source: "google" };
  }

  if (!MAPBOX_TOKEN) throw new Error("GEOCODER_PROVIDER=mapbox but MAPBOX_TOKEN is missing");
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(clean)}.json`);
  url.searchParams.set("access_token", MAPBOX_TOKEN);
  url.searchParams.set("limit", "1");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Mapbox geocode failed: ${response.status} ${await response.text()}`);
  const data: any = await response.json();
  const first = data.features?.[0];
  if (!first) return { lat: null, lon: null, confidence: 0, source: "mapbox" };
  const [lon, lat] = first.center;
  return { lat: Number(lat), lon: Number(lon), confidence: Number(first.relevance ?? 0.6), source: "mapbox" };
}

async function upsertProperties(db: NodePgDatabase<any>, rows: PropertyRow[]): Promise<void> {
  if (!rows.length) return;

  await db.execute(sql`
    INSERT INTO gis_properties (
      property_id, property_name, address_text, market, submarket, total_sf,
      avg_suite_sf, avg_suite_size_bucket, site_acres, construction_type,
      year_built, building_class, location_class, property_type, ios_viable,
      cold_storage, true_owner_name, legal_owner_name, sf_last_modified, gis_last_synced
    )
    SELECT * FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(
      "propertyId" text,
      "propertyName" text,
      "addressText" text,
      market text,
      submarket text,
      "totalSf" integer,
      "avgSuiteSf" integer,
      "avgSuiteSizeBucket" text,
      "siteAcres" numeric,
      "constructionType" text,
      "yearBuilt" integer,
      "buildingClass" text,
      "locationClass" text,
      "propertyType" text,
      "iosViable" boolean,
      "coldStorage" boolean,
      "trueOwnerName" text,
      "legalOwnerName" text,
      "sfLastModified" timestamptz
    )
    ON CONFLICT (property_id) DO UPDATE SET
      property_name = EXCLUDED.property_name,
      address_text = EXCLUDED.address_text,
      market = EXCLUDED.market,
      submarket = EXCLUDED.submarket,
      total_sf = EXCLUDED.total_sf,
      avg_suite_sf = EXCLUDED.avg_suite_sf,
      avg_suite_size_bucket = EXCLUDED.avg_suite_size_bucket,
      site_acres = EXCLUDED.site_acres,
      construction_type = EXCLUDED.construction_type,
      year_built = EXCLUDED.year_built,
      building_class = EXCLUDED.building_class,
      location_class = EXCLUDED.location_class,
      property_type = EXCLUDED.property_type,
      ios_viable = EXCLUDED.ios_viable,
      cold_storage = EXCLUDED.cold_storage,
      true_owner_name = EXCLUDED.true_owner_name,
      legal_owner_name = EXCLUDED.legal_owner_name,
      sf_last_modified = EXCLUDED.sf_last_modified,
      gis_last_synced = now();
  `);
}

async function geocodeMissingGeometry(
  db: NodePgDatabase<any>,
  provider: "google" | "mapbox" | "none",
  minConfidence: number,
): Promise<number> {
  const result = await db.execute(sql<{ property_id: string; address_text: string }>`
    SELECT property_id, address_text
    FROM gis_properties
    WHERE geom IS NULL
      AND address_text IS NOT NULL
      AND address_text <> '';
  `);

  let updated = 0;
  for (const target of result.rows) {
    const geo = await geocodeAddress(target.address_text, provider);
    const status = geo.lat === null || geo.lon === null ? "failed" : geo.confidence < minConfidence ? "low_confidence" : "ok";

    await db.execute(sql`
      INSERT INTO gis_geocode_log (
        property_id, address_text, geocode_source, confidence_score, latitude, longitude, created_at
      ) VALUES (
        ${target.property_id}, ${target.address_text}, ${geo.source}, ${geo.confidence}, ${geo.lat}, ${geo.lon}, now()
      );
    `);

    if (geo.lat !== null && geo.lon !== null) {
      await db.execute(sql`
        UPDATE gis_properties
        SET
          latitude = ${geo.lat},
          longitude = ${geo.lon},
          geom = ST_SetSRID(ST_MakePoint(${geo.lon}, ${geo.lat}), 4326),
          geocode_confidence = ${geo.confidence},
          geocode_source = ${geo.source},
          geocode_status = ${status},
          gis_last_synced = now()
        WHERE property_id = ${target.property_id};
      `);
      updated += 1;
    }
  }

  return updated;
}

async function insertSalesEvidence(db: NodePgDatabase<any>, rows: SaleEvidenceRow[]): Promise<number> {
  let inserted = 0;
  for (const row of rows) {
    await db.execute(sql`
      INSERT INTO gis_sales_evidence (
        property_id, sale_date, sale_price, sale_price_per_sf, building_class,
        location_class, suite_size_bucket, geom, data_source, confidence_score, created_at
      )
      SELECT
        p.property_id,
        ${row.saleDate}::date,
        ${row.salePrice}::numeric,
        ${row.salePricePerSf}::numeric,
        ${row.buildingClass}::text,
        ${row.locationClass}::text,
        ${row.suiteSizeBucket}::text,
        p.geom,
        'salesforce'::text,
        NULL::numeric,
        now()
      FROM gis_properties p
      WHERE p.property_id = ${row.propertyId}
        AND p.geom IS NOT NULL;
    `);
    inserted += 1;
  }
  return inserted;
}

export async function runSfToGisLoader(options: SfToGisLoaderOptions) {
  const minTotalSf = options.minTotalSf ?? Number(process.env.MIN_TOTAL_SF ?? 40_000);
  const saleLookbackMonths = options.saleLookbackMonths ?? Number(process.env.SALE_LOOKBACK_MONTHS ?? 36);
  const geocodeMinConfidence = options.geocodeMinConfidence ?? Number(process.env.GEOCODE_MIN_CONFIDENCE ?? 0.6);
  const batchSize = options.batchSize ?? Number(process.env.BATCH_SIZE ?? 500);
  const geocoderProvider = options.geocoderProvider ?? (process.env.GEOCODER_PROVIDER as any) ?? "google";
  const testMarket = options.testMarket ?? process.env.TEST_MARKET;

  const auth = await salesforceJwtLogin();
  const records = await fetchAllProperties(auth, salesforcePropertySoql(testMarket));

  const propertyRows: PropertyRow[] = [];
  const saleRows: SaleEvidenceRow[] = [];

  for (const rec of records) {
    const propertyRow = normalizePropertyRow(rec, minTotalSf);
    if (!propertyRow) continue;
    propertyRows.push(propertyRow);

    const saleRow = normalizeSaleRow(rec, propertyRow.avgSuiteSizeBucket, saleLookbackMonths);
    if (saleRow) saleRows.push(saleRow);
  }

  for (let i = 0; i < propertyRows.length; i += batchSize) {
    await upsertProperties(options.db, propertyRows.slice(i, i + batchSize));
  }

  const geocoded = await geocodeMissingGeometry(options.db, geocoderProvider, geocodeMinConfidence);
  const salesEvidenceInserted = await insertSalesEvidence(options.db, saleRows);

  return {
    salesforceRecordsFetched: records.length,
    propertiesUpserted: propertyRows.length,
    propertiesGeocoded: geocoded,
    salesEvidencePrepared: saleRows.length,
    salesEvidenceInserted,
  };
}
