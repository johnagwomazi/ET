import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Ban, Check, Plus, RefreshCw, TicketPercent } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import SearchInput from "../../components/dashboard/SearchInput";
import SectionHeader from "../../components/dashboard/SectionHeader";
import StatusBadge from "../../components/dashboard/StatusBadge";
import ErrorState from "../../components/common/ErrorState";
import * as couponService from "../../services/coupon.service";
import * as eventService from "../../services/event.service";
import * as organizationService from "../../services/organization.service";
import * as ticketingService from "../../services/ticketing.service";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatDateTime, formatMoney } from "../../utils/formatters";

const EMPTY_FORM = { code: "", discountPercent: "10", startsAt: "", endsAt: "", maxRedemptions: "", maxRedemptionsPerCustomer: "" };
const idOf = (value) => value?.id || value?._id || "";
const customerName = (value) => `${value?.firstName || ""} ${value?.lastName || ""}`.trim() || value?.email || "Customer";

function TicketPicker({ ticketTypes, selectedIds, allSelected, onAll, onToggle, loading }) {
  if (loading) return <p className="text-sm text-slate-400">Loading ticket categories...</p>;
  if (!ticketTypes.length) return <p className="text-sm text-slate-400">No ticket categories are available for this event.</p>;
  return <div className="space-y-3"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-slate-200">Ticket categories</p><p className="text-xs text-slate-500">Discount all categories or select specific prices.</p></div><button type="button" onClick={onAll} className="text-xs font-semibold text-app-300">{allSelected ? "All selected" : "Select all"}</button></div><div className="grid gap-2 sm:grid-cols-2">{ticketTypes.map((ticket) => { const selected = allSelected || selectedIds.includes(idOf(ticket)); return <button type="button" key={idOf(ticket)} onClick={() => onToggle(idOf(ticket))} className={`flex items-center justify-between rounded-xl border p-3 text-left ${selected ? "border-app-400/60 bg-app-500/10" : "border-slate-800 bg-slate-900/60"}`}><span><span className="block font-medium text-white">{ticket.name}</span><span className="text-xs text-slate-400">{formatMoney(ticket.price, ticket.currency || "NGN")}</span></span>{selected ? <Check className="h-4 w-4 text-app-300" /> : null}</button>; })}</div></div>;
}

function CouponFields({ form, update }) {
  return <div className="grid gap-4 sm:grid-cols-2"><Input label="Custom code (optional)" value={form.code} onChange={(event) => update("code", event.target.value.toUpperCase())} placeholder="Generated if blank" helperText="Leave blank for a secure generated code." /><Input label="Discount percentage" type="number" min="1" max="100" step="0.01" required value={form.discountPercent} onChange={(event) => update("discountPercent", event.target.value)} /><Input label="Starts at (optional)" type="datetime-local" value={form.startsAt} onChange={(event) => update("startsAt", event.target.value)} /><Input label="Expires at (optional)" type="datetime-local" value={form.endsAt} onChange={(event) => update("endsAt", event.target.value)} /><Input label="Total redemption limit (optional)" type="number" min="1" value={form.maxRedemptions} onChange={(event) => update("maxRedemptions", event.target.value)} helperText="Maximum uses across customers." /><Input label="Per-customer limit (optional)" type="number" min="1" value={form.maxRedemptionsPerCustomer} onChange={(event) => update("maxRedemptionsPerCustomer", event.target.value)} helperText="Maximum uses per customer." /></div>;
}

