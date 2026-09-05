import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import AuthCard from "../components/layout/AuthCard";
import AuthHeader from "../components/layout/AuthHeader";
import BackButton from "../components/layout/BackButton";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import PasswordInput from "../components/ui/PasswordInput";
import { ROUTE_PATHS } from "../routes/routePaths";
import { resetPasswordSchema } from "../utils/authSchemas";
import * as authService from "../services/auth.service";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: searchParams.get("token") || "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values) {
    setIsSubmitting(true);

    try {
      await authService.resetPassword(values);
      toast.success("Password updated successfully");
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
        <BackButton to={ROUTE_PATHS.LOGIN} label="Back to login" />
      </div>

      <AuthCard>
        <div className="space-y-6">
          <AuthHeader
            eyebrow="Reset password"
            title="Choose a new password"
            description="Use the reset token from your email to complete the process."
          />

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Reset Token"
              placeholder="Paste your token"
              error={errors.token?.message}
              {...register("token")}
            />
            <PasswordInput
              label="New Password"
              autoComplete="new-password"
              placeholder="Create a new password"
              error={errors.password?.message}
              {...register("password")}
            />
            <PasswordInput
              label="Confirm Password"
              autoComplete="new-password"
              placeholder="Confirm your new password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Updating...">
              Reset password
            </Button>
          </form>
        </div>
      </AuthCard>
    </motion.div>
  );
}

export default ResetPasswordPage;
