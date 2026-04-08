import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export const updateUserPassword = {
  useMutation: ({ onSuccess }: { onSuccess?: () => void }) => {
    return useMutation({
      mutationFn: ({
        currentPassword,
        newPassword,
      }: {
        currentPassword: string;
        newPassword: string;
      }) =>
        authClient.changePassword({
          currentPassword,
          newPassword,
        }),
      onSuccess: () => {
        toast.success("Your password updated successfully");
        onSuccess?.();
      },
    });
  },
};
