import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import AuthCard from "../components/layout/AuthCard";
import AuthHeader from "../components/layout/AuthHeader";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { ROUTE_PATHS } from "../routes/routePaths";
import { verifyEmailSchema } from "../utils/authSchemas";
import * as authService from "../services/auth.service";
import {
  clearPendingVerification,
  getPendingVerification,
  savePendingVerification,
} from "../utils/pendingAuth";

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [pending, setPending] = useState(() => getPendingVerification());
  const initialEmail = searchParams.get("email") || pending?.email || "";
  const initialCooldown = Math.max(0, 60 - Math.floor((Date.now() - (pending?.sentAt || 0)) / 1000));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [newEmail, setNewEmail] = useState(initialEmail);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { email: initialEmail, code: "" },
  });
  const email = watch("email");

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function onSubmit(values) {
    setIsSubmitting(true);
    try {
      await authService.verifyEmail(values);
      clearPendingVerification();
      setIsVerified(true);
      toast.success("Email verified successfully");
    } catch (error) {
      toast.error(error.message || "Unable to verify this code");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!email || cooldown > 0) return;
    setIsResending(true);
    try {
      const result = await authService.resendVerification({ email });
      const nextCooldown = result.retryAfterSeconds || 60;
      setCooldown(nextCooldown);
      const nextPending = { ...pending, email, sentAt: Date.now() };
      savePendingVerification(nextPending);
      setPending(nextPending);
      toast.success("A new verification code was sent");
    } catch (error) {
      if (error.data?.retryAfterSeconds) setCooldown(error.data.retryAfterSeconds);
      toast.error(error.message || "Unable to resend the code");
    } finally {
      setIsResending(false);
    }
  }

  async function handleEmailUpdate(event) {
    event.preventDefault();
    if (!pending?.verificationTicket) {
      toast.error("Start signup again to use a different email address.");
      return;
    }
    setIsUpdatingEmail(true);
    try {
      const result = await authService.updateVerificationEmail({
        verificationTicket: pending.verificationTicket,
        email: newEmail,
      });
      const normalizedEmail = newEmail.trim().toLowerCase();
      setValue("email", normalizedEmail);
      setValue("code", "");
      setCooldown(60);
      setShowEmailEditor(false);
      const nextPending = {
        email: normalizedEmail,
        verificationTicket: result.verificationTicket,
        sentAt: Date.now(),
      };
      savePendingVerification(nextPending);
      setPending(nextPending);
      toast.success(result.verificationEmailSent ? "Email updated and a new code was sent" : "Email updated, but delivery is not configured");
    } catch (error) {
      toast.error(error.message || "Unable to update the email address");
    } finally {
      setIsUpdatingEmail(false);
    }
  }

  return (
    <AuthCard>
      <div className="space-y-6">
        <AuthHeader
          eyebrow="Email verification"
          title="Check your inbox"
          description={email ? `Enter the six-digit code sent to ${email}.` : "Enter your email and verification code."}
        />

        {isVerified ? (
          <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <p className="font-medium">Your email is verified. You can now sign in.</p>
            <Button as={Link} to={ROUTE_PATHS.LOGIN} className="w-full">Continue to sign in</Button>
          </div>
        ) : (
          <>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <Input label="Email Address" type="email" autoComplete="email" readOnly={Boolean(initialEmail)} error={errors.email?.message} {...register("email")} />
              <Input
                label="Verification Code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                className="text-center text-lg tracking-[0.45em]"
                error={errors.code?.message}
                {...register("code")}
              />
              <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Verifying...">Verify email</Button>
            </form>

            <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={handleResend} isLoading={isResending} disabled={cooldown > 0}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </Button>
              <button type="button" className="text-slate-400 hover:text-white" onClick={() => setShowEmailEditor((value) => !value)}>
                Wrong email address?
              </button>
            </div>

            {showEmailEditor ? (
              <form className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4" onSubmit={handleEmailUpdate}>
                <Input label="Correct Email Address" type="email" required value={newEmail} onChange={(event) => setNewEmail(event.target.value)} />
                <Button type="submit" variant="secondary" className="w-full" isLoading={isUpdatingEmail}>Update email and send code</Button>
              </form>
            ) : null}
          </>
        )}
      </div>
    </AuthCard>
  );
}

export default VerifyEmailPage;
