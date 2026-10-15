import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Ban, Check, ChevronRight, Plus, RefreshCw, TicketPercent } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import SearchInput from "../../components/dashboard/SearchInput";
import SectionHeader from "../../components/dashboard/SectionHeader";
import StatusBadge from "../../components/dashboard/StatusBadge";
import ErrorState from "../../components/common/ErrorState";
import * as couponService from "../../services/coupon.service";
import * as publicEventService from "../../services/publicEvent.service";
import * as ticketingService from "../../services/ticketing.service";
import * as userService from "../../services/user.service";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatDateTime, formatMoney } from "../../utils/formatters";

const EMPTY_FORM = { code: "", discountPercent: "10", startsAt: "", endsAt: "", maxRedemptions: "", maxRedemptionsPerCustomer: "" };
const idOf = (value) => value?.id || value?._id || "";
const customerName = (value) => `${value?.firstName || ""} ${value?.lastName || ""}`.trim() || value?.email || "Unnamed customer";

function CouponFields({ form, update }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    <Input label="Custom code (optional)" value={form.code} onChange={(event) => update("code", event.target.value.toUpperCase())} placeholder="Generated if blank" helperText="Leave blank for a secure generated code." />
    <Input label="Discount percentage" type="number" min="1" max="100" step="0.01" required value={form.discountPercent} onChange={(event) => update("discountPercent", event.target.value)} helperText="Between 1% and 100%." />
    <Input label="Starts at (optional)" type="datetime-local" value={form.startsAt} onChange={(event) => update("startsAt", event.target.value)} />
    <Input label="Ends at (optional)" type="datetime-local" value={form.endsAt} onChange={(event) => update("endsAt", event.target.value)} />
    <Input label="Total redemption limit (optional)" type="number" min="1" value={form.maxRedemptions} onChange={(event) => update("maxRedemptions", event.target.value)} helperText="Maximum uses across all customers." />
    <Input label="Per-customer limit (optional)" type="number" min="1" value={form.maxRedemptionsPerCustomer} onChange={(event) => update("maxRedemptionsPerCustomer", event.target.value)} helperText="Maximum uses for each eligible customer." />
  </div>;
}

