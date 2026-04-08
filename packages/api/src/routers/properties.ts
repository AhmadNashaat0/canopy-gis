import { db } from "@gis-app/db";
import { gisProperties } from "@gis-app/db/schema/gis";
import { router, publicProcedure } from "../index";
import { sql } from "drizzle-orm";

export const propertiesRouter = router({
  getAll: publicProcedure.query(async () => {
    return await db
      .select({
        id: gisProperties.propertyId,
        name: gisProperties.propertyName,
        type: gisProperties.propertyType,
        latitude: gisProperties.latitude,
        longitude: gisProperties.longitude,
        yearBuilt: gisProperties.yearBuilt,
        address: gisProperties.addressText,
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
      .limit(1000);
  }),
});
