import { useEffect, useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import * as ticketingService from "../../services/ticketing.service";

function newRecipient(ticketTypes) {
  return {
    name: "",
    email: "",
    phone: "",
    allocations: [{ ticketTypeId: ticketTypes[0]?.id || "", quantity: "1" }],
  };
}

function ComplimentaryTicketModal({ open, onClose, eventId, ticketTypes, onIssued }) {
  const [recipients, setRecipients] = useState([newRecipient(ticketTypes)]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) setRecipients([newRecipient(ticketTypes)]);
  }, [open, ticketTypes]);

  function updateRecipient(index, field, value) {
    setRecipients((current) => current.map((recipient, recipientIndex) => (
      recipientIndex === index ? { ...recipient, [field]: value } : recipient
    )));
  }

  function updateAllocation(recipientIndex, allocationIndex, field, value) {
    setRecipients((current) => current.map((recipient, currentRecipientIndex) => (
      currentRecipientIndex === recipientIndex
        ? {
            ...recipient,
            allocations: recipient.allocations.map((allocation, currentAllocationIndex) => (
              currentAllocationIndex === allocationIndex ? { ...allocation, [field]: value } : allocation
            )),
          }
        : recipient
    )));
  }

  function addAllocation(recipientIndex) {
    setRecipients((current) => current.map((recipient, index) => (
      index === recipientIndex
        ? { ...recipient, allocations: [...recipient.allocations, { ticketTypeId: ticketTypes[0]?.id || "", quantity: "1" }] }
        : recipient
    )));
  }

  function removeAllocation(recipientIndex, allocationIndex) {
    setRecipients((current) => current.map((recipient, index) => (
      index === recipientIndex
        ? { ...recipient, allocations: recipient.allocations.filter((_, currentIndex) => currentIndex !== allocationIndex) }
        : recipient
    )));
  }

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await ticketingService.createComplimentaryTickets(eventId, {
        recipients: recipients.map((recipient) => ({
          name: recipient.name.trim(),
          email: recipient.email.trim(),
          phone: recipient.phone.trim(),
          allocations: recipient.allocations.map((allocation) => ({
            ticketTypeId: allocation.ticketTypeId,
            quantity: Number(allocation.quantity),
          })),
        })),
      });
      toast.success((response?.issuedQuantity || 0) + " complimentary ticket(s) issued");
      await onIssued?.(response);
      onClose();
    } catch (error) {
      toast.error(error.message || "Unable to issue complimentary tickets");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="Issue complimentary tickets" onClose={onClose} className="max-w-4xl">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <p className="text-sm leading-6 text-slate-400">Issue zero-cost tickets to one or more recipients. These tickets consume normal inventory and event capacity.</p>
        {recipients.map((recipient, recipientIndex) => (
          <section key={recipientIndex} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold text-white">Recipient {recipientIndex + 1}</h4>
              {recipients.length > 1 ? <Button type="button" size="sm" variant="ghost" onClick={() => setRecipients((current) => current.filter((_, index) => index !== recipientIndex))}><Trash2 className="h-4 w-4" />Remove</Button> : null}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Input label="Full name" required value={recipient.name} onChange={(event) => updateRecipient(recipientIndex, "name", event.target.value)} />
              <Input label="Email" type="email" required value={recipient.email} onChange={(event) => updateRecipient(recipientIndex, "email", event.target.value)} />
              <Input label="Phone" required value={recipient.phone} onChange={(event) => updateRecipient(recipientIndex, "phone", event.target.value)} />
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ticket allocations</p>
              {recipient.allocations.map((allocation, allocationIndex) => (
                <div key={allocationIndex} className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-200">Ticket type</span>
                    <select required value={allocation.ticketTypeId} onChange={(event) => updateAllocation(recipientIndex, allocationIndex, "ticketTypeId", event.target.value)} className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100 outline-none focus:border-app-500 focus:ring-2 focus:ring-app-500/20">
                      <option value="">Select a ticket type</option>
                      {ticketTypes.map((ticketType) => <option key={ticketType.id} value={ticketType.id}>{ticketType.name} ({ticketType.remainingQuantity} remaining)</option>)}
                    </select>
                  </label>
                  <Input label="Quantity" type="number" min="1" max="100" required value={allocation.quantity} onChange={(event) => updateAllocation(recipientIndex, allocationIndex, "quantity", event.target.value)} />
                  <div className="flex items-end"><Button type="button" variant="ghost" aria-label="Remove ticket allocation" disabled={recipient.allocations.length === 1} onClick={() => removeAllocation(recipientIndex, allocationIndex)}><Trash2 className="h-4 w-4" /></Button></div>
                </div>
              ))}
              <Button type="button" size="sm" variant="secondary" onClick={() => addAllocation(recipientIndex)}><Plus className="h-4 w-4" />Add ticket type</Button>
            </div>
          </section>
        ))}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:justify-between">
          <Button type="button" variant="secondary" onClick={() => setRecipients((current) => [...current, newRecipient(ticketTypes)])}><Plus className="h-4 w-4" />Add recipient</Button>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting} loadingText="Issuing..." disabled={!ticketTypes.length}><Send className="h-4 w-4" />Issue tickets</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default ComplimentaryTicketModal;
