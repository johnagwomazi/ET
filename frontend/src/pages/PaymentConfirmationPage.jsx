import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import AuthCard from "../components/layout/AuthCard";
import AuthHeader from "../components/layout/AuthHeader";
import Button from "../components/ui/Button";
import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import StatusBadge from "../components/dashboard/StatusBadge";
import { ROUTE_PATHS } from "../routes/routePaths";
import { formatMoney } from "../utils/formatters";
import * as ticketingService from "../services/ticketing.service";

function PaymentConfirmationPage() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") || sessionStorage.getItem("events_last_payment_reference") || "";
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function verify() {
      if (!reference) {
        setError("Payment reference is missing");
        setIsLoading(false);
        return;
      }

      try {
        const response = await ticketingService.verifyPayment({ reference });
        setResult(response);
      } catch (verifyError) {
        setError(verifyError.message || "Payment verification failed");
      } finally {
        setIsLoading(false);
      }
    }

    verify();
  }, [reference]);

  if (isLoading) {
    return <LoadingState label="Verifying payment..." />;
  }

  if (error) {
    return <ErrorState title="Payment not verified" message={error} />;
  }

  const order = result?.order;

  return (
    <AuthCard>
      <AuthHeader eyebrow="Confirmation" title="Payment verified" description="Your order was confirmed by the backend and tickets are now available." />
      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            <div>
              <p className="font-semibold text-white">{order?.reference}</p>
              <p className="text-sm text-slate-400">{formatMoney(order?.total, order?.currency)}</p>
            </div>
            <StatusBadge status={order?.paymentStatus} className="ml-auto" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button as={Link} to={ROUTE_PATHS.CUSTOMER_TICKETS}>View tickets</Button>
          <Button as={Link} to={ROUTE_PATHS.CUSTOMER_ORDERS} variant="secondary">Order history</Button>
        </div>
      </div>
    </AuthCard>
  );
}

export default PaymentConfirmationPage;
