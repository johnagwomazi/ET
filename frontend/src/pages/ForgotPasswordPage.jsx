import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import AuthCard from "../components/layout/AuthCard";
import AuthHeader from "../components/layout/AuthHeader";
import BackButton from "../components/layout/BackButton";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { ROUTE_PATHS } from "../routes/routePaths";
import { forgotPasswordSchema } from "../utils/authSchemas";
import * as authService from "../services/auth.service";

function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values) {
    setIsSubmitting(true);

    try {
      await authService.forgotPassword(values);
      setIsSuccess(true);
      toast.success("If the email exists, a reset flow has been prepared.");
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
            eyebrow="Password recovery"
            title="Forgot your password?"
            description="Enter your email and we’ll prepare the reset flow."
          />

          {isSuccess ? (
            <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <p className="font-medium">Reset request received.</p>
              <p>If the email exists, you can continue with the token-based reset flow.</p>
              <Button as={Link} to={ROUTE_PATHS.RESET_PASSWORD} variant="secondary">
                Go to reset password
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <Input label="Email" type="email" placeholder="name@example.com" error={errors.email?.message} {...register("email")} />
              <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Sending...">
                Send reset request
              </Button>
            </form>
          )}
        </div>
      </AuthCard>
    </motion.div>
  );
}

export default ForgotPasswordPage;
