import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export const replaceUserPassword = {
  useMutation: ({ id, onSuccess }: { id: string; onSuccess?: () => void }) => {
    return useMutation({
      mutationFn: ({ newPassword }: { newPassword: string }) =>
        authClient.admin.setUserPassword({ newPassword, userId: id }),
      onSuccess: () => {
        toast.success("User password updated successfully");
        onSuccess?.();
      },
    });
  },
};
