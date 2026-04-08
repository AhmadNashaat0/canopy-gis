import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { getUsers } from "./get-users";

export const updateUserActivation = {
  useMutation: ({ id, onSuccess }: { id: string; onSuccess?: () => void }) => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ status }: { status: "active" | "inactive" }) =>
        authClient.admin.updateUser({
          userId: id,
          data: {
            isActive: status === "active",
          },
        }),
      onSuccess: () => {
        toast.success("User activation status updated successfully");
        queryClient.invalidateQueries({ queryKey: getUsers.queryKeyFn() });
        onSuccess?.();
      },
    });
  },
};
