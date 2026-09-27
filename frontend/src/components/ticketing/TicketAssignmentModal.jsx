import { useEffect, useState } from "react";

import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";

const EMPTY_FORM = { name: "", email: "", phone: "" };

function TicketAssignmentModal({ ticket, open, onClose, onSubmit, isSubmitting }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: ticket?.attendee?.name || "",
      email: ticket?.attendee?.email || "",
      phone: ticket?.attendee?.phone || "",
    });
  }, [open, ticket]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit?.({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
    });
  }

  return (
    <Modal
      open={open}
      title={ticket?.assignment?.isAssigned ? "Reassign ticket" : "Assign ticket"}
      onClose={isSubmitting ? undefined : onClose}
      footer={(
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form="ticket-assignment-form" isLoading={isSubmitting} loadingText="Assigning...">Assign ticket</Button>
        </div>
      )}
    >
      <form id="ticket-assignment-form" className="space-y-4" onSubmit={handleSubmit}>
        <p className="leading-6 text-slate-400">This transfers access to the same ticket. Its QR code, manual code, reference, and check-in state will not change.</p>
        {ticket?.assignment?.isAssigned ? <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">The previous recipients account access or guest link will be revoked immediately.</p> : null}
        <Input label="Recipient name" name="name" value={form.name} onChange={updateField} maxLength={120} required autoComplete="name" />
        <Input label="Recipient email" name="email" type="email" value={form.email} onChange={updateField} required autoComplete="email" />
        <Input label="Recipient phone number" name="phone" type="tel" value={form.phone} onChange={updateField} minLength={5} maxLength={30} required autoComplete="tel" />
      </form>
    </Modal>
  );
}

export default TicketAssignmentModal;
