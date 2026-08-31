import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Minus, Plus, Ticket } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import { Skeleton } from "../common/Skeleton";
import { ROUTE_PATHS } from "../../routes/routePaths";
import { useSessionStore } from "../../store/useSessionStore";
import { formatDateTime, formatMoney } from "../../utils/formatters";
import { saveCheckoutSelection } from "../../pages/CheckoutPage";
import * as ticketingService from "../../services/ticketing.service";

function isPurchasable(ticketType) {
  return ticketType?.status === "ACTIVE" && Number(ticketType.remainingQuantity || 0) > 0;
}

function PublicTicketSelectionPanel({ event }) {
  const navigate = useNavigate();
  const currentUser = useSessionStore((state) => state.currentUser);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTicketTypes() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await ticketingService.getPublicEventTicketTypes(event.id);
        setTicketTypes(response?.ticketTypes || []);
      } catch (loadError) {
        setError(loadError.message || "Unable to load tickets");
      } finally {
        setIsLoading(false);
      }
    }

    if (event?.id) {
      loadTicketTypes();
    }
  }, [event?.id]);

  const selectedItems = useMemo(
    () => ticketTypes
      .map((ticketType) => ({ ...ticketType, quantity: Number(quantities[ticketType.id] || 0) }))
      .filter((ticketType) => ticketType.quantity > 0),
    [quantities, ticketTypes]
  );
  const total = selectedItems.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0);
  const currency = selectedItems[0]?.currency || ticketTypes[0]?.currency || "NGN";

  function updateQuantity(ticketType, nextQuantity) {
    const max = Math.min(Number(ticketType.remainingQuantity || 0), Number(ticketType.maxPerOrder || 1));
    const quantity = Math.max(0, Math.min(max, nextQuantity));
    setQuantities((current) => ({ ...current, [ticketType.id]: quantity }));
  }

  function continueToCheckout() {
    if (!isAuthenticated || currentUser?.role !== "CUSTOMER") {
      toast.error("Log in as a customer to buy tickets");
      navigate(ROUTE_PATHS.LOGIN);
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("Select at least one ticket");
      return;
    }

    saveCheckoutSelection({
      eventId: event.id,
      eventName: event.eventName,
      idempotencyKey: `checkout-${event.id}-${Date.now()}`,
      items: selectedItems.map((item) => ({
        ticketTypeId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        currency: item.currency,
      })),
    });
    navigate(ROUTE_PATHS.CHECKOUT);
  }

  return (
    <Card className="space-y-5 border-slate-800/70 bg-slate-950/85">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[rgba(52,92,255,0.18)] p-2 text-app-300 ring-1 ring-app-500/20">
          <Ticket className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-app-300">Tickets</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Select tickets</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}</div>
      ) : error ? (
        <ErrorState title="Tickets unavailable" message={error} />
      ) : ticketTypes.length === 0 ? (
        <EmptyState title="No tickets available" message="Ticket sales are not available for this event yet." />
      ) : (
        <div className="space-y-3">
          {ticketTypes.map((ticketType) => {
            const quantity = Number(quantities[ticketType.id] || 0);
            const purchasable = isPurchasable(ticketType);

            return (
              <div key={ticketType.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-white">{ticketType.name}</p>
                    <p className="text-sm text-slate-400">{ticketType.description || "General admission ticket"}</p>
                    <p className="text-sm font-semibold text-white">{formatMoney(ticketType.price, ticketType.currency)}</p>
                    <p className="text-xs text-slate-500">
                      {purchasable ? `${ticketType.remainingQuantity} remaining` : "Unavailable"}
                      {ticketType.saleEndsAt ? ` | Sales end ${formatDateTime(ticketType.saleEndsAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" disabled={!purchasable || quantity <= 0} onClick={() => updateQuantity(ticketType, quantity - 1)}><Minus className="h-4 w-4" /></Button>
                    <span className="w-10 text-center text-sm font-semibold text-white">{quantity}</span>
                    <Button variant="secondary" size="sm" disabled={!purchasable} onClick={() => updateQuantity(ticketType, quantity + 1)}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">Selected total: <span className="font-semibold text-white">{formatMoney(total, currency)}</span></p>
        <Button onClick={continueToCheckout} disabled={selectedItems.length === 0}>Continue</Button>
      </div>
    </Card>
  );
}

export default PublicTicketSelectionPanel;