function EventPicker({ events, search, onSearch, selected, onSelect, loading }) {
  return <div className="space-y-3"><SearchInput label="Search eligible events" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search by event name, venue, or category" /><div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-2">{loading ? <p className="p-3 text-sm text-slate-400">Loading eligible events...</p> : null}{!loading && !events.length ? <p className="p-3 text-sm text-slate-400">No eligible events found.</p> : null}{events.map((event) => { const selectedEvent = idOf(event) === idOf(selected); return <button type="button" key={idOf(event)} onClick={() => onSelect(event)} className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left ${selectedEvent ? "border-app-400/60 bg-app-500/10" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"}`}><span className="min-w-0"><span className="block truncate font-semibold text-white">{event.eventName || "Untitled event"}</span><span className="mt-1 block truncate text-xs text-slate-400">{event.venue?.name || event.venue?.address?.city || event.category || "Eligible event"}</span></span>{selectedEvent ? <Check className="h-4 w-4 shrink-0 text-app-300" /> : null}</button>; })}</div></div>;
}

function TicketPicker({ ticketTypes, selectedIds, allSelected, onAll, onToggle, loading }) {
  if (loading) return <p className="text-sm text-slate-400">Loading ticket categories...</p>;
  if (!ticketTypes.length) return <p className="text-sm text-slate-400">No ticket categories are available for this event.</p>;
  return <div className="space-y-3"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-slate-200">Ticket categories</p><p className="text-xs text-slate-500">Choose all categories or only selected prices.</p></div><button type="button" onClick={onAll} className="text-xs font-semibold text-app-300">{allSelected ? "All selected" : "Select all"}</button></div><div className="grid gap-2 sm:grid-cols-2">{ticketTypes.map((ticket) => { const selected = allSelected || selectedIds.includes(idOf(ticket)); return <button type="button" key={idOf(ticket)} onClick={() => onToggle(idOf(ticket))} className={`flex items-center justify-between rounded-xl border p-3 text-left ${selected ? "border-app-400/60 bg-app-500/10" : "border-slate-800 bg-slate-900/60"}`}><span><span className="block font-medium text-white">{ticket.name}</span><span className="text-xs text-slate-400">{formatMoney(ticket.price, ticket.currency || "NGN")}</span></span>{selected ? <Check className="h-4 w-4 text-app-300" /> : null}</button>; })}</div></div>;
}

function CustomerPicker({ customers, search, onSearch, selected, onToggle, loading }) {
  return <div className="space-y-3"><SearchInput label="Search registered customers" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search by name or email" /><div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-2">{loading ? <p className="p-3 text-sm text-slate-400">Searching customers...</p> : null}{!loading && search.trim() && !customers.length ? <p className="p-3 text-sm text-slate-400">No customers found.</p> : null}{customers.map((customer) => { const chosen = selected.some((item) => idOf(item) === idOf(customer)); return <button type="button" key={idOf(customer)} onClick={() => onToggle(customer)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${chosen ? "border-app-400/60 bg-app-500/10" : "border-slate-800 bg-slate-900/60"}`}><span className="min-w-0"><span className="block truncate font-medium text-white">{customerName(customer)}</span><span className="block truncate text-xs text-slate-400">{customer.email}</span></span>{chosen ? <Check className="h-4 w-4 text-app-300" /> : null}</button>; })}</div>{selected.length ? <p className="text-xs text-app-200">{selected.length} customer{selected.length === 1 ? "" : "s"} selected.</p> : null}</div>;
}

function Creator({ onCreated }) {
  const [type, setType] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [eventSearch, setEventSearch] = useState("");
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);
  const [allTickets, setAllTickets] = useState(true);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [saving, setSaving] = useState(false);
  const eventQuery = useDebouncedValue(eventSearch, 250);
  const customerQuery = useDebouncedValue(customerSearch, 250);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const selectedTicketCount = useMemo(() => allTickets ? ticketTypes.length : selectedTicketIds.length, [allTickets, selectedTicketIds.length, ticketTypes.length]);

  useEffect(() => {
    if (!type || type === "platform") return undefined;
    let active = true; setLoadingEvents(true);
    publicEventService.discoverPublicEvents({ search: eventQuery || undefined, limit: 50, sort: "upcoming" }).then((result) => { if (active) setEvents(result?.events || []); }).catch(() => { if (active) setEvents([]); }).finally(() => { if (active) setLoadingEvents(false); });
    return () => { active = false; };
  }, [type, eventQuery]);

  useEffect(() => {
    if (!selectedEvent) { setTicketTypes([]); return undefined; }
    let active = true; setLoadingTickets(true);
    ticketingService.getPublicEventTicketTypes(idOf(selectedEvent)).then((result) => { if (active) setTicketTypes(result?.ticketTypes || []); }).catch(() => { if (active) setTicketTypes([]); }).finally(() => { if (active) setLoadingTickets(false); });
    return () => { active = false; };
  }, [selectedEvent]);

  useEffect(() => {
    if (type !== "private" || !customerQuery.trim()) { setCustomers([]); return undefined; }
    let active = true; setLoadingCustomers(true);
    userService.getUsers({ role: "CUSTOMER", search: customerQuery, page: 1, limit: 20 }).then((result) => { if (active) setCustomers(result?.users || []); }).catch(() => { if (active) setCustomers([]); }).finally(() => { if (active) setLoadingCustomers(false); });
    return () => { active = false; };
  }, [type, customerQuery]);

  function selectType(nextType) { setType(nextType); if (nextType === "platform") { setSelectedEvent(null); setSelectedCustomers([]); setSelectedTicketIds([]); setAllTickets(true); } }
  function selectEvent(event) { setSelectedEvent(event); setSelectedTicketIds([]); setAllTickets(true); }
  function toggleTicket(id) { if (allTickets) { setAllTickets(false); setSelectedTicketIds(ticketTypes.map(idOf).filter((ticketId) => ticketId !== id)); return; } setSelectedTicketIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function toggleCustomer(customer) { setSelectedCustomers((current) => current.some((item) => idOf(item) === idOf(customer)) ? current.filter((item) => idOf(item) !== idOf(customer)) : [...current, customer]); }

  async function submit(event) {
    event.preventDefault();
    if (type === "event" && !selectedEvent) return toast.error("Select an eligible event");
    if (type === "private" && !selectedCustomers.length) return toast.error("Select at least one customer");
    if (selectedEvent && !allTickets && !selectedTicketIds.length) return toast.error("Select at least one ticket category or choose all");
    setSaving(true);
    try {
      await couponService.createPlatformCoupon({ fundingType: "PLATFORM_FUNDED", discountPercent: Number(form.discountPercent), ...(form.code.trim() ? { code: form.code.trim() } : {}), ...(selectedEvent ? { eventId: idOf(selectedEvent) } : {}), ...(selectedEvent && !allTickets ? { ticketTypeIds: selectedTicketIds } : {}), ...(selectedCustomers.length ? { customerIds: selectedCustomers.map(idOf) } : {}), ...(form.startsAt ? { startsAt: new Date(form.startsAt).toISOString() } : {}), ...(form.endsAt ? { endsAt: new Date(form.endsAt).toISOString() } : {}), ...(form.maxRedemptions ? { maxRedemptions: Number(form.maxRedemptions) } : {}), ...(form.maxRedemptionsPerCustomer ? { maxRedemptionsPerCustomer: Number(form.maxRedemptionsPerCustomer) } : {}) });
      toast.success("Platform coupon created"); onCreated(); setType(""); setForm(EMPTY_FORM); setSelectedEvent(null); setSelectedCustomers([]); setSelectedTicketIds([]); setAllTickets(true);
    } catch (error) { toast.error(error.message || "Coupon could not be created"); } finally { setSaving(false); }
  }

  if (!type) return <div className="grid gap-3 md:grid-cols-3">{[["platform", "Platform-wide coupon", "Available across eligible events on Eventidor."], ["event", "Event coupon", "Choose an event and discount all or selected ticket categories."], ["private", "Private customer coupon", "Choose one or more registered customers for a private offer."]].map(([value, title, description]) => <button type="button" key={value} onClick={() => selectType(value)} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left transition hover:border-app-400/50 hover:bg-app-500/5"><div className="flex items-center gap-3"><div className="rounded-xl bg-app-500/10 p-2 text-app-300"><TicketPercent className="h-5 w-5" /></div><span className="font-semibold text-white">{title}</span></div><p className="mt-3 text-sm leading-6 text-slate-400">{description}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-app-300">Start setup <ChevronRight className="h-4 w-4" /></span></button>)}</div>;
  const title = type === "platform" ? "Platform-wide coupon" : type === "event" ? "Event coupon" : "Private customer coupon";
  return <Card className="border-app-400/20 bg-app-500/5"><div className="flex items-start justify-between gap-3 border-b border-slate-800/70 pb-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-300">New platform-funded promotion</p><h2 className="mt-1 text-lg font-semibold text-white">{title}</h2><p className="mt-1 text-sm text-slate-400">Eventidor funds this discount; organizer entitlement remains protected.</p></div><Button type="button" variant="ghost" size="sm" onClick={() => setType("")}>Change type</Button></div><form className="mt-5 space-y-5" onSubmit={submit}>{type !== "platform" ? <EventPicker events={events} search={eventSearch} onSearch={setEventSearch} selected={selectedEvent} onSelect={selectEvent} loading={loadingEvents} /> : null}{selectedEvent ? <div className="rounded-xl border border-app-400/20 bg-slate-950/50 p-3 text-sm text-slate-300"><span className="font-semibold text-white">Selected event:</span> {selectedEvent.eventName}</div> : null}{type === "private" ? <><CustomerPicker customers={customers} search={customerSearch} onSearch={setCustomerSearch} selected={selectedCustomers} onToggle={toggleCustomer} loading={loadingCustomers} /><div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-sm text-amber-100">Only selected customers can redeem this coupon.</div></> : null}{selectedEvent ? <TicketPicker ticketTypes={ticketTypes} selectedIds={selectedTicketIds} allSelected={allTickets} onAll={() => { setAllTickets(true); setSelectedTicketIds([]); }} onToggle={toggleTicket} loading={loadingTickets} /> : null}<CouponFields form={form} update={update} />{selectedEvent || type === "platform" ? <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-300">Preview</p><p className="mt-2 text-lg font-semibold text-white">{form.discountPercent || 0}% off {selectedEvent ? selectedEvent.eventName : "eligible Eventidor events"}</p><p className="mt-1 text-sm text-slate-400">{selectedEvent ? `Applies to ${selectedTicketCount || 0} ticket categor${selectedTicketCount === 1 ? "y" : "ies"}.` : "All eligible ticket categories."} {form.maxRedemptions ? `Up to ${form.maxRedemptions} total redemptions.` : "No total redemption limit."}</p></div> : null}<div className="flex flex-wrap gap-3"><Button type="submit" isLoading={saving} loadingText="Creating...">Create coupon</Button><Button type="button" variant="secondary" onClick={() => setType("")}>Cancel</Button></div></form></Card>;
}

export default function SuperAdminCouponManagementPage() {
  const [coupons, setCoupons] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [showCreator, setShowCreator] = useState(false); const [selectedCoupon, setSelectedCoupon] = useState(null);
  async function loadCoupons() { setLoading(true); setError(""); try { const result = await couponService.listPlatformCoupons({ limit: 100 }); setCoupons(result?.coupons || []); } catch (loadError) { setError(loadError.message || "Coupons could not be loaded"); } finally { setLoading(false); } }
  useEffect(() => { loadCoupons(); }, []);
  async function disableCoupon(coupon) { try { await couponService.disablePlatformCoupon(coupon.id); toast.success("Coupon disabled"); await loadCoupons(); } catch (error) { toast.error(error.message || "Coupon could not be disabled"); } }
  async function viewCoupon(coupon) { try { const result = await couponService.getPlatformCoupon(coupon.id); setSelectedCoupon(result?.coupon || coupon); } catch (error) { toast.error(error.message || "Coupon details could not be loaded"); } }
  return <div className="space-y-5"><SectionHeader eyebrow="Eventidor promotions" title="Platform Coupons" description="Create and monitor promotions funded by Eventidor." actions={[{ label: "Refresh", icon: RefreshCw, variant: "secondary", onClick: loadCoupons, isLoading: loading }, { label: "New coupon", icon: Plus, onClick: () => setShowCreator((value) => !value) }]} />{showCreator ? <Creator onCreated={async () => { setShowCreator(false); await loadCoupons(); }} /> : null}{error ? <ErrorState title="Coupons unavailable" message={error} onRetry={loadCoupons} /> : null}{selectedCoupon ? <Card className="border-app-400/20 bg-app-500/5"><div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-wider text-app-300">Coupon details</p><h2 className="mt-1 text-lg font-semibold text-white">{selectedCoupon.code}</h2></div><Button size="sm" variant="secondary" onClick={() => setSelectedCoupon(null)}>Close</Button></div><p className="mt-3 text-sm text-slate-300">{selectedCoupon.discountPercent}% discount · {selectedCoupon.redemptionCount || 0} redemptions · {selectedCoupon.event ? `Event ${selectedCoupon.event}` : "Platform-wide"}</p></Card> : null}{!error && !loading && !coupons.length ? <Card><p className="text-sm text-slate-400">No coupons have been created yet.</p></Card> : null}<div className="grid gap-4 lg:grid-cols-2">{coupons.map((coupon) => <Card key={coupon.id} className="border-slate-800/70 bg-slate-950/85"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><TicketPercent className="h-4 w-4 text-app-300" /><p className="font-semibold text-white">{coupon.code}</p></div><p className="mt-2 text-2xl font-semibold text-white">{coupon.discountPercent}% off</p></div><StatusBadge status={coupon.status} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-500">Redemptions</p><p className="font-semibold text-white">{coupon.redemptionCount || 0}{coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ""}</p></div><div><p className="text-slate-500">Expires</p><p className="font-semibold text-white">{coupon.endsAt ? formatDateTime(coupon.endsAt) : "No expiry"}</p></div><div><p className="text-slate-500">Eventidor subsidy</p><p className="font-semibold text-emerald-300">{formatMoney(coupon.stats?.platformFundedDiscount || 0, "NGN")}</p></div><div><p className="text-slate-500">Scope</p><p className="font-semibold text-white">{coupon.event ? "Event" : "Platform-wide"}</p></div></div><div className="mt-4 flex gap-2"><Button variant="secondary" size="sm" onClick={() => viewCoupon(coupon)}>View details</Button>{coupon.status === "ACTIVE" ? <Button variant="secondary" size="sm" onClick={() => disableCoupon(coupon)}><Ban className="h-4 w-4" /> Disable</Button> : null}</div></Card>)}</div></div>;
}
