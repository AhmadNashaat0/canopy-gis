import { and, gte, eq, lte, isNull, SQL, or } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

export function eqFn({ column, value }: { column: PgColumn; value: any }): SQL | undefined {
  if (value && value != "") {
    return eq(column, value);
  } else if (value === null) {
    return isNull(column);
  }
}

export function addToWhereClausesIfValid(whereClauses: SQL[], column: PgColumn, value: any) {
  const sql = eqFn({ column, value });
  if (sql) {
    whereClauses.push(sql);
  }
}

export function addBboxWhereClauses(
  whereClauses: SQL[],
  bbox: { minLat?: number; maxLat?: number; minLon?: number; maxLon?: number },
  pointColumn: { lat: PgColumn; lon: PgColumn },
) {
  const { minLat, maxLat, minLon, maxLon } = bbox;
  const hasLat = Number.isFinite(minLat) && Number.isFinite(maxLat);
  const hasLon = Number.isFinite(minLon) && Number.isFinite(maxLon);

  // Expand the viewport bbox slightly so edge cells don't get missed due to
  // rounding (the frontend rounds map bounds to 2 decimals) or map projection quirks.
  const PADDING_DEG = 0.01;
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  // Latitude is always a simple numeric range once ordered (negative values are fine).
  if (hasLat) {
    const lo = Math.min(minLat as number, maxLat as number);
    const hi = Math.max(minLat as number, maxLat as number);
    const latLo = clamp(lo - PADDING_DEG, -90, 90);
    const latHi = clamp(hi + PADDING_DEG, -90, 90);
    const latClause = and(gte(pointColumn.lat, latLo), lte(pointColumn.lat, latHi));
    if (latClause) whereClauses.push(latClause);
  }

  // Longitude can be either a normal numeric range OR a dateline-wrapping window.
  // Example wrap: minLon=170, maxLon=-170 means (lon >= 170 OR lon <= -170).
  if (hasLon) {
    const lo = minLon as number;
    const hi = maxLon as number;
    const lonLo = clamp(lo - PADDING_DEG, -180, 180);
    const lonHi = clamp(hi + PADDING_DEG, -180, 180);
    const lonClause =
      lo <= hi
        ? and(gte(pointColumn.lon, lonLo), lte(pointColumn.lon, lonHi))
        : or(gte(pointColumn.lon, lonLo), lte(pointColumn.lon, lonHi));
    if (lonClause) whereClauses.push(lonClause);
  }
}
