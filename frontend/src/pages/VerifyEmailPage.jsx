import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import AuthCard from "../components/layout/AuthCard";
import AuthHeader from "../components/layout/AuthHeader";
import BackButton from "../components/layout/BackButton";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { ROUTE_PATHS } from "../routes/routePaths";
import { verifyEmailSchema } from "../utils/authSchemas";
import * as authService from "../services/auth.service";

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      token: searchParams.get("token") || "",
    },
  });

  async function onSubmit(values) {
    setIsSubmitting(true);

    try {
      await authService.verifyEmail(values);
      setIsVerified(true);
      toast.success("Email verified successfully");
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
            eyebrow="Email verification"
            title="Verify your email address"
            description="Paste the verification token from your email to activate your account."
          />

          {isVerified ? (
            <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <p className="font-medium">Verification complete.</p>
              <Button as={Link} to={ROUTE_PATHS.LOGIN} variant="secondary">
                Go to login
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <Input
                label="Verification Token"
                placeholder="Paste your token"
                error={errors.token?.message}
                {...register("token")}
              />
              <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Verifying...">
                Verify email
              </Button>
            </form>
          )}
        </div>
      </AuthCard>
    </motion.div>
  );
}

export default VerifyEmailPage;
