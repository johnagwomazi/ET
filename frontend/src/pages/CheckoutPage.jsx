import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CircleAlert, CreditCard, ShieldCheck, Ticket } from "lucide-react";
import AuthCard from "../components/layout/AuthCard";
import AuthHeader from "../components/layout/AuthHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import EmptyState from "../components/common/EmptyState";
import { ROUTE_PATHS } from "../routes/routePaths";
import { useSessionStore } from "../store/useSessionStore";
import { formatMoney } from "../utils/formatters";
import { loadCheckoutSelection, savePaymentReference } from "../utils/checkoutStorage";
import * as ticketingService from "../services/ticketing.service";
import {
  openPaystackCheckout,
  PAYSTACK_CHECKOUT_RESULT,
} from "../services/paystackInline.service";

function validateContact(contact) {
  const errors = {};
  if (!contact.name.trim()) errors.name = "Name is required";
  if (contact.phone.trim().length < 5) errors.phone = "Enter a valid phone number";
  if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) errors.email = "Enter a valid email address";
  return errors;
}

function getCheckoutErrorMessage(error) {
  if (error?.code === "PAYSTACK_INLINE_ERROR") {
    return `${error.message} No charge was made. Please try again.`;
  }
  if (error?.code === "PAYSTACK_ACCESS_CODE_MISSING") {
    return "Secure checkout could not be opened. No charge was made. Please try again.";
  }
  if (error?.code === "PAYSTACK_REFERENCE_MISMATCH") {
    return "Payment could not be confirmed for this order. Please contact support before trying again.";
  }
  if (error?.status === 409) return "These tickets are no longer available. Return to the event and update your selection.";
  if (error?.status === 429) return "Too many checkout attempts were made. Please wait a moment and try again.";
  if (error?.status === 502 || error?.status === 503) return "Payment could not be started right now. No charge was made.";
  if (error?.status === 0) return "The payment service could not be reached. Check your connection and try again.";
  return "Checkout could not be completed. No charge was made.";
}

