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
import * as ticketingService from "../services/ticketing.service";

const CHECKOUT_STORAGE_KEY = "events_checkout_selection";

export function saveCheckoutSelection(selection) {
  sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(selection));
}

function loadCheckoutSelection() {
  try {
    return JSON.parse(sessionStorage.getItem(CHECKOUT_STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function CheckoutPage() {
  const navigate = useNavigate();
  const currentUser = useSessionStore((state) => state.currentUser);
  const [selection, setSelection] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", email: "" });
  const [attendees, setAttendees] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  }

  function updateAttendee(index, field, value) {
    setAttendees((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selection?.eventId || selection.items.length === 0) {
      toast.error("No tickets selected");
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

      sessionStorage.setItem("events_last_payment_reference", response?.payment?.reference || "");

      if (response?.payment?.authorizationUrl) {
        window.location.assign(response.payment.authorizationUrl);
        return;
      }

      navigate(`${ROUTE_PATHS.PAYMENT_CONFIRMATION}?reference=${response?.payment?.reference || ""}`);
    } catch (error) {
      toast.error(error.message || "Checkout failed");
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
        <AuthHeader eyebrow="Checkout" title="Complete your order" description="The backend will recalculate pricing and initialize payment securely." />
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
            <Input label="Customer name" value={customerInfo.name} onChange={(event) => updateCustomerField("name", event.target.value)} />
            <Input label="Phone" value={customerInfo.phone} onChange={(event) => updateCustomerField("phone", event.target.value)} />
            <Input label="Email" type="email" value={customerInfo.email} onChange={(event) => updateCustomerField("email", event.target.value)} />
          </div>

          <Card className="space-y-4 border-slate-800/70 bg-slate-950/70">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-app-300" />
              <h2 className="text-base font-semibold text-white">Attendees</h2>
            </div>
            <div className="grid gap-4">
              {attendees.map((attendee, index) => (
                <div key={`${attendee.ticketTypeId}-${index}`} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 md:grid-cols-3">
                  <Input label={`Attendee ${index + 1} name`} value={attendee.name} onChange={(event) => updateAttendee(index, "name", event.target.value)} />
                  <Input label="Phone" value={attendee.phone} onChange={(event) => updateAttendee(index, "phone", event.target.value)} />
                  <Input label="Email" type="email" value={attendee.email} onChange={(event) => updateAttendee(index, "email", event.target.value)} />
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
