import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthCard from "../components/layout/AuthCard";
import AuthHeader from "../components/layout/AuthHeader";
import GoogleAuthButton from "../components/auth/GoogleAuthButton";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import PasswordInput from "../components/ui/PasswordInput";
import { ROUTE_PATHS } from "../routes/routePaths";
import { organizerRegisterSchema } from "../utils/authSchemas";
import * as authService from "../services/auth.service";
import { USER_ROLES } from "../constants/roles.constants";
import { savePendingVerification } from "../utils/pendingAuth";

function OrganizerRegisterPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(organizerRegisterSchema),
    defaultValues: {
      organizationName: "",
      adminFirstName: "",
      adminLastName: "",
      businessEmail: "",
      businessPhone: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values) {
    setIsSubmitting(true);

    try {
      const result = await authService.registerOrganizer(values);
      savePendingVerification({
        email: values.businessEmail.trim().toLowerCase(),
        verificationTicket: result.verificationTicket,
        sentAt: Date.now(),
      });
      toast.success(result.verificationEmailSent ? "Organization submitted. Verify your email to continue." : "Organization submitted. Email delivery is not configured.");
      navigate(`${ROUTE_PATHS.VERIFY_EMAIL}?email=${encodeURIComponent(values.businessEmail.trim())}`);
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full"
    >
      <AuthCard>
        <div className="space-y-6">
          <AuthHeader
            eyebrow="Organizer registration"
            title="Register your organization"
            description="Create an organization and its primary admin account. Approval happens later."
          />

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Organization Name"
              placeholder="Acme Events"
              error={errors.organizationName?.message}
              {...register("organizationName")}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Admin First Name"
                placeholder="John"
                error={errors.adminFirstName?.message}
                {...register("adminFirstName")}
              />
              <Input
                label="Admin Last Name"
                placeholder="Doe"
                error={errors.adminLastName?.message}
                {...register("adminLastName")}
              />
            </div>

            <Input
              label="Business Email"
              type="email"
              autoComplete="email"
              placeholder="business@example.com"
              error={errors.businessEmail?.message}
              {...register("businessEmail")}
            />

            <Input
              label="Business Phone"
              placeholder="+234 800 000 0000"
              error={errors.businessPhone?.message}
              {...register("businessPhone")}
            />

            <PasswordInput
              label="Password"
              autoComplete="new-password"
              placeholder="Create a password"
              error={errors.password?.message}
              {...register("password")}
            />
            <PasswordInput
              label="Confirm Password"
              autoComplete="new-password"
              placeholder="Confirm your password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Submitting...">
              Register organization
            </Button>
          </form>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-600">
            <span className="h-px flex-1 bg-slate-800" />or<span className="h-px flex-1 bg-slate-800" />
          </div>
          <GoogleAuthButton accountType={USER_ROLES.ADMIN} />
          <p className="text-center text-sm text-slate-400">
            Already registered? <Link to={ROUTE_PATHS.LOGIN} className="font-medium text-app-300 hover:text-app-200">Sign in</Link>
          </p>
        </div>
      </AuthCard>
    </motion.div>
  );
}

export default OrganizerRegisterPage;
