import { db } from "@gis-app/db";
import { gisProperties } from "@gis-app/db/schema/gis";
import { router, publicProcedure } from "../index";
import { and, gte, lte, SQL, sql } from "drizzle-orm";
import { z } from "zod";
import { addBboxWhereClauses, addToWhereClausesIfValid } from "../utils";

const getAllInputSchema = z.object({
  page: z.number().optional().default(1),
  size: z.number().optional().default(2000),
  yearBuiltStart: z.number().optional(),
  yearBuiltEnd: z.number().optional(),
  buildingClass: z.string().optional().nullable(),
  locationClass: z.string().optional().nullable(),
  suiteSize: z.string().optional().nullable(),
  market: z.string().optional().nullable(),
  minLat: z.number().optional(),
  maxLat: z.number().optional(),
  minLon: z.number().optional(),
  maxLon: z.number().optional(),
});

export const propertiesRouter = router({
  getPropertiesFilters: publicProcedure.query(async () => {
    const filters = await db
      .select({
        buildingClassList: sql<string[]>`array_agg(distinct building_class)`,
        locationClassList: sql<string[]>`array_agg(distinct location_class)`,
        suiteSize: sql<string[]>`array_agg(distinct avg_suite_size_bucket)`,
        marketList: sql<string[]>`array_agg(distinct market)`,
      })
      .from(gisProperties);

    return {
      buildingClassList: filters[0]?.buildingClassList,
      locationClassList: filters[0]?.locationClassList,
      suiteSize: filters[0]?.suiteSize,
      marketList: filters[0]?.marketList,
    };
  }),

  getAll: publicProcedure.input(getAllInputSchema).query(async ({ input }) => {
    const whereClauses: SQL[] = [];

    if (input.yearBuiltStart) {
      whereClauses.push(gte(gisProperties.yearBuilt, input.yearBuiltStart));
    }

    if (input.yearBuiltEnd) {
      whereClauses.push(lte(gisProperties.yearBuilt, input.yearBuiltEnd));
    }

    addToWhereClausesIfValid(whereClauses, gisProperties.market, input.market);
    addToWhereClausesIfValid(whereClauses, gisProperties.buildingClass, input.buildingClass);
    addToWhereClausesIfValid(whereClauses, gisProperties.locationClass, input.locationClass);
    addToWhereClausesIfValid(whereClauses, gisProperties.avgSuiteSizeBucket, input.suiteSize);
    addBboxWhereClauses(whereClauses, input, {
      lat: gisProperties.latitude,
      lon: gisProperties.longitude,
    });

    const items = await db
      .select({
        id: gisProperties.propertyId,
        name: gisProperties.propertyName,
        latitude: gisProperties.latitude,
        longitude: gisProperties.longitude,
        yearBuilt: gisProperties.yearBuilt,
        areaInSqFt: gisProperties.totalSf,
        lastPrice: sql<string | null>`latest_sale.sale_price`,
        lastPriceDate: sql<string | null>`latest_sale.sale_date`,
      })
      .from(gisProperties)
      .leftJoin(
        sql`LATERAL (
          SELECT sale_price, sale_date
          FROM gis_sales_evidence
          WHERE property_id = ${gisProperties.propertyId}
          ORDER BY sale_date DESC
          LIMIT 1
        ) AS latest_sale`,
        sql`true`,
      )
      .where(and(...whereClauses))
      .limit(input.size)
      .offset((input.page - 1) * input.size);

    const totalsWhereClauses: SQL[] = [];
    addToWhereClausesIfValid(totalsWhereClauses, gisProperties.market, input.market);
    addToWhereClausesIfValid(totalsWhereClauses, gisProperties.buildingClass, input.buildingClass);
    addToWhereClausesIfValid(totalsWhereClauses, gisProperties.avgSuiteSizeBucket, input.suiteSize);
    const totals = await db.$count(gisProperties, and(...totalsWhereClauses));
    return {
      items,
      totals,
      page: input.page,
      pageSize: input.size,
      totalPages: Math.ceil(totals / input.size),
    };
  }),
});
