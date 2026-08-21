import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthCard from "../components/layout/AuthCard";
import AuthHeader from "../components/layout/AuthHeader";
import BackButton from "../components/layout/BackButton";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import PasswordInput from "../components/ui/PasswordInput";
import { ROUTE_PATHS } from "../routes/routePaths";
import { loginSchema } from "../utils/authSchemas";
import { useSessionStore } from "../store/useSessionStore";
import { getDashboardRouteForRole } from "../utils/auth";

function LoginPage() {
  const navigate = useNavigate();
  const login = useSessionStore((state) => state.login);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values) {
    setIsSubmitting(true);

    try {
      const user = await login(values);
      toast.success("Login successful");
      navigate(getDashboardRouteForRole(user.role));
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
        <BackButton to={ROUTE_PATHS.HOME} label="Back to home" />
      </div>

      <AuthCard>
        <div className="space-y-6">
          <AuthHeader
            eyebrow="Welcome back"
            title="Log in to your account"
            description="Your role determines where you land after sign in."
          />

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input label="Email" type="email" placeholder="name@example.com" error={errors.email?.message} {...register("email")} />
            <PasswordInput label="Password" placeholder="Enter your password" error={errors.password?.message} {...register("password")} />

            <div className="flex items-center justify-between gap-4 text-sm">
              <Link to={ROUTE_PATHS.FORGOT_PASSWORD} className="text-slate-400 transition hover:text-slate-200">
                Forgot password?
              </Link>
              <Link to={ROUTE_PATHS.SIGN_UP} className="text-app-300 transition hover:text-app-200">
                Create account
              </Link>
            </div>

            <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Signing in...">
              Sign in
            </Button>
          </form>

        </div>
      </AuthCard>
    </motion.div>
  );
}

export default LoginPage;
