import { useQuery } from "@tanstack/react-query";
import { type RouterInput, type RouterOutput, trpc } from "@/lib/trpc";

export type GetUser = RouterOutput["users"]["getUserById"];
type GetUserProps = RouterInput["users"]["getUserById"];
const queryKeyFn = trpc.users.getUserById.queryKey;

export const getUser = {
  queryKeyFn: ((props) => queryKeyFn(props)) as typeof queryKeyFn,
  useQuery: (props: GetUserProps, options?: { enabled?: boolean }) =>
    useQuery(trpc.users.getUserById.queryOptions(props, options)),
};
