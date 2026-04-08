import { useNavigate, useSearch } from "@tanstack/react-router";
import { KeyIcon, MailIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@gis-app/ui/components/button";
import { FieldGroup } from "@gis-app/ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@gis-app/ui/components/input-group";
import { Spinner } from "@gis-app/ui/components/spinner";
import { useLoginShcema } from "@/features/users/schema";
import { authClient } from "@/lib/auth-client";
import { useForm } from "@/lib/form";

export function LoginForm() {
  const navigate = useNavigate();
  const loginSchema = useLoginShcema();
  const searchParams = useSearch({ strict: false }) as {
    redirectTo: string | undefined;
  };

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            toast.success("🎉 Login successful", {
              icon: "🎉",
              position: "bottom-right",
            });
            navigate({
              to: searchParams.redirectTo ?? "/",
              replace: true,
            });
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
  });

  return (
    <form
      id="login-form"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup className="relative flex flex-col gap-4">
        <div className="flex flex-col items-center gap-1">
          <h3 className="font-bold text-2xl">Welcome back 👋</h3>
          <p className="text-balance text-muted-foreground text-sm">
            Enter your information below to log in
          </p>
        </div>
        <form.Field label="Email" name="email">
          {(field) => (
            <InputGroup>
              <InputGroupInput
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={"enter your email"}
                value={field.state.value}
              />
              <InputGroupAddon>
                <MailIcon />
              </InputGroupAddon>
            </InputGroup>
          )}
        </form.Field>
        <form.Field label="Password" name="password">
          {(field) => (
            <InputGroup>
              <InputGroupInput
                autoComplete="off"
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={"enter your password"}
                type="password"
                value={field.state.value}
              />
              <InputGroupAddon>
                <KeyIcon />
              </InputGroupAddon>
            </InputGroup>
          )}
        </form.Field>
        <form.Subscribe>
          {(state) => (
            <Button
              className="mt-3 capitalize"
              disabled={state.isSubmitting}
              form="login-form"
              type="submit"
            >
              login
              {state.isSubmitting && <Spinner />}
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  );
}
