import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export const replaceUserPassword = {
  useMutation: ({ id, onSuccess }: { id: string; onSuccess?: () => void }) => {
    return useMutation({
      mutationFn: async ({ newPassword }: { newPassword: string }) => {
        const { error } = await authClient.admin.setUserPassword({ newPassword, userId: id });
        if (error) {
          toast.error(error.message);
          throw error;
        }
      },
      onSuccess: () => {
        toast.success("User password updated successfully");
        onSuccess?.();
      },
    });
  },
};
