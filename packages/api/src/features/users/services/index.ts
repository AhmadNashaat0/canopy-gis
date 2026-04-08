import { db } from "@gis-app/db/index";
import { user } from "@gis-app/db/schema/auth";
import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";

export const getUsers = async () => {
  const items = await db
    .select()
    .from(user)
    .where(inArray(user.role, ["user", "admin"]));

  const count = await db.$count(user, inArray(user.role, ["user", "admin"]));

  return { items, count };
};

export const getUserById = async ({ id }: { id: string }) => {
  const userData = await db.select().from(user).where(eq(user.id, id));
  if (userData.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }
  return userData[0];
};
