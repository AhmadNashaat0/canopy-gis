import { and, eq, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "@gis-app/db";
import { gisProperties, gisSalesEvidence, gisAddressCache } from "@gis-app/db/schema/index";
import { env } from "@gis-app/env/worker";
import type {
  SalesforceAuthResponse,
  GeocodeResult,
  PropertyRow,
  SaleEvidenceRow,
  SalesforceQueryResponse,
  SfPropertyRecord,
  Transaction,
} from "./types";

const minTotalSf = 40000;
const saleLookbackMonths = 36;
const geocodeMinConfidence = 0.6;
const batchSize = 2000;

async function readPrivateKey(): Promise<string> {
  if (!env.SF_PRIVATE_KEY_PATH) throw new Error("Set SF_PRIVATE_KEY or SF_PRIVATE_KEY_PATH");
  const { readFile } = await import("node:fs/promises");
  const key = await readFile(env.SF_PRIVATE_KEY_PATH, "utf8");
  return key.replace(/\\n/g, "\n");
}

function salesforceAddressToString(address: any): string {
  return [
    address.street,
    address.city,
    address.stateCode || address.state,
    address.postalCode,
    address.countryCode || address.country,
  ]
    .filter(Boolean)
    .join(", ");
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
      iss: env.SF_CLIENT_ID,
      sub: env.SF_USERNAME,
      aud: env.SF_AUTH_URL,
      exp: now + 300,
    },
    privateKey,
    { algorithm: "RS256" },
  );

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetch(`${env.SF_AUTH_URL}/services/oauth2/token`, {
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
  if (!response.ok)
    throw new Error(`Salesforce request failed: ${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

async function fetchAllProperties(
  auth: SalesforceAuthResponse,
  soql: string,
): Promise<SfPropertyRecord[]> {
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
  if (!s) return null;
  if (["A", "B", "C"].includes(s)) return s;
  const first = s[0];
  return first && ["A", "B", "C"].includes(first) ? first : s;
}

function suiteBucketFromSf(avgSuiteSf: number | null): string | null {
  if (avgSuiteSf === null) return null;
  if (avgSuiteSf < 25_000) return "small";
  if (avgSuiteSf <= 100_000) return "medium";
  return "large";
}

function monthsAgo(date: Date): number {
  const today = new Date();
  return (
    (today.getUTCFullYear() - date.getUTCFullYear()) * 12 +
    (today.getUTCMonth() - date.getUTCMonth())
  );
}

function parseSfDatetime(value?: string | null): Date | null {
  if (!value) return null;
  const normalized = value.endsWith("Z") ? value : value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
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

function normalizeSaleRow(
  rec: SfPropertyRecord,
  suiteBucket: string | null,
  saleLookbackMonths: number,
): SaleEvidenceRow | null {
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

async function deleteExistingLoaderData(dbConn: Transaction): Promise<void> {
  // Delete child records first in case gisSalesEvidence has a foreign key to gisProperties.
  await dbConn.delete(gisSalesEvidence);
  await dbConn.delete(gisProperties);
}

async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const clean = address.trim();
  if (!clean) return { lat: null, lon: null, confidence: 0, source: "none" };
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", clean);
  url.searchParams.set("key", env.GOOGLE_MAPS_API_KEY);
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Google geocode failed: ${response.status} ${await response.text()}`);
  const data: any = await response.json();
  if (data.status !== "OK" || !data.results?.length)
    return { lat: null, lon: null, confidence: 0, source: "google" };
  const first = data.results[0];
  const loc = first.geometry.location;
  const locType = first.geometry.location_type;
  const confidence = locType === "ROOFTOP" ? 0.9 : locType ? 0.75 : 0.6;
  return { lat: Number(loc.lat), lon: Number(loc.lng), confidence, source: "google" };
}

async function upsertProperties(dbConn: Transaction, rows: PropertyRow[]): Promise<void> {
  if (!rows.length) return;

  const values = rows.map((r) => ({
    propertyId: r.propertyId,
    propertyName: r.propertyName,
    addressText: r.addressText,
    market: r.market,
    submarket: r.submarket,
    totalSf: r.totalSf,
    avgSuiteSf: r.avgSuiteSf,
    avgSuiteSizeBucket: r.avgSuiteSizeBucket,
    siteAcres: r.siteAcres == null ? null : String(r.siteAcres),
    constructionType: r.constructionType,
    yearBuilt: r.yearBuilt,
    buildingClass: r.buildingClass,
    locationClass: r.locationClass,
    propertyType: r.propertyType,
    iosViable: r.iosViable == null ? null : r.iosViable ? "true" : "false",
    coldStorage: r.coldStorage == null ? null : r.coldStorage ? "true" : "false",
    trueOwnerName: r.trueOwnerName,
    legalOwnerName: r.legalOwnerName,
    sfLastModified: r.sfLastModified ? r.sfLastModified.toISOString() : null,
  }));

  await dbConn
    .insert(gisProperties)
    .values(values)
    .onConflictDoUpdate({
      target: [gisProperties.propertyId],
      set: {
        propertyName: sql`excluded.property_name`,
        addressText: sql`excluded.address_text`,
        market: sql`excluded.market`,
        submarket: sql`excluded.submarket`,
        totalSf: sql`excluded.total_sf`,
        avgSuiteSf: sql`excluded.avg_suite_sf`,
        avgSuiteSizeBucket: sql`excluded.avg_suite_size_bucket`,
        siteAcres: sql`excluded.site_acres`,
        constructionType: sql`excluded.construction_type`,
        yearBuilt: sql`excluded.year_built`,
        buildingClass: sql`excluded.building_class`,
        locationClass: sql`excluded.location_class`,
        propertyType: sql`excluded.property_type`,
        iosViable: sql`excluded.ios_viable`,
        coldStorage: sql`excluded.cold_storage`,
        trueOwnerName: sql`excluded.true_owner_name`,
        legalOwnerName: sql`excluded.legal_owner_name`,
        sfLastModified: sql`excluded.sf_last_modified`,
        gisLastSynced: sql`now()`,
      },
    });
}

async function geocodeMissingGeometry(
  dbConn: Transaction,
  minConfidence: number,
  logger: any,
): Promise<number> {
  const targets = await dbConn
    .select({ propertyId: gisProperties.propertyId, addressText: gisProperties.addressText })
    .from(gisProperties)
    .where(
      and(
        isNull(gisProperties.geom),
        isNotNull(gisProperties.addressText),
        ne(gisProperties.addressText, ""),
      ),
    );

  logger(`Geocoding ${targets.length} missing geometry addresses`);

  let updated = 0;
  let counter = 0;
  for (const target of targets) {
    counter += 1;
    const address = (target.addressText ?? "").trim();
    if (!address) {
      logger(`Geocoding - ${counter} / ${targets.length}: skipped`);
      continue;
    }

    let geo: GeocodeResult;
    const [cached] = await dbConn
      .select()
      .from(gisAddressCache)
      .where(eq(gisAddressCache.address, address))
      .limit(1);

    if (cached) {
      geo = {
        lat: cached.latitude,
        lon: cached.longitude,
        confidence: Number(cached.confidence),
        source: cached.source ?? "cache",
      };
    } else {
      geo = await geocodeAddress(address);
      if (geo.lat !== null && geo.lon !== null) {
        await dbConn
          .insert(gisAddressCache)
          .values({
            address,
            latitude: geo.lat,
            longitude: geo.lon,
            confidence: String(geo.confidence),
            source: geo.source,
          })
          .onConflictDoNothing();
      }
    }

    const status =
      geo.lat === null || geo.lon === null
        ? "failed"
        : geo.confidence < minConfidence
          ? "low_confidence"
          : "ok";
    logger(
      `Geocoding - ${counter} / ${targets.length}: ${status} - ${geo.lat} - ${geo.lon} - ${address}${cached ? " (cached)" : ""}`,
    );
    if (geo.lat !== null && geo.lon !== null) {
      await dbConn
        .update(gisProperties)
        .set({
          latitude: geo.lat,
          longitude: geo.lon,
          geom: sql`ST_SetSRID(ST_MakePoint(${geo.lon}, ${geo.lat}), 4326)`,
          geocodeConfidence: String(geo.confidence),
          geocodeSource: geo.source,
          geocodeStatus: status,
          gisLastSynced: sql`now()`,
        })
        .where(eq(gisProperties.propertyId, target.propertyId));
      updated += 1;
    } else {
      await dbConn
        .update(gisProperties)
        .set({
          geocodeConfidence: String(geo.confidence),
          geocodeSource: geo.source,
          geocodeStatus: status,
          gisLastSynced: sql`now()`,
        })
        .where(eq(gisProperties.propertyId, target.propertyId));
    }
  }

  return updated;
}

async function insertSalesEvidence(dbConn: Transaction, rows: SaleEvidenceRow[]): Promise<number> {
  const propertyIds = Array.from(new Set(rows.map((r) => r.propertyId)));
  if (!propertyIds.length) return 0;

  const props = await dbConn
    .select({
      propertyId: gisProperties.propertyId,
      latitude: gisProperties.latitude,
      longitude: gisProperties.longitude,
    })
    .from(gisProperties)
    .where(
      and(
        inArray(gisProperties.propertyId, propertyIds),
        isNotNull(gisProperties.latitude),
        isNotNull(gisProperties.longitude),
      ),
    );

  const pointByPropertyId = new Map<string, [number, number]>();
  for (const p of props)
    pointByPropertyId.set(p.propertyId, [p.longitude as number, p.latitude as number]);

  const values = rows
    .map((r) => ({
      propertyId: r.propertyId,
      saleDate: r.saleDate,
      salePrice: r.salePrice == null ? null : String(r.salePrice),
      salePricePerSf: String(r.salePricePerSf),
      buildingClass: r.buildingClass,
      locationClass: r.locationClass,
      suiteSizeBucket: r.suiteSizeBucket,
      geom: pointByPropertyId.get(r.propertyId) ?? null,
      dataSource: "salesforce",
      confidenceScore: null,
    }))
    .filter((v) => v.geom != null);

  if (!values.length) return 0;

  await dbConn.insert(gisSalesEvidence).values(values).onConflictDoNothing();
  return values.length;
}

export async function runSfToGisLoader({ logger = console.log }: { logger?: any }) {
  logger("Starting sync from Salesforce to GIS DB...");

  logger("Authenticating with Salesforce...");
  const auth = await salesforceJwtLogin();

  logger("Fetching all properties from Salesforce...");
  const records = await fetchAllProperties(auth, salesforcePropertySoql());

  logger(`Fetched ${records.length} properties from Salesforce`);

  const propertyRows: PropertyRow[] = [];
  const saleRows: SaleEvidenceRow[] = [];

  logger("Normalizing properties and sales...");
  for (const rec of records) {
    rec.Property_Address__c = salesforceAddressToString(rec.Property_Address__c);
    const propertyRow = normalizePropertyRow(rec, minTotalSf);
    if (!propertyRow) continue;
    propertyRows.push(propertyRow);

    const saleRow = normalizeSaleRow(rec, propertyRow.avgSuiteSizeBucket, saleLookbackMonths);
    if (saleRow) saleRows.push(saleRow);
  }
  logger(`Normalized ${propertyRows.length} properties and ${saleRows.length} sales`);

  await db.transaction(async (tx) => {
    logger("Deleting existing loader data...");
    await deleteExistingLoaderData(tx);

    logger("Inserting properties...");
    for (let i = 0; i < propertyRows.length; i += batchSize) {
      const end = Math.min(i + batchSize, propertyRows.length);
      logger(`Inserting properties: ${i + 1}-${end} of ${propertyRows.length}`);
      await upsertProperties(tx, propertyRows.slice(i, i + batchSize));
    }
    logger("Geocoding missing geometry...");
    await geocodeMissingGeometry(tx, geocodeMinConfidence, logger);
    logger("Inserting sales...");
    await insertSalesEvidence(tx, saleRows);
  });
}
