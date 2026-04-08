import { db } from "@gis-app/db";
import { gisProperties } from "@gis-app/db/schema/gis";
import { router, publicProcedure } from "../index";
import { and, eq, gte, lte, SQL, sql } from "drizzle-orm";
import { z } from "zod";

const getAllInputSchema = z.object({
  page: z.number().optional().default(1),
  size: z.number().optional().default(1000),
  yearBuiltStart: z.number().optional(),
  yearBuiltEnd: z.number().optional(),
  buildingClass: z.string().optional(),
  locationClass: z.string().optional(),
  propertyType: z.string().optional(),
  market: z.string().optional(),
  submarket: z.string().optional(),
});

export const propertiesRouter = router({
  getPropertiesFilters: publicProcedure.query(async () => {
    const filters = await db
      .select({
        buildingClassList: sql<string[]>`array_agg(distinct building_class)`,
        locationClassList: sql<string[]>`array_agg(distinct location_class)`,
        propertyTypeList: sql<string[]>`array_agg(distinct property_type)`,
        marketList: sql<string[]>`array_agg(distinct market)`,
        submarketList: sql<string[]>`array_agg(distinct submarket)`,
      })
      .from(gisProperties);

    return {
      buildingClassList: filters[0]?.buildingClassList,
      locationClassList: filters[0]?.locationClassList,
      propertyTypeList: filters[0]?.propertyTypeList,
      marketList: filters[0]?.marketList,
      submarketList: filters[0]?.submarketList,
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

    if (input.market) {
      whereClauses.push(eq(gisProperties.market, input.market));
    }

    if (input.buildingClass) {
      whereClauses.push(eq(gisProperties.buildingClass, input.buildingClass));
    }

    if (input.locationClass) {
      whereClauses.push(eq(gisProperties.locationClass, input.locationClass));
    }

    if (input.propertyType) {
      whereClauses.push(eq(gisProperties.propertyType, input.propertyType));
    }

    const items = await db
      .select({
        id: gisProperties.propertyId,
        name: gisProperties.propertyName,
        type: gisProperties.propertyType,
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
    const totals = await db.$count(gisProperties, ...whereClauses);
    return {
      items,
      totals,
      page: input.page,
      pageSize: input.size,
      totalPages: Math.ceil(totals / input.size),
    };
  }),
});
