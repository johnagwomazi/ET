import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CreditCard, Ticket } from "lucide-react";
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

function validateContact(contact) {
  const errors = {};
  if (!contact.name.trim()) errors.name = "Name is required";
  if (contact.phone.trim().length < 5) errors.phone = "Enter a valid phone number";
  if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) errors.email = "Enter a valid email address";
  return errors;
}

function getCheckoutErrorMessage(error) {
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

      if (response?.payment?.authorizationUrl) {
        window.location.assign(response.payment.authorizationUrl);
        return;
      }

      navigate(`${ROUTE_PATHS.PAYMENT_CONFIRMATION}?reference=${encodeURIComponent(paymentReference)}`);
    } catch (error) {
      toast.error(getCheckoutErrorMessage(error));
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

          <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Starting payment...">
            <CreditCard className="h-4 w-4" />
            Continue to payment
          </Button>
        </form>
      </AuthCard>
    </div>
  );
}

export default CheckoutPage;
