import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CircleAlert, CreditCard, ShieldCheck, Ticket, X } from "lucide-react";
import AuthCard from "../components/layout/AuthCard";
import AuthHeader from "../components/layout/AuthHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import EmptyState from "../components/common/EmptyState";
import PageContainer from "../components/ui/PageContainer";
import { ROUTE_PATHS } from "../routes/routePaths";
import { useSessionStore } from "../store/useSessionStore";
import { formatMoney } from "../utils/formatters";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
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
  if (error?.status === 400 && /coupon|discount|eligible|expired/i.test(error.message || "")) {
    return error.message;
  }
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
  const [selection, setSelection] = useState(() => loadCheckoutSelection());
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", email: "" });
  const [attendees, setAttendees] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState(null);
  const [customerErrors, setCustomerErrors] = useState({});
  const [attendeeErrors, setAttendeeErrors] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [pricing, setPricing] = useState(null);

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
        ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
      });
      setPricing(response?.order || null);

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
                <span className="text-sm text-slate-400">Original subtotal</span>
                <span className="text-sm font-semibold text-white">{formatMoney(pricing?.originalSubtotal ?? total, currency)}</span>
              </div>
              {pricing?.discountAmount ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-300">Coupon discount</span>
                  <span className="font-semibold text-emerald-300">-{formatMoney(pricing.discountAmount, currency)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                <span className="text-sm text-slate-400">Payable</span>
                <span className="text-xl font-semibold text-white">{formatMoney(pricing?.customerPayableAmount ?? total, currency)}</span>
              </div>
            </div>
          </Card>

          <Card className="space-y-3 border-slate-800/70 bg-slate-950/70">
            <div>
              <h2 className="text-base font-semibold text-white">Have a coupon?</h2>
              <p className="mt-1 text-sm text-slate-400">The server validates eligibility and calculates the final price.</p>
            </div>
            <Input
              label="Coupon code"
              value={couponCode}
              onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setPricing(null); }}
              placeholder="Enter coupon code"
              autoComplete="off"
              maxLength={40}
            />
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

