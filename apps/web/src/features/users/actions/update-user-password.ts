import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export const updateUserPassword = {
  useMutation: ({ onSuccess }: { onSuccess?: () => void }) => {
    return useMutation({
      mutationFn: async ({
        currentPassword,
        newPassword,
      }: {
        currentPassword: string;
        newPassword: string;
      }) => {
        const { error } = await authClient.changePassword({
          currentPassword,
          newPassword,
        });
        if (error) {
          toast.error(error.message);
          throw error;
        }
      },
      onSuccess: () => {
        toast.success("Your password updated successfully");
        onSuccess?.();
      },
    });
  },
};
