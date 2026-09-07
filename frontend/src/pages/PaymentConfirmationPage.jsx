import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, CircleAlert, RefreshCw } from "lucide-react";
import AuthCard from "../components/layout/AuthCard";
import AuthHeader from "../components/layout/AuthHeader";
import Button from "../components/ui/Button";
import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import StatusBadge from "../components/dashboard/StatusBadge";
import { ROUTE_PATHS } from "../routes/routePaths";
import { formatMoney } from "../utils/formatters";
import * as ticketingService from "../services/ticketing.service";
import {
  clearCheckoutSelection,
  clearPaymentReference,
  loadPaymentReference,
} from "../utils/checkoutStorage";

function getVerificationErrorMessage(error) {
  if (error?.status === 429) return "Payment verification is temporarily limited. Wait a moment before trying again.";
  if (error?.status === 502 || error?.status === 503) return "The payment provider is not responding yet. Your payment has not been marked successful.";
  if (error?.status === 0) return "The server could not be reached. Check your connection before trying again.";
  return "Payment could not be verified. Your order has not been marked successful.";
}

function PaymentConfirmationPage() {
  const [searchParams] = useSearchParams();
  const [reference] = useState(() => searchParams.get("reference") || loadPaymentReference());
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function verify() {
      if (!reference) {
        setError("Payment reference is missing");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await ticketingService.verifyPayment(
          { reference },
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        setResult(response);
        if (response?.order?.paymentStatus === "PAID") {
          clearCheckoutSelection();
          clearPaymentReference();
        }
      } catch (verifyError) {
        if (!controller.signal.aborted) setError(getVerificationErrorMessage(verifyError));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    verify();

    return () => controller.abort();
  }, [reference, refreshKey]);

  if (isLoading) {
    return <LoadingState label="Verifying payment..." />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorState title="Payment not verified" message={error} onRetry={() => setRefreshKey((value) => value + 1)} />
        <div className="flex justify-center">
          <Button as={Link} to={ROUTE_PATHS.CUSTOMER_HISTORY} variant="secondary">View order history</Button>
        </div>
      </div>
    );
  }

  const order = result?.order;
  const isPaid = order?.paymentStatus === "PAID";
  const isPending = Boolean(result?.pending) || ["PENDING", "INITIALIZED"].includes(order?.paymentStatus);

  if (!isPaid) {
    return (
      <AuthCard>
        <AuthHeader
          eyebrow="Payment status"
          title={isPending ? "Payment processing" : "Payment not completed"}
          description={isPending
            ? "Paystack is still processing this payment. Your ticket inventory remains reserved."
            : "This payment was not completed and no ticket was issued."}
        />
        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-4" role="status">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
            <div>
              <p className="font-semibold text-amber-100">
                {isPending ? "Payment confirmation is still pending" : "No ticket was issued for this payment"}
              </p>
              <p className="mt-1 text-sm text-amber-100/80">
                {isPending
                  ? "Verify again shortly. Do not start another checkout while this payment is processing."
                  : "Check your order history before attempting another payment."}
              </p>
            </div>
            {order?.paymentStatus ? <StatusBadge status={order.paymentStatus} className="ml-auto" /> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setRefreshKey((value) => value + 1)}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Verify again
            </Button>
            <Button as={Link} to={ROUTE_PATHS.CUSTOMER_HISTORY} variant="secondary">View history</Button>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <AuthHeader eyebrow="Confirmation" title="Payment verified" description="Your order is confirmed and the tickets are now available." />
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
          <Button as={Link} to={ROUTE_PATHS.CUSTOMER_HISTORY} variant="secondary">History</Button>
        </div>
      </div>
    </AuthCard>
  );
}

export default PaymentConfirmationPage;