function checkoutFullName(user) {
  return `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
}

function checkoutRegisteredPhone(user) {
  const candidates = [
    user?.phone,
    user?.phoneNumber,
    user?.phone_number,
    user?.profile?.phone,
    user?.profile?.phoneNumber,
    user?.profile?.phone_number,
  ];
  return candidates.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

function validateCheckoutContact(contact) {
  const errors = {};
  if (!contact.name.trim()) errors.name = "Name is required";
  if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) errors.email = "Enter a valid email address";
  if (contact.phone.trim() && contact.phone.trim().length < 5) errors.phone = "Enter a valid phone number";
  return errors;
}

function buildCheckoutAttendees(items, buyer) {
  const name = checkoutFullName(buyer);
  const phone = checkoutRegisteredPhone(buyer);
  return (items || []).flatMap((item) => Array.from({ length: item.quantity }, () => ({
    ticketTypeId: item.ticketTypeId,
    name,
    phone,
    email: buyer?.email || "",
  })));
}

function CheckoutPageRedesigned() {
  const navigate = useNavigate();
  const currentUser = useSessionStore((state) => state.currentUser);
  const [selection, setSelection] = useState(() => loadCheckoutSelection());
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", email: "" });
  const [attendees, setAttendees] = useState([]);
  const [attendeeTouched, setAttendeeTouched] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState(null);
  const [customerErrors, setCustomerErrors] = useState({});
  const [attendeeErrors, setAttendeeErrors] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [pricing, setPricing] = useState(null);
  const [couponState, setCouponState] = useState({ status: "idle", message: "" });
  const pricingRequestRef = useRef(0);
  const initializedCheckoutRef = useRef("");
  const debouncedCouponCode = useDebouncedValue(couponCode, 450);

  useEffect(() => {
    const stored = loadCheckoutSelection();
    setSelection(stored);
    const buyerKey = currentUser?._id || currentUser?.id || "anonymous";
    const checkoutKey = `${stored?.idempotencyKey || "selection"}:${buyerKey}`;
    if (initializedCheckoutRef.current === checkoutKey) return;
    initializedCheckoutRef.current = checkoutKey;
    const buyer = { firstName: currentUser?.firstName, lastName: currentUser?.lastName, phone: checkoutRegisteredPhone(currentUser), email: currentUser?.email || "" };
    setCustomerInfo({ name: checkoutFullName(buyer), phone: buyer.phone, email: buyer.email });
    const nextAttendees = buildCheckoutAttendees(stored?.items, buyer);
    setAttendees(nextAttendees);
    setAttendeeTouched(nextAttendees.map(() => ({ name: false, phone: false, email: false })));
    setAttendeeErrors([]);
  }, [currentUser, selection?.idempotencyKey]);

  const total = useMemo(() => (selection?.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0), [selection]);
  const currency = selection?.items?.[0]?.currency || "NGN";
  const displayedPricing = pricing || { originalSubtotal: total, customerPayableAmount: total, discountAmount: 0 };

  useEffect(() => {
    const code = debouncedCouponCode.trim();
    if (!selection?.eventId || !selection.items?.length || !code) {
      pricingRequestRef.current += 1;
      setPricing(null);
      setCouponState({ status: "idle", message: "" });
      return undefined;
    }
    const requestId = pricingRequestRef.current + 1;
    pricingRequestRef.current = requestId;
    const controller = new AbortController();
    setCouponState({ status: "loading", message: "Checking coupon..." });
    ticketingService.previewCheckoutPricing({
      eventId: selection.eventId,
      customerInfo,
      items: selection.items.map(({ ticketTypeId, quantity }) => ({ ticketTypeId, quantity })),
      couponCode: code,
    }, { signal: controller.signal }).then((response) => {
      if (pricingRequestRef.current !== requestId) return;
      setPricing(response?.pricing || null);
      setCouponState({ status: "valid", message: "Coupon applied" });
    }).catch((error) => {
      if (controller.signal.aborted || pricingRequestRef.current !== requestId) return;
      setPricing(null);
      setCouponState({ status: "invalid", message: error.message || "Coupon could not be applied" });
    });
    return () => controller.abort();
  }, [debouncedCouponCode, selection?.eventId, selection?.idempotencyKey]);

  function updateCustomerField(field, value) {
    setCustomerInfo((current) => ({ ...current, [field]: value }));
    setCustomerErrors((current) => ({ ...current, [field]: undefined }));
    setAttendees((current) => current.map((attendee, index) => {
      const touched = attendeeTouched[index] || {};
      return field === "name" && !touched.name ? { ...attendee, name: value }
        : field === "email" && !touched.email ? { ...attendee, email: value }
          : field === "phone" && !touched.phone ? { ...attendee, phone: value } : attendee;
    }));
  }

  function updateAttendee(index, field, value) {
    setAttendees((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
    setAttendeeTouched((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: true } : item));
    setAttendeeErrors((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: undefined } : item));
  }

  function applyBuyerDetails() {
    setAttendees((current) => current.map((attendee, index) => {
      const touched = attendeeTouched[index] || {};
      return { ...attendee, name: touched.name ? attendee.name : customerInfo.name, email: touched.email ? attendee.email : customerInfo.email, phone: touched.phone ? attendee.phone : customerInfo.phone };
    }));
  }

  function clearCoupon() {
    setCouponCode("");
    setPricing(null);
    setCouponState({ status: "idle", message: "" });
  }

  async function submitCheckout(event) {
    event.preventDefault();
    setCheckoutNotice(null);
    if (!selection?.eventId || !selection.items.length) return toast.error("No tickets selected");
    const nextCustomerErrors = validateCheckoutContact(customerInfo);
    const nextAttendeeErrors = attendees.map(validateCheckoutContact);
    if (Object.keys(nextCustomerErrors).length || nextAttendeeErrors.some((item) => Object.keys(item).length)) {
      setCustomerErrors(nextCustomerErrors);
      setAttendeeErrors(nextAttendeeErrors);
      toast.error("Complete the required customer and attendee details");
      return;
    }
    setIsSubmitting(true);
    try {
      const items = selection.items.map((item) => ({ ticketTypeId: item.ticketTypeId, quantity: item.quantity, attendees: attendees.filter((attendee) => attendee.ticketTypeId === item.ticketTypeId).map(({ ticketTypeId, ...attendee }) => attendee) }));
      const response = await ticketingService.createCheckoutOrder({ eventId: selection.eventId, customerInfo, items, idempotencyKey: selection.idempotencyKey, ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}) });
      setPricing(response?.order || null);
      const paymentReference = response?.payment?.reference || "";
      if (!paymentReference) throw new Error("Checkout response did not include a payment reference");
      savePaymentReference(paymentReference);
      if (response?.payment?.free || response?.payment?.completed) {
        navigate(`${ROUTE_PATHS.PAYMENT_CONFIRMATION}?reference=${encodeURIComponent(paymentReference)}`);
        return;
      }
      const checkoutResult = await openPaystackCheckout(response?.payment?.accessCode);
      if (checkoutResult.status === PAYSTACK_CHECKOUT_RESULT.CANCELLED) {
        setCheckoutNotice({ tone: "warning", message: "Payment was cancelled. Your ticket has not been issued, and you can try again when ready." });
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

  if (!selection) return <PageContainer className="py-8 sm:py-12"><div className="mx-auto max-w-4xl"><Card><EmptyState title="No tickets selected" message="Choose tickets from an event page before checking out." /><div className="mt-5"><Button as={Link} to={ROUTE_PATHS.HOME} variant="secondary">Back to discovery</Button></div></Card></div></PageContainer>;

  return <PageContainer className="py-6 sm:py-10"><div className="mx-auto max-w-4xl space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-300">Checkout</p><h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Complete your order</h1><p className="mt-2 text-sm text-slate-400">Review your tickets and continue securely to payment.</p></div>
    <form onSubmit={submitCheckout} className="space-y-5">
      <Card className="border-slate-800/70 bg-slate-900/80 p-4 sm:p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-white">Coupon code</h2><p className="mt-1 text-sm text-slate-400">Optional. Discounts are calculated by the server and rechecked at checkout.</p></div>{couponCode ? <Button type="button" variant="ghost" size="sm" onClick={clearCoupon}><X className="h-4 w-4" />Remove</Button> : null}</div><div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start"><Input label="Coupon code" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="Optional coupon" autoComplete="off" maxLength={40} /><div className="min-h-10 pt-1 text-sm sm:min-w-44 sm:pt-8" role={couponState.status === "invalid" ? "alert" : "status"}>{couponState.status === "loading" ? <span className="text-slate-400">Checking...</span> : null}{couponState.status === "valid" ? <span className="text-emerald-300">{couponState.message}</span> : null}{couponState.status === "invalid" ? <span className="text-rose-300">{couponState.message}</span> : null}</div></div></Card>
      <Card className="border-slate-800/70 bg-slate-900/80 p-4 sm:p-5"><div className="flex items-center justify-between gap-4"><h2 className="font-semibold text-white">Order summary</h2><span className="text-xs text-slate-500">{attendees.length} ticket{attendees.length === 1 ? "" : "s"}</span></div><div className="mt-4 space-y-2">{selection.items.map((item) => <div key={item.ticketTypeId} className="flex items-center justify-between gap-4 text-sm"><span className="text-slate-300">{item.name} × {item.quantity}</span><span className="font-medium text-white">{formatMoney(Number(item.price) * Number(item.quantity), item.currency)}</span></div>)}<div className="flex items-center justify-between border-t border-slate-800 pt-3 text-sm"><span className="text-slate-400">Original subtotal</span><span className="font-semibold text-white">{formatMoney(displayedPricing.originalSubtotal ?? total, currency)}</span></div>{Number(displayedPricing.discountAmount || 0) > 0 ? <div className="flex items-center justify-between text-sm"><span className="text-emerald-300">Coupon discount</span><span className="font-semibold text-emerald-300">-{formatMoney(displayedPricing.discountAmount, currency)}</span></div> : null}<div className="flex items-center justify-between border-t border-slate-800 pt-3"><span className="text-slate-300">Final payable</span><span className="text-xl font-semibold text-white">{formatMoney(displayedPricing.customerPayableAmount ?? total, currency)}</span></div></div></Card>
      <Card className="border-slate-800/70 bg-slate-900/80 p-4 sm:p-5"><h2 className="font-semibold text-white">Buyer details</h2><p className="mt-1 text-sm text-slate-400">Your saved details are pre-filled. Phone is optional.</p><div className="mt-4 grid gap-4 md:grid-cols-3"><Input label="Name" autoComplete="name" required error={customerErrors.name} value={customerInfo.name} onChange={(event) => updateCustomerField("name", event.target.value)} /><Input label="Email" type="email" autoComplete="email" required error={customerErrors.email} value={customerInfo.email} onChange={(event) => updateCustomerField("email", event.target.value)} /><Input label="Phone" type="tel" autoComplete="tel" helperText="Optional" error={customerErrors.phone} value={customerInfo.phone} onChange={(event) => updateCustomerField("phone", event.target.value)} /></div></Card>
      <Card className="border-slate-800/70 bg-slate-900/80 p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-center gap-2"><Ticket className="h-4 w-4 text-app-300" /><h2 className="font-semibold text-white">Ticket recipients</h2></div><Button type="button" variant="secondary" size="sm" onClick={applyBuyerDetails}>Use buyer details for all</Button></div><p className="mt-1 text-sm text-slate-400">Recipient email is required. Phone is optional and defaults to the buyer when available.</p><div className="mt-4 grid gap-3">{attendees.map((attendee, index) => { const fields = <div className="grid gap-3 p-3 sm:grid-cols-3"><Input label={`Recipient ${index + 1} name`} autoComplete="name" required error={attendeeErrors[index]?.name} value={attendee.name} onChange={(event) => updateAttendee(index, "name", event.target.value)} /><Input label="Email" type="email" autoComplete="email" required error={attendeeErrors[index]?.email} value={attendee.email} onChange={(event) => updateAttendee(index, "email", event.target.value)} /><Input label="Phone" type="tel" autoComplete="tel" helperText="Optional" error={attendeeErrors[index]?.phone} value={attendee.phone} onChange={(event) => updateAttendee(index, "phone", event.target.value)} /></div>; return attendees.length > 3 ? <details key={`${attendee.ticketTypeId}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/50" open={index === 0}><summary className="cursor-pointer list-none px-3 py-3 text-sm font-medium text-white">Recipient {index + 1} · {attendee.email || "Email required"}</summary>{fields}</details> : <div key={`${attendee.ticketTypeId}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/50">{fields}</div>; })}</div></Card>
      <div className="flex items-start gap-3 rounded-xl border border-app-400/20 bg-app-500/5 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-app-300" aria-hidden="true" /><div><p className="text-sm font-semibold text-white">Secure payment</p><p className="mt-1 text-sm leading-6 text-slate-400">Paystack securely handles payment methods. We never collect your card details.</p></div></div>{checkoutNotice ? <div role={checkoutNotice.tone === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${checkoutNotice.tone === "error" ? "border-rose-400/25 bg-rose-500/10 text-rose-100" : "border-amber-400/25 bg-amber-500/10 text-amber-100"}`}><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><span>{checkoutNotice.message}</span></div> : null}<Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Opening secure checkout..."><CreditCard className="h-4 w-4" />Pay securely with Paystack</Button>
    </form>
  </div></PageContainer>;
}

export default CheckoutPageRedesigned;
