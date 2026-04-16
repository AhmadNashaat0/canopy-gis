import { db } from "@gis-app/db";
import { gisBasisGrid } from "@gis-app/db/schema/gis";
import { router, publicProcedure } from "../index";
import { and, sql, SQL } from "drizzle-orm";
import { z } from "zod";
import { addBboxWhereClauses, addToWhereClausesIfValid } from "../utils";

const getAllInputSchema = z.object({
  buildingClass: z.string().optional().nullable(),
  market: z.string().optional().nullable(),
  suiteSize: z.string().optional().nullable(),
  minLat: z.number().optional(),
  maxLat: z.number().optional(),
  minLon: z.number().optional(),
  maxLon: z.number().optional(),
});

export const basisRouter = router({
  getAll: publicProcedure.input(getAllInputSchema).query(async ({ input }) => {
    const whereClauses: SQL[] = [];
    addToWhereClausesIfValid(whereClauses, gisBasisGrid.buildingClass, input.buildingClass);
    addToWhereClausesIfValid(whereClauses, gisBasisGrid.market, input.market);
    addToWhereClausesIfValid(whereClauses, gisBasisGrid.suiteSizeBucket, input.suiteSize);
    addBboxWhereClauses(whereClauses, input, {
      lat: gisBasisGrid.cellLat,
      lon: gisBasisGrid.cellLon,
    });

    const items = await db
      .select({
        id: gisBasisGrid.id,
        cellLat: gisBasisGrid.cellLat,
        cellLon: gisBasisGrid.cellLon,
        cellDlat: gisBasisGrid.cellDlat,
        cellDlon: gisBasisGrid.cellDlon,
        renderBasisPsf: sql<number>`ROUND(${gisBasisGrid.renderBasisPsf}, 1)`,
      })
      .from(gisBasisGrid)
      .where(and(...whereClauses));

    const conut = await db.$count(gisBasisGrid, and(...whereClauses));

    return {
      items,
      conut,
    };
  }),
});
