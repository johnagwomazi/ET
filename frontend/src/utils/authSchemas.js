import { z } from "zod";

const emailSchema = z.string().trim().min(1, "Email is required").email("Please enter a valid email");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters long");

export const customerRegisterSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const organizerRegisterSchema = z
  .object({
    organizationName: z.string().trim().min(1, "Organization name is required"),
    adminFirstName: z.string().trim().min(1, "Admin first name is required"),
    adminLastName: z.string().trim().min(1, "Admin last name is required"),
    businessEmail: emailSchema,
    businessPhone: z.string().trim().min(1, "Business phone is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "Reset token is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, "Verification token is required"),
});
