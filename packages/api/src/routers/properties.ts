import { db } from "@gis-app/db";
import { gisProperties } from "@gis-app/db/schema/gis";
import { router, publicProcedure } from "../index";
import { and, eq, gte, isNull, lte, SQL, sql } from "drizzle-orm";
import { z } from "zod";

const getAllInputSchema = z.object({
  page: z.number().optional().default(1),
  size: z.number().optional().default(1000),
  yearBuiltStart: z.number().optional(),
  yearBuiltEnd: z.number().optional(),
  buildingClass: z.string().optional().nullable(),
  locationClass: z.string().optional().nullable(),
  propertyType: z.string().optional().nullable(),
  market: z.string().optional().nullable(),
  submarket: z.string().optional().nullable(),
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

    if (input.market && input.market != "") {
      whereClauses.push(eq(gisProperties.market, input.market));
    } else if (input.market === null) {
      whereClauses.push(isNull(gisProperties.market));
    }

    if (input.buildingClass && input.buildingClass != "") {
      whereClauses.push(eq(gisProperties.buildingClass, input.buildingClass));
    } else if (input.buildingClass === null) {
      whereClauses.push(isNull(gisProperties.buildingClass));
    }

    if (input.locationClass && input.locationClass != "") {
      whereClauses.push(eq(gisProperties.locationClass, input.locationClass));
    } else if (input.locationClass === null) {
      whereClauses.push(isNull(gisProperties.locationClass));
    }

    if (input.propertyType && input.propertyType != "") {
      whereClauses.push(eq(gisProperties.propertyType, input.propertyType));
    } else if (input.propertyType === null) {
      whereClauses.push(isNull(gisProperties.propertyType));
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
    const totals = await db.$count(gisProperties, and(...whereClauses));
    return {
      items,
      totals,
      page: input.page,
      pageSize: input.size,
      totalPages: Math.ceil(totals / input.size),
    };
  }),
});
