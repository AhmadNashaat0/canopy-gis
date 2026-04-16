import { useQuery, type UseMutationResult } from "@tanstack/react-query";
import { KeyIcon, MailIcon } from "lucide-react";
import { Activity } from "react";
import { Button } from "@gis-app/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@gis-app/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@gis-app/ui/components/select";
import { Spinner } from "@gis-app/ui/components/spinner";
import { type Roles, rolesList } from "@/features/users/utils";
import { useForm } from "@/lib/form";
import type { GetUser } from "../../actions/get-user";
import { type UseCreateUserType, useCreateUserSchema } from "../../schema";
import { BasicCombobox } from "@/components/basic-combobox";
import { trpc } from "@/lib/trpc";

export function UserForm({
  closeFn,
  userDefaultValues,
  userMutate,
}: {
  closeFn: () => void;
  userDefaultValues?: GetUser;
  // biome-ignore lint/suspicious/noExplicitAny: mutate is used in the form
  userMutate: UseMutationResult<any, unknown, any, unknown>;
}) {
  const schema = useCreateUserSchema({
    isPasswordOptional: Boolean(userDefaultValues),
  });
  const { data: filters } = useQuery(
    trpc.properties.getPropertiesFilters.queryOptions(undefined, {
      trpc: { abortOnUnmount: true },
    }),
  );
  const form = useForm({
    defaultValues: {
      firstName: userDefaultValues?.name?.split(" ")?.[0] || "",
      lastName: userDefaultValues?.name?.split(" ")?.[1] || "",
      email: userDefaultValues?.email ?? "",
      password: "",
      role: userDefaultValues?.role ?? rolesList[0],
      market: userDefaultValues?.market ?? "",
    } as UseCreateUserType,
    validators: {
      onSubmit: schema,
    },
    onSubmit: ({ value }) => {
      userMutate.mutate(value);
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
      <div className="flex flex-col gap-4 md:flex-row">
        <form.Field label="First Name" name="firstName">
          {(field) => (
            <InputGroup>
              <InputGroupInput
                autoComplete="off"
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="enter first name"
                value={field.state.value}
              />
            </InputGroup>
          )}
        </form.Field>
        <form.Field label="Last Name" name="lastName">
          {(field) => (
            <InputGroup>
              <InputGroupInput
                autoComplete="off"
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="enter last name"
                value={field.state.value}
              />
            </InputGroup>
          )}
        </form.Field>
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <form.Field label="Role" name="role">
          {(field) => (
            <Select
              onValueChange={(value) => field.handleChange(value as Roles)}
              value={field.state.value}
            >
              <SelectTrigger id={field.name}>
                <SelectValue placeholder="select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Roles</SelectLabel>
                  {rolesList.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </form.Field>
        <form.Field label="Market" name="market">
          {(field) => (
            <BasicCombobox
              name={field.name}
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v as string)}
              items={filters?.marketList}
              className="h-9"
            />
          )}
        </form.Field>
      </div>
      <form.Field label="Email" name="email">
        {(field) => (
          <InputGroup>
            <InputGroupInput
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="enter email"
              value={field.state.value}
            />
            <InputGroupAddon>
              <MailIcon />
            </InputGroupAddon>
          </InputGroup>
        )}
      </form.Field>
      <Activity mode={userDefaultValues ? "hidden" : "visible"}>
        <form.Field label="Password" name="password">
          {(field) => (
            <InputGroup>
              <InputGroupInput
                autoComplete="off"
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="enter password"
                type="password"
                value={field.state.value}
              />
              <InputGroupAddon>
                <KeyIcon />
              </InputGroupAddon>
            </InputGroup>
          )}
        </form.Field>
      </Activity>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button onClick={closeFn} type="button" variant={"outline"}>
          Cancel
        </Button>
        <Button disabled={userMutate.isPending} type="submit">
          Save {userMutate.isPending && <Spinner />}
        </Button>
      </div>
    </form>
  );
}
