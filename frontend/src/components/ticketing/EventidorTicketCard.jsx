import { useState } from "react";
import { getPublicEventPath } from "../../utils/eventUrl";
import { Link } from "react-router-dom";
import { CalendarDays, Gift, MapPin, QrCode, Ticket } from "lucide-react";

import Button from "../ui/Button";
import Card from "../ui/Card";
import StatusBadge from "../dashboard/StatusBadge";
import { formatDateTime, formatMoney } from "../../utils/formatters";
import { getEventImageUrl } from "../../utils/eventImage";
import TicketQrModal from "./TicketQrModal";

function getVenue(ticket) {
  const venue = ticket.eventDetails?.venue;
  return [venue?.name, venue?.address?.line1, venue?.address?.city].filter(Boolean).join(", ") || "Venue to be announced";
}

function EventidorTicketCard({ ticket, active, onAssign, showPurchase = true }) {
  const [qrOpen, setQrOpen] = useState(false);
  const event = ticket.eventDetails;
  const ticketType = ticket.ticketTypeDetails;
  const order = ticket.orderDetails;
  const canAssign = Boolean(ticket.assignment?.canAssign && active);

  return (
    <>
      <Card className="overflow-hidden border-slate-800/70 bg-slate-950/85 p-0">
        <div className="grid lg:grid-cols-[minmax(220px,0.72fr)_minmax(0,1.5fr)]">
          <div className="relative aspect-[16/9] bg-slate-900 lg:aspect-auto lg:min-h-[25rem]">
            {getEventImageUrl(event) ? (
              <img src={getEventImageUrl(event)} alt={event?.eventName || "Event banner"} className="block h-full w-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <div className="flex h-full min-h-44 items-center justify-center"><Ticket className="h-12 w-12 text-slate-600" /></div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 to-transparent px-5 pb-4 pt-12">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-app-200">Eventidor ticket</p>
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={ticket.status} />
                  <StatusBadge status={active ? "ACTIVE" : "INACTIVE"} label={active ? "Active ticket" : "Past / inactive"} />
                  <StatusBadge status={ticket.source} label={ticket.source === "COMPLIMENTARY" ? "Complimentary" : "Paid"} />
                </div>
                <h3 className="mt-3 text-xl font-semibold text-white sm:text-2xl">{event?.eventName || "Event ticket"}</h3>
                <p className="mt-1 text-sm text-slate-400">{ticketType?.name || "Ticket type unavailable"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canAssign ? <Button variant="secondary" size="sm" onClick={() => onAssign?.(ticket)}><Gift className="h-4 w-4" />{ticket.assignment?.isAssigned ? "Reassign" : "Assign"}</Button> : null}
                {ticket.event ? <Button as={Link} to={getPublicEventPath(ticket.eventDetails || ticket.event)} variant="secondary" size="sm">View Event</Button> : null}
              </div>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p className="flex items-start gap-2 text-slate-400"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-app-300" />{event?.startAt ? formatDateTime(event.startAt) : "Event date unavailable"}</p>
              <p className="flex items-start gap-2 text-slate-400"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-app-300" /><span>{getVenue(ticket)}</span></p>
            </div>

            <div className="grid gap-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:p-5">
              <dl className="grid content-start gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs uppercase tracking-wide text-slate-500">Attendee</dt><dd className="mt-1 text-slate-100">{ticket.attendee?.name || "Not provided"}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-slate-500">Ticket type</dt><dd className="mt-1 text-slate-100">{ticketType?.name || "Ticket"}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-slate-500">Reference</dt><dd className="mt-1 break-all font-mono text-slate-200">{ticket.reference}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-slate-500">Manual code</dt><dd className="mt-1 break-all font-mono text-lg tracking-[0.18em] text-app-200">{ticket.checkInCode || "Unavailable"}</dd></div>
                {ticket.assignment?.isAssigned ? <div><dt className="text-xs uppercase tracking-wide text-slate-500">Assignment</dt><dd className="mt-1 text-slate-200">Assigned to {ticket.attendee?.name || "recipient"}</dd></div> : null}
                {ticket.checkedInAt ? <div><dt className="text-xs uppercase tracking-wide text-slate-500">Checked in</dt><dd className="mt-1 text-slate-200">{formatDateTime(ticket.checkedInAt)}</dd></div> : null}
                {showPurchase && order ? <div><dt className="text-xs uppercase tracking-wide text-slate-500">Purchase</dt><dd className="mt-1 text-slate-200">{formatMoney(order.total, order.currency)} � {order.paymentStatus}</dd></div> : null}
              </dl>

              <button type="button" onClick={() => setQrOpen(true)} className="group flex min-h-44 flex-col items-center justify-center rounded-xl border border-slate-700 bg-white p-3 text-slate-900 transition hover:border-app-400 focus:outline-none focus:ring-2 focus:ring-app-400" aria-label={`Enlarge QR code for ${ticket.reference}`}>
                {ticket.qrCodeDataUrl ? <img src={ticket.qrCodeDataUrl} alt={`QR code for ${ticket.reference}`} className="h-36 w-36 object-contain transition group-hover:scale-[1.03]" /> : <QrCode className="h-16 w-16 text-slate-400" />}
                <span className="mt-2 text-xs font-semibold">Tap to enlarge</span>
              </button>
            </div>
          </div>
        </div>
      </Card>
      <TicketQrModal open={qrOpen} ticket={ticket} onClose={() => setQrOpen(false)} />
    </>
  );
}

export default EventidorTicketCard;
