import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { getUsers } from "./get-users";

export const deleteUser = {
  useMutation: ({ id, onSuccess }: { id: string; onSuccess?: () => void }) => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: () => authClient.admin.removeUser({ userId: id }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getUsers.queryKeyFn() });
        toast.success("User deleted successfully");
        onSuccess?.();
      },
    });
  },
};
