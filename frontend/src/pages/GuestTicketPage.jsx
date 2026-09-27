import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import PageContainer from "../components/ui/PageContainer";
import ErrorState from "../components/common/ErrorState";
import { Skeleton } from "../components/common/Skeleton";
import EventidorTicketCard from "../components/ticketing/EventidorTicketCard";
import * as ticketingService from "../services/ticketing.service";

function GuestTicketPage() {
  const { token } = useParams();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadTicket() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ticketingService.getGuestTicket(token);
      setTicket(response?.ticket || null);
    } catch (loadError) {
      setTicket(null);
      setError("This ticket link is invalid, expired, or has been replaced by a newer assignment.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTicket();
  }, [token]);

  const active = ticket?.status === "VALID" && !["CANCELED", "COMPLETED"].includes(ticket?.eventDetails?.status);

  return (
    <main className="py-10 sm:py-14">
      <PageContainer className="space-y-6">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-app-300">Eventidor secure ticket</p>
          <h1 className="mt-2 text-2xl font-semibold text-white sm:text-4xl">Your event ticket</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Present the QR code or manual check-in code at the event. You do not need to sign in.</p>
        </header>

        {isLoading ? <Skeleton className="mx-auto h-[34rem] max-w-5xl rounded-2xl" /> : null}
        {!isLoading && error ? <div className="mx-auto max-w-2xl"><ErrorState title="Ticket unavailable" message={error} onRetry={loadTicket} /></div> : null}
        {!isLoading && ticket ? <div className="mx-auto max-w-5xl"><EventidorTicketCard ticket={ticket} active={active} showPurchase={false} /></div> : null}

        {ticket ? <p className="mx-auto max-w-2xl text-center text-xs leading-5 text-slate-500">This private link opens only this ticket. Do not share the link, QR code, or manual check-in code.</p> : null}
      </PageContainer>
    </main>
  );
}

export default GuestTicketPage;
