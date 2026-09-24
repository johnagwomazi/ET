import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import AuthCard from "../components/layout/AuthCard";
import AuthHeader from "../components/layout/AuthHeader";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { USER_ROLES } from "../constants/roles.constants";
import { ROUTE_PATHS } from "../routes/routePaths";
import * as authService from "../services/auth.service";
import { useSessionStore } from "../store/useSessionStore";
import { googleRegistrationSchema } from "../utils/authSchemas";
import { getPostLoginRouteForUser } from "../utils/auth";
import { clearPendingGoogleRegistration, getPendingGoogleRegistration } from "../utils/pendingAuth";

function GoogleRegistrationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const refreshCurrentUser = useSessionStore((state) => state.refreshCurrentUser);
  const pending = useMemo(() => getPendingGoogleRegistration(), []);
  const accountType = searchParams.get("accountType") || pending?.accountType;
  const isOrganizer = accountType === USER_ROLES.ADMIN;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(googleRegistrationSchema),
    defaultValues: {
      firstName: pending?.profile?.firstName || "",
      lastName: pending?.profile?.lastName || "",
      phone: "",
      organizationName: "",
    },
  });

  async function onSubmit(values) {
    if (!pending?.completionToken || ![USER_ROLES.CUSTOMER, USER_ROLES.ADMIN].includes(accountType)) {
      toast.error("Your Google registration session has expired. Please try again.");
      return;
    }
    if (isOrganizer && !values.organizationName?.trim()) {
      setError("organizationName", { type: "required", message: "Organization name is required" });
      return;
    }
    setIsSubmitting(true);
    try {
      await authService.completeGoogleRegistration({
        ...values,
        completionToken: pending.completionToken,
        accountType,
      });
      clearPendingGoogleRegistration();
      const user = await refreshCurrentUser();
      toast.success("Account created successfully");
      navigate(getPostLoginRouteForUser(user));
    } catch (error) {
      toast.error(error.message || "Unable to complete registration");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!pending?.completionToken || ![USER_ROLES.CUSTOMER, USER_ROLES.ADMIN].includes(accountType)) {
    return (
      <AuthCard>
        <div className="space-y-5">
          <AuthHeader title="Google signup expired" description="Start again to securely create your account." />
          <Button as={Link} to={ROUTE_PATHS.SIGN_UP} className="w-full">Choose account type</Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="space-y-6">
        <AuthHeader
          eyebrow="Finish signup"
          title={isOrganizer ? "Complete your organizer account" : "Complete your customer account"}
          description={`Google verified ${pending.profile?.email}. Add the remaining required details.`}
        />
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {isOrganizer ? (
            <Input label="Organization Name" error={errors.organizationName?.message} {...register("organizationName")} />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First Name" error={errors.firstName?.message} {...register("firstName")} />
            <Input label="Last Name" error={errors.lastName?.message} {...register("lastName")} />
          </div>
          <Input label={isOrganizer ? "Business Phone" : "Phone Number"} type="tel" autoComplete="tel" error={errors.phone?.message} {...register("phone")} />
          <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Creating account...">
            Complete registration
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}

export default GoogleRegistrationPage;
