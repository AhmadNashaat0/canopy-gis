import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import type { UseCreateUserType } from "../schema";
import { getUsers } from "./get-users";

export const createUser = {
  useMutation: ({ onSuccess }: { onSuccess?: () => void }) => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn(body: UseCreateUserType) {
        return authClient.admin.createUser({
          email: body.email,
          name: `${body.firstName} ${body.lastName}`,
          password: body.password ?? "",
          role: body.role,
          data: {
            market: body.market,
          },
        });
      },
      onSuccess() {
        queryClient.invalidateQueries({ queryKey: getUsers.queryKeyFn() });
        toast.success("User created successfully");
        onSuccess?.();
      },
    });
  },
};
