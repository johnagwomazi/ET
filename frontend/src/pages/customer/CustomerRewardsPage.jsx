import { useEffect, useState } from "react";
import { Gift, TicketPercent } from "lucide-react";
import Card from "../../components/ui/Card";
import SectionHeader from "../../components/dashboard/SectionHeader";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import Button from "../../components/ui/Button";
import * as couponService from "../../services/coupon.service";
import { formatDateTime } from "../../utils/formatters";

function CustomerRewardsPage() {
  const [rewards, setRewards] = useState([]);
  const [error, setError] = useState("");

  async function loadRewards() {
    setError("");
    try {
      const result = await couponService.listCustomerRewards();
      setRewards((result?.rewards || []).filter((reward) => reward.status === "ISSUED"));
    } catch (loadError) {
      setError(loadError.message || "Rewards could not be loaded");
    }
  }

  useEffect(() => { loadRewards(); }, []);

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Customer rewards" title="Earned coupons" description="Coupons earned from qualifying purchases are available for your next eligible checkout." actions={[{ label: "Refresh", onClick: loadRewards }]} />
      {error ? <ErrorState title="Rewards unavailable" message={error} onRetry={loadRewards} /> : null}
      {!error && rewards.length === 0 ? <EmptyState title="No earned coupons yet" message="Complete qualifying ticket purchases to unlock rewards." /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {rewards.map((reward) => (
          <Card key={reward.id} className="border-slate-800/70 bg-slate-950/85">
            <div className="flex items-start gap-3"><div className="rounded-xl bg-app-500/10 p-2 text-app-300"><Gift className="h-5 w-5" /></div><div><p className="text-xs uppercase tracking-wider text-app-300">Reward coupon</p><p className="mt-1 text-xl font-semibold text-white">{reward.coupon?.code}</p></div></div>
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-300"><TicketPercent className="h-4 w-4 text-app-300" />{reward.coupon?.discountPercent}% off</p>
            <p className="mt-2 text-xs text-slate-500">Earned {formatDateTime(reward.issuedAt)} · Valid on your next eligible purchase</p>
            <Button className="mt-4" size="sm" onClick={() => navigator.clipboard?.writeText(reward.coupon?.code || "")}>Copy code</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default CustomerRewardsPage;
