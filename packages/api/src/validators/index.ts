import z from "zod";

export const idSchema = z.object({ id: z.string().min(1, "id is required") });

export const getAllSchema = z.object({
  PageNumber: z.number().optional().default(1),
  pageSize: z.number().optional().default(10),
  sorting: z.object({ sortBy: z.string().optional() }).optional(),
});
