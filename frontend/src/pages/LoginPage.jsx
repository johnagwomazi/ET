import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthCard from "../components/layout/AuthCard";
import AuthHeader from "../components/layout/AuthHeader";
import GoogleAuthButton from "../components/auth/GoogleAuthButton";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import PasswordInput from "../components/ui/PasswordInput";
import { ROUTE_PATHS } from "../routes/routePaths";
import { loginSchema } from "../utils/authSchemas";
import { useSessionStore } from "../store/useSessionStore";
import { getPostLoginRouteForUser } from "../utils/auth";

function LoginPage() {
  const location = useLocation();
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
      navigate(getPostLoginRouteForUser(user, location.state?.from));
    } catch (error) {
      if (error.message?.toLowerCase().includes("verify your email")) {
        navigate(`${ROUTE_PATHS.VERIFY_EMAIL}?email=${encodeURIComponent(values.email.trim())}`);
        toast.error("Verify your email to continue");
        return;
      }
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
            eyebrow="Welcome back"
            title="Log in to your account"
            description="Sign in with the account you use for tickets or event management."
          />

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input label="Email" type="email" autoComplete="email" placeholder="name@example.com" error={errors.email?.message} {...register("email")} />
            <PasswordInput label="Password" autoComplete="current-password" placeholder="Enter your password" error={errors.password?.message} {...register("password")} />

            <div className="flex justify-end text-sm">
              <Link to={ROUTE_PATHS.FORGOT_PASSWORD} className="text-slate-400 transition hover:text-slate-200">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Signing in...">
              Sign in
            </Button>
          </form>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-600">
            <span className="h-px flex-1 bg-slate-800" />
            or
            <span className="h-px flex-1 bg-slate-800" />
          </div>
          <GoogleAuthButton returnTo={location.state?.from} />
          <p className="text-center text-sm text-slate-400">
            New here? <Link to={ROUTE_PATHS.SIGN_UP} className="font-medium text-app-300 hover:text-app-200">Create account</Link>
          </p>
        </div>
      </AuthCard>
    </motion.div>
  );
}

export default LoginPage;
