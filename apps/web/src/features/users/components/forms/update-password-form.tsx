import type { UseMutationResult } from "@tanstack/react-query";
import { KeyIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@gis-app/ui/components/input-group";
import { useForm } from "@/lib/form";
import { useUpdatePasswordSchema } from "../../schema";

export function UpdatePasswordForm({
  updatePasswordMutate,
  children,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: mutate is used in the form
  updatePasswordMutate: UseMutationResult<any, unknown, any, unknown>;
  children: React.ReactNode;
}) {
  const schema = useUpdatePasswordSchema();
  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
    validators: {
      onSubmit: schema,
    },
    onSubmit: ({ value }) => {
      updatePasswordMutate.mutate(value);
    },
  });

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field label="Current Password" name="currentPassword">
        {(field) => (
          <InputGroup>
            <InputGroupInput
              autoComplete="off"
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="enter your current password"
              type="password"
              value={field.state.value}
            />
            <InputGroupAddon>
              <KeyIcon />
            </InputGroupAddon>
          </InputGroup>
        )}
      </form.Field>
      <form.Field label="New Password" name="newPassword">
        {(field) => (
          <InputGroup>
            <InputGroupInput
              autoComplete="off"
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="enter your new password"
              type="password"
              value={field.state.value}
            />
            <InputGroupAddon>
              <KeyIcon />
            </InputGroupAddon>
          </InputGroup>
        )}
      </form.Field>
      {children}
    </form>
  );
}
