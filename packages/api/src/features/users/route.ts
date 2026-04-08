import { publicProcedure, router } from "../..";
import { idSchema } from "../../validators";
import { getUserById, getUsers } from "./services/index";

export const usersRouter = router({
  getUsers: publicProcedure.query(async () => {
    return await getUsers();
  }),
  getUserById: publicProcedure.input(idSchema).query(async ({ input }) => {
    return await getUserById(input);
  }),
});
