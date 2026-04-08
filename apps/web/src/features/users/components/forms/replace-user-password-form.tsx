import type { UseMutationResult } from "@tanstack/react-query";
import { KeyIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@gis-app/ui/components/input-group";
import { useForm } from "@/lib/form";
import { useReplaceUserPasswordSchema } from "../../schema";

export function ReplaceUserPasswordForm({
  replaceUserPasswordMutate,
  children,
}: {
  replaceUserPasswordMutate: UseMutationResult<any, unknown, any, unknown>;
  children: React.ReactNode;
}) {
  const schema = useReplaceUserPasswordSchema();
  const form = useForm({
    defaultValues: {
      newPassword: "",
    },
    validators: {
      onSubmit: schema,
    },
    onSubmit: ({ value }) => {
      replaceUserPasswordMutate.mutate(value);
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
      <form.Field label="New Password" name="newPassword">
        {(field) => (
          <InputGroup>
            <InputGroupInput
              autoComplete="off"
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder={"enter the new password"}
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
