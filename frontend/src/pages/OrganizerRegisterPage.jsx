import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthCard from "../components/layout/AuthCard";
import AuthHeader from "../components/layout/AuthHeader";
import BackButton from "../components/layout/BackButton";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import PasswordInput from "../components/ui/PasswordInput";
import { ROUTE_PATHS } from "../routes/routePaths";
import { organizerRegisterSchema } from "../utils/authSchemas";
import * as authService from "../services/auth.service";

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
      await authService.registerOrganizer(values);
      toast.success("Organization submitted successfully. Your account is awaiting Super Admin approval.");
      navigate(ROUTE_PATHS.LOGIN);
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
      className="space-y-6"
    >
      <div className="hidden lg:block">
        <BackButton to={ROUTE_PATHS.SIGN_UP} label="Back to account selection" />
      </div>

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
        </div>
      </AuthCard>
    </motion.div>
  );
}

export default OrganizerRegisterPage;
