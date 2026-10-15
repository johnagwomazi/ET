import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Ban, Plus, RefreshCw, TicketPercent } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import SectionHeader from "../../components/dashboard/SectionHeader";
import StatusBadge from "../../components/dashboard/StatusBadge";
import ErrorState from "../../components/common/ErrorState";
import * as couponService from "../../services/coupon.service";
import { formatDateTime, formatMoney } from "../../utils/formatters";

const EMPTY_FORM = {
  code: "", discountPercent: "10", eventId: "", ticketTypeIds: "", customerIds: "",
  startsAt: "", endsAt: "", maxRedemptions: "", maxRedemptionsPerCustomer: "", qualifyingTicketCount: "",
};

function splitIds(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function CouponManagementPage({ mode = "organization" }) {
  const platform = mode === "platform";
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);

  async function loadCoupons() {
    setIsLoading(true);
    setError("");
    try {
      const result = platform ? await couponService.listPlatformCoupons({ limit: 100 }) : await couponService.listOrganizationCoupons({ limit: 100 });
      setCoupons(result?.coupons || []);
    } catch (loadError) {
      setError(loadError.message || "Coupons could not be loaded");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadCoupons(); }, [platform]);

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }

  async function createCoupon(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        fundingType: platform ? "PLATFORM_FUNDED" : "ORGANIZER_FUNDED",
        discountPercent: Number(form.discountPercent),
        ...(form.code.trim() ? { code: form.code.trim() } : {}),
        ...(form.eventId.trim() ? { eventId: form.eventId.trim() } : {}),
        ...(splitIds(form.ticketTypeIds).length ? { ticketTypeIds: splitIds(form.ticketTypeIds) } : {}),
        ...(splitIds(form.customerIds).length ? { customerIds: splitIds(form.customerIds) } : {}),
        ...(form.startsAt ? { startsAt: new Date(form.startsAt).toISOString() } : {}),
        ...(form.endsAt ? { endsAt: new Date(form.endsAt).toISOString() } : {}),
        ...(form.maxRedemptions ? { maxRedemptions: Number(form.maxRedemptions) } : {}),
        ...(form.maxRedemptionsPerCustomer ? { maxRedemptionsPerCustomer: Number(form.maxRedemptionsPerCustomer) } : {}),
        ...(form.qualifyingTicketCount ? { rewardRule: { qualifyingTicketCount: Number(form.qualifyingTicketCount), nextPurchaseOnly: true } } : {}),
      };
      if (platform) await couponService.createPlatformCoupon(payload);
      else await couponService.createOrganizationCoupon(payload);
      toast.success("Coupon created");
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadCoupons();
    } catch (saveError) {
      toast.error(saveError.message || "Coupon could not be created");
    } finally {
      setIsSaving(false);
    }
  }

  async function disableCoupon(coupon) {
    try {
      if (platform) await couponService.disablePlatformCoupon(coupon.id);
      else await couponService.disableOrganizationCoupon(coupon.id);
      toast.success("Coupon disabled");
      await loadCoupons();
    } catch (disableError) {
      toast.error(disableError.message || "Coupon could not be disabled");
    }
  }

  async function viewCoupon(coupon) {
    try {
      const result = platform
        ? await couponService.getPlatformCoupon(coupon.id)
        : await couponService.getOrganizationCoupon(coupon.id);
      setSelectedCoupon(result?.coupon || coupon);
    } catch (viewError) {
      toast.error(viewError.message || "Coupon details could not be loaded");
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow={platform ? "Eventidor promotions" : "Event promotions"}
        title={platform ? "Platform Coupons" : "Organizer Coupons"}
        description={platform ? "Create and monitor promotions funded by Eventidor." : "Create promotions for your events. Organizer-funded discounts reduce eligible organizer revenue."}
        actions={[
          { label: "Refresh", icon: RefreshCw, variant: "secondary", onClick: loadCoupons, isLoading },
          { label: "New coupon", icon: Plus, onClick: () => setShowForm((value) => !value) },
        ]}
      />

      {showForm ? (
        <Card className="border-slate-800/70 bg-slate-950/85">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={createCoupon}>
            <Input label="Custom code (optional)" value={form.code} onChange={(event) => update("code", event.target.value)} placeholder="Generated if blank" />
            <Input label="Discount percentage" type="number" min="1" max="100" step="0.01" required value={form.discountPercent} onChange={(event) => update("discountPercent", event.target.value)} />
            <Input label="Event ID (optional)" value={form.eventId} onChange={(event) => update("eventId", event.target.value)} placeholder="Restrict to one event" />
            <Input label="Ticket type IDs (comma-separated)" value={form.ticketTypeIds} onChange={(event) => update("ticketTypeIds", event.target.value)} />
            {platform ? <Input label="Customer IDs (comma-separated)" value={form.customerIds} onChange={(event) => update("customerIds", event.target.value)} /> : null}
            <Input label="Starts at" type="datetime-local" value={form.startsAt} onChange={(event) => update("startsAt", event.target.value)} />
            <Input label="Ends at" type="datetime-local" value={form.endsAt} onChange={(event) => update("endsAt", event.target.value)} />
            <Input label="Total redemption limit" type="number" min="1" value={form.maxRedemptions} onChange={(event) => update("maxRedemptions", event.target.value)} />
            <Input label="Per-customer limit" type="number" min="1" value={form.maxRedemptionsPerCustomer} onChange={(event) => update("maxRedemptionsPerCustomer", event.target.value)} />
            {platform ? <Input label="Reward threshold (tickets, optional)" type="number" min="1" value={form.qualifyingTicketCount} onChange={(event) => update("qualifyingTicketCount", event.target.value)} /> : null}
            <div className="flex items-end gap-3 md:col-span-2">
              <Button type="submit" isLoading={isSaving} loadingText="Creating...">Create coupon</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {error ? <ErrorState title="Coupons unavailable" message={error} onRetry={loadCoupons} /> : null}
      {selectedCoupon ? (
        <Card className="border-app-400/20 bg-app-500/5">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs uppercase tracking-wider text-app-300">Coupon details</p><h2 className="mt-1 text-lg font-semibold text-white">{selectedCoupon.code}</h2></div>
            <Button size="sm" variant="secondary" onClick={() => setSelectedCoupon(null)}>Close</Button>
          </div>
          <p className="mt-3 text-sm text-slate-300">{selectedCoupon.discountPercent}% discount · {selectedCoupon.redemptionCount || 0} redemptions · {selectedCoupon.event ? `Event ${selectedCoupon.event}` : "Platform-wide"}</p>
          {selectedCoupon.rewardRule ? <p className="mt-2 text-sm text-app-100">Reward threshold: {selectedCoupon.rewardRule.qualifyingTicketCount} tickets.</p> : null}
        </Card>
      ) : null}
      {!error && !isLoading && coupons.length === 0 ? <Card><p className="text-sm text-slate-400">No coupons have been created yet.</p></Card> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {coupons.map((coupon) => (
          <Card key={coupon.id} className="border-slate-800/70 bg-slate-950/85">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><TicketPercent className="h-4 w-4 text-app-300" /><p className="font-semibold text-white">{coupon.code}</p></div>
                <p className="mt-2 text-2xl font-semibold text-white">{coupon.discountPercent}% off</p>
              </div>
              <StatusBadge status={coupon.status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-slate-500">Redemptions</p><p className="font-semibold text-white">{coupon.redemptionCount || 0}{coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ""}</p></div>
              <div><p className="text-slate-500">Expires</p><p className="font-semibold text-white">{coupon.endsAt ? formatDateTime(coupon.endsAt) : "No expiry"}</p></div>
              <div><p className="text-slate-500">Eventidor subsidy</p><p className="font-semibold text-emerald-300">{formatMoney(coupon.stats?.platformFundedDiscount || 0, "NGN")}</p></div>
              <div><p className="text-slate-500">Scope</p><p className="font-semibold text-white">{coupon.event ? "Event" : "Platform-wide"}</p></div>
            </div>
            {coupon.rewardRule ? <p className="mt-4 rounded-xl bg-app-500/10 p-3 text-sm text-app-100">Reward: buy {coupon.rewardRule.qualifyingTicketCount} tickets to earn this coupon for a next purchase.</p> : null}
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => viewCoupon(coupon)}>View details</Button>
              {coupon.status === "ACTIVE" ? <Button variant="secondary" size="sm" onClick={() => disableCoupon(coupon)}><Ban className="h-4 w-4" /> Disable</Button> : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default CouponManagementPage;
