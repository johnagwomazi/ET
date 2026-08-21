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
import { customerRegisterSchema } from "../utils/authSchemas";
import * as authService from "../services/auth.service";

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
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values) {
    setIsSubmitting(true);

    try {
      await authService.registerCustomer(values);
      toast.success("Account created successfully. Please verify your email.");
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
            eyebrow="Customer registration"
            title="Create your customer account"
            description="Use your email to manage bookings and buy tickets later."
          />

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="First Name" placeholder="John" error={errors.firstName?.message} {...register("firstName")} />
              <Input label="Last Name" placeholder="Doe" error={errors.lastName?.message} {...register("lastName")} />
            </div>

            <Input label="Email" type="email" placeholder="john@example.com" error={errors.email?.message} {...register("email")} />

            <PasswordInput label="Password" placeholder="Create a password" error={errors.password?.message} {...register("password")} />
            <PasswordInput label="Confirm Password" placeholder="Confirm your password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />

            <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Creating account...">
              Create account
            </Button>
          </form>
        </div>
      </AuthCard>
    </motion.div>
  );
}

export default CustomerRegisterPage;
