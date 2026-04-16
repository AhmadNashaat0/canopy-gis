import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import type { UseCreateUserType } from "../schema";
import { getUser } from "./get-user";
import { getUsers } from "./get-users";

export const updateUser = {
  useMutation: ({ id, onSuccess }: { id: string; onSuccess?: () => void }) => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn(body: UseCreateUserType) {
        return authClient.admin.updateUser({
          userId: id,
          data: {
            email: body.email,
            name: `${body.firstName} ${body.lastName}`,
            role: body.role,
            market: body.market,
          },
        });
      },
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: getUsers.queryKeyFn(),
        });
        queryClient.invalidateQueries({
          queryKey: getUser.queryKeyFn({ id }),
        });
        toast.success("User updated successfully");
        onSuccess?.();
      },
    });
  },
};
