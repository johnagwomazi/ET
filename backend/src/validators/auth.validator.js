import { z } from "zod";
import { PASSWORD_POLICY } from "../constants/auth.constants.js";
import { USER_ROLES } from "../constants/roles.constants.js";

const emailSchema = z.string().trim().min(1, "Email is required").email("Please provide a valid email");
const passwordSchema = z.string().min(PASSWORD_POLICY.MIN_LENGTH, "Password must be at least 8 characters long");

export const customerRegisterSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    phone: z.string().trim().min(5, "Phone number is required").max(30, "Phone number must be 30 characters or less"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
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
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const adminLoginSchema = loginSchema;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit verification code"),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const updateVerificationEmailSchema = z.object({
  verificationTicket: z.string().min(1, "Verification session is required"),
  email: emailSchema,
});

export const googleAuthenticationSchema = z.object({
  credential: z.string().min(1, "Google credential is required"),
  accountType: z.enum([USER_ROLES.CUSTOMER, USER_ROLES.ADMIN]).optional(),
});

export const googleRegistrationSchema = z
  .object({
    completionToken: z.string().min(1, "Google registration session is required"),
    accountType: z.enum([USER_ROLES.CUSTOMER, USER_ROLES.ADMIN]),
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    phone: z.string().trim().min(5, "Phone number is required").max(30, "Phone number must be 30 characters or less"),
    organizationName: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    if (value.accountType === USER_ROLES.ADMIN && !value.organizationName) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Organization name is required",
        path: ["organizationName"],
      });
    }
  });
