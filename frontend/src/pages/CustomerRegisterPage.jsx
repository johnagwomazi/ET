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
import { customerRegisterSchema } from "../utils/authSchemas";
import * as authService from "../services/auth.service";
import { USER_ROLES } from "../constants/roles.constants";
import { savePendingVerification } from "../utils/pendingAuth";

function CustomerRegisterPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(customerRegisterSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values) {
    setIsSubmitting(true);

    try {
      const result = await authService.registerCustomer(values);
      savePendingVerification({
        email: values.email.trim().toLowerCase(),
        verificationTicket: result.verificationTicket,
        sentAt: Date.now(),
      });
      toast.success(result.verificationEmailSent ? "Verification code sent to your email." : "Account created. Email delivery is not configured.");
      navigate(`${ROUTE_PATHS.VERIFY_EMAIL}?email=${encodeURIComponent(values.email.trim())}`);
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
            eyebrow="Customer registration"
            title="Create your customer account"
            description="Use your email to manage bookings and buy tickets later."
          />

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="First Name" placeholder="John" error={errors.firstName?.message} {...register("firstName")} />
              <Input label="Last Name" placeholder="Doe" error={errors.lastName?.message} {...register("lastName")} />
            </div>

            <Input label="Email" type="email" autoComplete="email" placeholder="john@example.com" error={errors.email?.message} {...register("email")} />
            <Input label="Phone Number" type="tel" autoComplete="tel" placeholder="+234 800 000 0000" error={errors.phone?.message} {...register("phone")} />

            <PasswordInput label="Password" autoComplete="new-password" placeholder="Create a password" error={errors.password?.message} {...register("password")} />
            <PasswordInput label="Confirm Password" autoComplete="new-password" placeholder="Confirm your password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />

            <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Creating account...">
              Create account
            </Button>
          </form>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-600">
            <span className="h-px flex-1 bg-slate-800" />or<span className="h-px flex-1 bg-slate-800" />
          </div>
          <GoogleAuthButton accountType={USER_ROLES.CUSTOMER} />
          <p className="text-center text-sm text-slate-400">
            Already registered? <Link to={ROUTE_PATHS.LOGIN} className="font-medium text-app-300 hover:text-app-200">Sign in</Link>
          </p>
        </div>
      </AuthCard>
    </motion.div>
  );
}

export default CustomerRegisterPage;
