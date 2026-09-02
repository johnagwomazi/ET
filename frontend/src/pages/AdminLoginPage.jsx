import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router-dom";
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
import { getPostLoginRouteForUser } from "../utils/auth";

function AdminLoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const adminLogin = useSessionStore((state) => state.adminLogin);
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
      const user = await adminLogin(values);
      toast.success("Admin login successful");
      navigate(getPostLoginRouteForUser(user, location.state?.from));
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
            eyebrow="Super admin access"
            title="Sign in as Super Admin"
            description="This area is reserved for the platform owner."
          />

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input label="Email" type="email" placeholder="admin@example.com" error={errors.email?.message} {...register("email")} />
            <PasswordInput label="Password" placeholder="Enter your password" error={errors.password?.message} {...register("password")} />

            <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Signing in...">
              Sign in as Super Admin
            </Button>
          </form>
        </div>
      </AuthCard>
    </motion.div>
  );
}

export default AdminLoginPage;
