import { usersRouter } from "../features/users/route";
import { protectedProcedure, publicProcedure, router } from "../index";
import { propertiesRouter } from "./properties";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  properties: propertiesRouter,
  users: usersRouter,
});
export type AppRouter = typeof appRouter;
