import { type DefaultOptions, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const queryConfig = {
  queries: {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 0,
    staleTime: 2 * 60 * 60 * 1000, // 2 hours
  },
} satisfies DefaultOptions;

export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
  queryCache: new QueryCache({
    onError: (error) => {
      console.log(error);
      toast.error(error.message);
    },
  }),
});
