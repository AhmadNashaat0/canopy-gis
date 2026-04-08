import { useQuery } from "@tanstack/react-query";
import { type RouterOutput, trpc } from "@/lib/trpc";

export const getUsers = {
  queryKeyFn: trpc.users.getUsers.queryKey,
  useQuery: () => useQuery(trpc.users.getUsers.queryOptions()),
};

export type GetUsers = RouterOutput["users"]["getUsers"];