function CheckoutPage() {
  const navigate = useNavigate();
  const currentUser = useSessionStore((state) => state.currentUser);
  const [selection, setSelection] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", email: "" });
  const [attendees, setAttendees] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState(null);
  const [customerErrors, setCustomerErrors] = useState({});
  const [attendeeErrors, setAttendeeErrors] = useState([]);

  useEffect(() => {
    const stored = loadCheckoutSelection();
    setSelection(stored);
    const fallbackName = `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim();
    setCustomerInfo({
      name: fallbackName,
      phone: "",
      email: currentUser?.email || "",
    });
    setAttendees((stored?.items || []).flatMap((item) =>
      Array.from({ length: item.quantity }, () => ({
        ticketTypeId: item.ticketTypeId,
        name: fallbackName,
        phone: "",
        email: currentUser?.email || "",
      }))
    ));
  }, [currentUser]);

  const total = useMemo(
    () => (selection?.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [selection]
  );
  const currency = selection?.items?.[0]?.currency || "NGN";

  function updateCustomerField(field, value) {
    setCustomerInfo((current) => ({ ...current, [field]: value }));
    setCustomerErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateAttendee(index, field, value) {
    setAttendees((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
    setAttendeeErrors((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: undefined } : item));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setCheckoutNotice(null);

    if (!selection?.eventId || selection.items.length === 0) {
      toast.error("No tickets selected");
      return;
    }

    const nextCustomerErrors = validateContact(customerInfo);
    const nextAttendeeErrors = attendees.map(validateContact);
    if (Object.keys(nextCustomerErrors).length > 0 || nextAttendeeErrors.some((item) => Object.keys(item).length > 0)) {
      setCustomerErrors(nextCustomerErrors);
      setAttendeeErrors(nextAttendeeErrors);
      toast.error("Complete the required customer and attendee details");
      return;
    }

    setIsSubmitting(true);

    try {
      const items = selection.items.map((item) => ({
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        attendees: attendees.filter((attendee) => attendee.ticketTypeId === item.ticketTypeId).map(({ ticketTypeId, ...attendee }) => attendee),
      }));
      const response = await ticketingService.createCheckoutOrder({
        eventId: selection.eventId,
        customerInfo,
        items,
        idempotencyKey: selection.idempotencyKey,
      });

      const paymentReference = response?.payment?.reference || "";
      if (!paymentReference) {
        throw new Error("Checkout response did not include a payment reference");
      }
      savePaymentReference(paymentReference);

      if (response?.payment?.free || response?.payment?.completed) {
        navigate(`${ROUTE_PATHS.PAYMENT_CONFIRMATION}?reference=${encodeURIComponent(paymentReference)}`);
        return;
      }

      const checkoutResult = await openPaystackCheckout(response?.payment?.accessCode);

      if (checkoutResult.status === PAYSTACK_CHECKOUT_RESULT.CANCELLED) {
        setCheckoutNotice({
          tone: "warning",
          message: "Payment was cancelled. Your ticket has not been issued, and you can try again when ready.",
        });
        toast("Payment cancelled");
        return;
      }

      const providerReference = checkoutResult.response?.reference;
      if (providerReference && providerReference !== paymentReference) {
        const referenceError = new Error("Paystack returned an unexpected payment reference.");
        referenceError.code = "PAYSTACK_REFERENCE_MISMATCH";
        throw referenceError;
      }

      toast.success("Payment submitted. Verifying your order...");
      navigate(`${ROUTE_PATHS.PAYMENT_CONFIRMATION}?reference=${encodeURIComponent(paymentReference)}`);
    } catch (error) {
      const message = getCheckoutErrorMessage(error);
      setCheckoutNotice({ tone: "error", message });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!selection) {
    return (
      <AuthCard>
        <EmptyState title="No tickets selected" message="Choose tickets from an event page before checking out." />
        <div className="mt-5">
          <Button as={Link} to={ROUTE_PATHS.HOME} variant="secondary">Back to discovery</Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <div className="space-y-6">
      <AuthCard>
        <AuthHeader eyebrow="Checkout" title="Complete your order" description="Review attendee details before continuing securely to payment." />
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <Card className="border-slate-800/70 bg-slate-950/70">
            <div className="space-y-3">
              {(selection.items || []).map((item) => (
                <div key={item.ticketTypeId} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                  <div>
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-sm text-slate-400">{item.quantity} x {formatMoney(item.price, item.currency)}</p>
                  </div>
                  <p className="text-sm font-semibold text-white">{formatMoney(Number(item.price) * Number(item.quantity), item.currency)}</p>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                <span className="text-sm text-slate-400">Total</span>
                <span className="text-xl font-semibold text-white">{formatMoney(total, currency)}</span>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Input label="Customer name" autoComplete="name" required error={customerErrors.name} value={customerInfo.name} onChange={(event) => updateCustomerField("name", event.target.value)} />
            <Input label="Phone" type="tel" autoComplete="tel" required error={customerErrors.phone} value={customerInfo.phone} onChange={(event) => updateCustomerField("phone", event.target.value)} />
            <Input label="Email" type="email" autoComplete="email" required error={customerErrors.email} value={customerInfo.email} onChange={(event) => updateCustomerField("email", event.target.value)} />
          </div>

          <Card className="space-y-4 border-slate-800/70 bg-slate-950/70">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-app-300" />
              <h2 className="text-base font-semibold text-white">Attendees</h2>
            </div>
            <div className="grid gap-4">
              {attendees.map((attendee, index) => (
                <div key={`${attendee.ticketTypeId}-${index}`} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 md:grid-cols-3">
                  <Input label={`Attendee ${index + 1} name`} autoComplete="name" required error={attendeeErrors[index]?.name} value={attendee.name} onChange={(event) => updateAttendee(index, "name", event.target.value)} />
                  <Input label="Phone" type="tel" autoComplete="tel" required error={attendeeErrors[index]?.phone} value={attendee.phone} onChange={(event) => updateAttendee(index, "phone", event.target.value)} />
                  <Input label="Email" type="email" autoComplete="email" required error={attendeeErrors[index]?.email} value={attendee.email} onChange={(event) => updateAttendee(index, "email", event.target.value)} />
                </div>
              ))}
            </div>
          </Card>

          <div className="flex items-start gap-3 rounded-2xl border border-app-400/20 bg-app-500/5 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-app-300" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-white">Secure popup checkout</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Paystack securely handles card, bank, and other available payment methods. We never collect your card details.
              </p>
            </div>
          </div>

          {checkoutNotice ? (
            <div
              role={checkoutNotice.tone === "error" ? "alert" : "status"}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6 ${
                checkoutNotice.tone === "error"
                  ? "border-rose-400/25 bg-rose-500/10 text-rose-100"
                  : "border-amber-400/25 bg-amber-500/10 text-amber-100"
              }`}
            >
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{checkoutNotice.message}</span>
            </div>
          ) : null}

          <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Opening secure checkout...">
            <CreditCard className="h-4 w-4" />
            Pay securely with Paystack
          </Button>
        </form>
      </AuthCard>
    </div>
  );
}

export default CheckoutPage;
