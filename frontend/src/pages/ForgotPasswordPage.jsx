import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import AuthCard from "../components/layout/AuthCard";
import AuthHeader from "../components/layout/AuthHeader";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { ROUTE_PATHS } from "../routes/routePaths";
import { forgotPasswordSchema } from "../utils/authSchemas";
import * as authService from "../services/auth.service";

function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values) {
    setIsSubmitting(true);
    try {
      await authService.forgotPassword(values);
      setIsSuccess(true);
      toast.success("If the email exists, reset instructions have been sent.");
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard>
      <div className="space-y-6">
        <AuthHeader
          eyebrow="Password recovery"
          title="Forgot your password?"
          description="Enter your email and well send a secure reset link."
        />
        {isSuccess ? (
          <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <p className="font-medium">Check your inbox.</p>
            <p>If an account exists for that email, the reset link will arrive shortly.</p>
            <Button as={Link} to={ROUTE_PATHS.LOGIN} variant="secondary">Return to sign in</Button>
          </div>
        ) : (
          <>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <Input label="Email" type="email" autoComplete="email" placeholder="name@example.com" error={errors.email?.message} {...register("email")} />
              <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Sending...">Send reset link</Button>
            </form>
            <p className="text-center text-sm text-slate-400">
              Remembered it? <Link to={ROUTE_PATHS.LOGIN} className="font-medium text-app-300 hover:text-app-200">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </AuthCard>
  );
}

export default ForgotPasswordPage;
