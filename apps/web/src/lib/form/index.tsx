import {
  type DeepKeys,
  type FormOptions,
  type FormValidateOrFn,
  useForm as useTanStackForm,
} from "@tanstack/react-form";
import { Plus } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { Button } from "@gis-app/ui/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@gis-app/ui/components/field";
import type { ReactFormExtendedApi } from "./types";

interface ExtendedFieldProps<TFormData, TName extends DeepKeys<TFormData>> {
  name: TName;
  label?: string;
  description?: string;
  helperText?: string;
  isRequired?: boolean;
  className?: string;
  // biome-ignore lint/suspicious/noExplicitAny: false
  arrayDefaultValue?: any;
  children: (
    // biome-ignore lint/suspicious/noExplicitAny: false
    field: any,
  ) => ReactNode;
}

// biome-ignore lint/suspicious/noExplicitAny: false
function createFormField<TFormData>(OriginalField: any) {
  return function FormField<TName extends DeepKeys<TFormData>>({
    name,
    label,
    description,
    helperText,
    isRequired = true,
    arrayDefaultValue,
    className,
    children,
    ...args
  }: ExtendedFieldProps<TFormData, TName>) {
    return (
      <OriginalField
        {...args}
        // biome-ignore lint/correctness/noChildrenProp lint/suspicious/noExplicitAny: false
        children={(field: any) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field className={className}>
              {label && (
                <FieldLabel className="capitalize" htmlFor={name}>
                  {label} {isRequired && <span className="text-destructive">*</span>}
                  {description && <FieldDescription>{description}</FieldDescription>}
                  {(args as { mode: string }).mode === "array" && (
                    <Button
                      className="ms-auto"
                      onClick={() => field.pushValue(arrayDefaultValue)}
                      size={"icon-sm"}
                      type="button"
                      variant={"outline"}
                    >
                      <Plus />
                    </Button>
                  )}
                </FieldLabel>
              )}
              {children(field)}
              {helperText && <FieldDescription>{helperText}</FieldDescription>}
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
        name={name}
      />
    );
  };
}

export function useForm<
  TFormData,
  TOnMount extends FormValidateOrFn<TFormData>,
  TOnChange extends FormValidateOrFn<TFormData>,
  TOnChangeAsync extends FormValidateOrFn<TFormData>,
  TOnBlur extends FormValidateOrFn<TFormData>,
  TOnBlurAsync extends FormValidateOrFn<TFormData>,
  TOnSubmit extends FormValidateOrFn<TFormData>,
  TOnSubmitAsync extends FormValidateOrFn<TFormData>,
  TOnDynamic extends FormValidateOrFn<TFormData>,
  TOnDynamicAsync extends FormValidateOrFn<TFormData>,
  TOnServer extends FormValidateOrFn<TFormData>,
  TSubmitMeta,
>(
  options: FormOptions<
    TFormData,
    TOnMount,
    TOnChange,
    TOnChangeAsync,
    TOnBlur,
    TOnBlurAsync,
    TOnSubmit,
    TOnSubmitAsync,
    TOnDynamic,
    TOnDynamicAsync,
    TOnServer,
    TSubmitMeta
  >,
): ReactFormExtendedApi<
  TFormData,
  TOnMount,
  TOnChange,
  TOnChangeAsync,
  TOnBlur,
  TOnBlurAsync,
  TOnSubmit,
  TOnSubmitAsync,
  TOnDynamic,
  TOnDynamicAsync,
  TOnServer,
  TSubmitMeta
> {
  const form = useTanStackForm(options);
  // biome-ignore lint/correctness/useExhaustiveDependencies: false
  const EnhancedField = useMemo(() => createFormField(form.Field), []);
  return { ...form, Field: EnhancedField } as ReactFormExtendedApi<
    TFormData,
    TOnMount,
    TOnChange,
    TOnChangeAsync,
    TOnBlur,
    TOnBlurAsync,
    TOnSubmit,
    TOnSubmitAsync,
    TOnDynamic,
    TOnDynamicAsync,
    TOnServer,
    TSubmitMeta
  >;
}
