import { QrCode } from "lucide-react";

import Modal from "../ui/Modal";

function TicketQrModal({ open, ticket, onClose }) {
  if (!ticket) return null;
  const eventName = ticket.eventDetails?.eventName || "Event ticket";
  const attendeeName = ticket.attendee?.name || "Ticket holder";
  const ticketType = ticket.ticketTypeDetails?.name || "Ticket";

  return (
    <Modal open={open} title={`${eventName}  Entry ticket`} onClose={onClose} className="max-w-2xl">
      <div className="flex min-h-[70dvh] flex-col items-center justify-center py-4 text-center sm:min-h-0 sm:py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-app-300">Eventidor</p>
        <div className="mt-5 flex min-h-72 w-full max-w-md items-center justify-center rounded-2xl bg-white p-5 sm:min-h-96 sm:p-7">
          {ticket.qrCodeDataUrl ? (
            <img src={ticket.qrCodeDataUrl} alt={`QR code for ${ticket.reference}`} className="h-auto w-full max-w-80 object-contain sm:max-w-96" />
          ) : (
            <div><QrCode className="mx-auto h-24 w-24 text-slate-400" /><p className="mt-3 text-sm text-slate-600">QR code unavailable</p></div>
          )}
        </div>
        <h3 className="mt-5 text-xl font-semibold text-white">{eventName}</h3>
        <p className="mt-1 text-sm text-slate-300">{attendeeName} � {ticketType}</p>
        <div className="mt-5 w-full max-w-md rounded-2xl border border-app-500/30 bg-app-500/10 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Manual check-in code</p>
          <p className="mt-2 break-all font-mono text-2xl font-bold tracking-[0.22em] text-app-200 sm:text-3xl">{ticket.checkInCode || "Unavailable"}</p>
        </div>
        <p className="mt-4 max-w-md text-xs leading-5 text-slate-500">Keep this QR code and check-in code private. Event staff will use either credential to check in this same ticket once.</p>
      </div>
    </Modal>
  );
}

export default TicketQrModal;