function Creator({ eventId, event, ticketTypes, loadingTickets, onCreated }) {
  const [type, setType] = useState("public");
  const [form, setForm] = useState(EMPTY_FORM);
  const [allTickets, setAllTickets] = useState(true);
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [saving, setSaving] = useState(false);
  const query = useDebouncedValue(customerSearch, 250);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const selectedCount = useMemo(() => allTickets ? ticketTypes.length : selectedTicketIds.length, [allTickets, selectedTicketIds.length, ticketTypes.length]);

  useEffect(() => {
    if (type !== "private" || !query.trim()) { setCustomers([]); return undefined; }
    let active = true; setLoadingCustomers(true); setCustomerError("");
    organizationService.getOrganizationMembers({ role: "CUSTOMER", search: query, page: 1, limit: 20 }).then((result) => { if (active) setCustomers(result?.members || []); }).catch((error) => { if (active) { setCustomers([]); setCustomerError(error.message || "Customers could not be loaded"); } }).finally(() => { if (active) setLoadingCustomers(false); });
    return () => { active = false; };
  }, [type, query]);

  function toggleTicket(id) { if (allTickets) { setAllTickets(false); setSelectedTicketIds(ticketTypes.map(idOf).filter((ticketId) => ticketId !== id)); return; } setSelectedTicketIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function toggleCustomer(customer) { setSelectedCustomers((current) => current.some((item) => idOf(item) === idOf(customer)) ? current.filter((item) => idOf(item) !== idOf(customer)) : [...current, customer]); }

  async function submit(formEvent) {
    formEvent.preventDefault();
    if (type === "private" && !selectedCustomers.length) return toast.error("Select at least one customer");
    if (!allTickets && !selectedTicketIds.length) return toast.error("Select at least one ticket category or choose all");
    setSaving(true);
    try {
      await couponService.createOrganizationCoupon({ fundingType: "ORGANIZER_FUNDED", eventId, discountPercent: Number(form.discountPercent), ...(form.code.trim() ? { code: form.code.trim() } : {}), ...(!allTickets ? { ticketTypeIds: selectedTicketIds } : {}), ...(type === "private" ? { customerIds: selectedCustomers.map(idOf) } : {}), ...(form.startsAt ? { startsAt: new Date(form.startsAt).toISOString() } : {}), ...(form.endsAt ? { endsAt: new Date(form.endsAt).toISOString() } : {}), ...(form.maxRedemptions ? { maxRedemptions: Number(form.maxRedemptions) } : {}), ...(form.maxRedemptionsPerCustomer ? { maxRedemptionsPerCustomer: Number(form.maxRedemptionsPerCustomer) } : {}) });
      toast.success("Organizer coupon created"); onCreated();
    } catch (error) { toast.error(error.message || "Coupon could not be created"); } finally { setSaving(false); }
  }

  return <Card className="border-app-400/20 bg-app-500/5"><div className="border-b border-slate-800/70 pb-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-300">New organizer-funded promotion</p><h2 className="mt-1 text-lg font-semibold text-white">Create coupon for {event?.eventName || "this event"}</h2><p className="mt-1 text-sm text-amber-100/80">Organizer-funded discounts reduce eligible organizer revenue.</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setType("public")} className={`rounded-2xl border p-4 text-left ${type === "public" ? "border-app-400/60 bg-app-500/10" : "border-slate-800 bg-slate-950/50"}`}><p className="font-semibold text-white">Public Event Discount</p><p className="mt-1 text-sm text-slate-400">Anyone who meets the event and usage rules can redeem it.</p></button><button type="button" onClick={() => setType("private")} className={`rounded-2xl border p-4 text-left ${type === "private" ? "border-app-400/60 bg-app-500/10" : "border-slate-800 bg-slate-950/50"}`}><p className="font-semibold text-white">Private Customer Giveaway</p><p className="mt-1 text-sm text-slate-400">Only selected customers can redeem it.</p></button></div><form className="mt-5 space-y-5" onSubmit={submit}><TicketPicker ticketTypes={ticketTypes} selectedIds={selectedTicketIds} allSelected={allTickets} onAll={() => { setAllTickets(true); setSelectedTicketIds([]); }} onToggle={toggleTicket} loading={loadingTickets} />{type === "private" ? <div className="space-y-3"><SearchInput label="Search organization customers" value={customerSearch} onChange={(inputEvent) => setCustomerSearch(inputEvent.target.value)} placeholder="Search by name or email" />{customerError ? <p role="alert" className="text-sm text-rose-300">{customerError}</p> : null}<div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-2">{loadingCustomers ? <p className="p-3 text-sm text-slate-400">Searching customers...</p> : null}{!loadingCustomers && !customerError && customerSearch.trim() && !customers.length ? <p className="p-3 text-sm text-slate-400">No organization customers found.</p> : null}{customers.map((customer) => { const selected = selectedCustomers.some((item) => idOf(item) === idOf(customer)); return <button type="button" key={idOf(customer)} onClick={() => toggleCustomer(customer)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${selected ? "border-app-400/60 bg-app-500/10" : "border-slate-800 bg-slate-900/60"}`}><span><span className="block font-medium text-white">{customerName(customer)}</span><span className="block text-xs text-slate-400">{customer.email}</span></span>{selected ? <Check className="h-4 w-4 text-app-300" /> : null}</button>; })}</div></div> : null}<CouponFields form={form} update={update} /><div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-300">Preview</p><p className="mt-2 text-lg font-semibold text-white">{form.discountPercent || 0}% off {event?.eventName || "this event"}</p><p className="mt-1 text-sm text-slate-400">Applies to {selectedCount} ticket categor{selectedCount === 1 ? "y" : "ies"}. {form.maxRedemptions ? `Up to ${form.maxRedemptions} total redemptions.` : "No total redemption limit."}</p></div><Button type="submit" isLoading={saving} loadingText="Creating...">Create coupon</Button></form></Card>;
}

export default function OrganizerCouponManagementPage() {
  const [params] = useSearchParams();
  const eventId = params.get("eventId") || "";
  const [event, setEvent] = useState(null); const [ticketTypes, setTicketTypes] = useState([]); const [loadingEvent, setLoadingEvent] = useState(true); const [loadingTickets, setLoadingTickets] = useState(false); const [error, setError] = useState(""); const [coupons, setCoupons] = useState([]); const [loadingCoupons, setLoadingCoupons] = useState(true); const [showCreator, setShowCreator] = useState(Boolean(eventId));
  async function loadCoupons() { setLoadingCoupons(true); try { const result = await couponService.listOrganizationCoupons({ limit: 100 }); setCoupons(result?.coupons || []); } catch (loadError) { setError(loadError.message || "Coupons could not be loaded"); } finally { setLoadingCoupons(false); } }
  useEffect(() => { loadCoupons(); }, []);
  useEffect(() => { if (!eventId) { setLoadingEvent(false); return undefined; } let active = true; eventService.getOrganizationEventById(eventId).then((result) => { if (active) setEvent(result?.event || null); }).catch((loadError) => { if (active) setError(loadError.message || "Event could not be loaded"); }).finally(() => { if (active) setLoadingEvent(false); }); setLoadingTickets(true); ticketingService.getOrganizationEventTicketTypes(eventId).then((result) => { if (active) setTicketTypes(result?.ticketTypes || []); }).catch((loadError) => { if (active) setError(loadError.message || "Ticket categories could not be loaded"); }).finally(() => { if (active) setLoadingTickets(false); }); return () => { active = false; }; }, [eventId]);
  async function disableCoupon(coupon) { try { await couponService.disableOrganizationCoupon(coupon.id); toast.success("Coupon disabled"); await loadCoupons(); } catch (loadError) { toast.error(loadError.message || "Coupon could not be disabled"); } }
  return <div className="space-y-5"><SectionHeader eyebrow="Event promotions" title="Organizer Coupons" description="Create promotions for your own events. Organizer-funded discounts reduce eligible organizer revenue." actions={[{ label: "Refresh", icon: RefreshCw, variant: "secondary", onClick: loadCoupons, isLoading: loadingCoupons }, { label: "Create coupon", icon: Plus, onClick: () => setShowCreator(true) }]} />{error ? <ErrorState title="Coupons unavailable" message={error} onRetry={loadCoupons} /> : null}{showCreator && eventId && !loadingEvent && event ? <Creator eventId={eventId} event={event} ticketTypes={ticketTypes} loadingTickets={loadingTickets} onCreated={async () => { setShowCreator(false); await loadCoupons(); }} /> : null}{showCreator && !eventId ? <Card><p className="text-sm text-slate-400">Open an event and choose Create Coupon to start with its ticket categories.</p></Card> : null}{!loadingCoupons && !coupons.length ? <Card><p className="text-sm text-slate-400">No coupons have been created yet.</p></Card> : null}<div className="grid gap-4 lg:grid-cols-2">{coupons.map((coupon) => <Card key={coupon.id} className="border-slate-800/70 bg-slate-950/85"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><TicketPercent className="h-4 w-4 text-app-300" /><p className="font-semibold text-white">{coupon.code}</p></div><p className="mt-2 text-2xl font-semibold text-white">{coupon.discountPercent}% off</p></div><StatusBadge status={coupon.status} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-500">Redemptions</p><p className="font-semibold text-white">{coupon.redemptionCount || 0}{coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ""}</p></div><div><p className="text-slate-500">Expires</p><p className="font-semibold text-white">{coupon.endsAt ? formatDateTime(coupon.endsAt) : "No expiry"}</p></div><div><p className="text-slate-500">Funding</p><p className="font-semibold text-amber-200">Organizer-funded</p></div><div><p className="text-slate-500">Scope</p><p className="font-semibold text-white">{coupon.event ? "Event" : "Organization"}</p></div></div><div className="mt-4">{coupon.status === "ACTIVE" ? <Button variant="secondary" size="sm" onClick={() => disableCoupon(coupon)}><Ban className="h-4 w-4" /> Disable</Button> : null}</div></Card>)}</div></div>;
}
