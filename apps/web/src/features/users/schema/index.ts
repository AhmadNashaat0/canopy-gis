import { z } from "zod";
import { rolesList } from "../utils";

const oneWordRegex = /\s+/;

export function useLoginShcema() {
  return z.object({
    email: z.email({ error: "invalid email" }).transform((email) => email.toLowerCase()),
    password: z.string().min(8, "password must be at least 8 characters"),
  });
}

export function useCreateUserSchema({ isPasswordOptional }: { isPasswordOptional: boolean }) {
  const schema = z.object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters")
      .max(55, "First name must be at most 55 characters")
      .refine((val) => val.split(oneWordRegex).length === 1, {
        message: "must contain only one word",
      }),
    lastName: z
      .string()
      .trim()
      .min(2, "Last name must be at least 2 characters")
      .max(55, "Last name must be at most 55 characters")
      .refine((val) => val.split(oneWordRegex).length === 1, {
        message: "must contain only one word",
      }),
    email: z.email({ error: "invalid email" }).transform((email) => email.toLowerCase()),
    password: z.string().optional(),
    role: z.enum(rolesList),
  });

  if (isPasswordOptional) {
    return schema;
  }

  return schema.extend({
    password: z.string().min(8, "Password must be at least 8 characters"),
  });
}

export function useReplaceUserPasswordSchema() {
  return z.object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
  });
}

export function useUpdatePasswordSchema() {
  return z.object({
    currentPassword: z.string().min(8, "Password must be at least 8 characters"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
  });
}

// types
export type LoginCredentials = z.infer<ReturnType<typeof useLoginShcema>>;
export type UseCreateUserType = z.infer<ReturnType<typeof useCreateUserSchema>>;
