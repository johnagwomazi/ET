import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, RefreshCw, Save } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import StatusBadge from "../dashboard/StatusBadge";
import { Skeleton } from "../common/Skeleton";
import { formatMoney } from "../../utils/formatters";
import * as ticketingService from "../../services/ticketing.service";

const initialForm = {
  name: "",
  description: "",
  price: "",
  quantity: "",
  maxPerOrder: "10",
  saleStartsAt: "",
  saleEndsAt: "",
  status: "ACTIVE",
  position: "0",
};

function toDateOrUndefined(value) {
  return value ? new Date(value).toISOString() : undefined;
}

function AdminTicketManagementPanel({ event, canManage = false }) {
  const eventId = event?._id || event?.id;
  const [ticketTypes, setTicketTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicketType, setEditingTicketType] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);

  async function loadTicketTypes() {
    if (!eventId || !canManage) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await ticketingService.getOrganizationEventTicketTypes(eventId);
      setTicketTypes(response?.ticketTypes || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load ticket types");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTicketTypes();
  }, [eventId, canManage]);

  function openCreate() {
    setEditingTicketType(null);
    setForm(initialForm);
    setModalOpen(true);
  }

  function openEdit(ticketType) {
    setEditingTicketType(ticketType);
    setForm({
      name: ticketType.name || "",
      description: ticketType.description || "",
      price: String(ticketType.price || ""),
      quantity: String(ticketType.quantity || ""),
      maxPerOrder: String(ticketType.maxPerOrder || 10),
      saleStartsAt: ticketType.saleStartsAt ? ticketType.saleStartsAt.slice(0, 16) : "",
      saleEndsAt: ticketType.saleEndsAt ? ticketType.saleEndsAt.slice(0, 16) : "",
      status: ticketType.status || "ACTIVE",
      position: String(ticketType.position || 0),
    });
    setModalOpen(true);
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        quantity: Number(form.quantity),
        maxPerOrder: Number(form.maxPerOrder),
        saleStartsAt: toDateOrUndefined(form.saleStartsAt),
        saleEndsAt: toDateOrUndefined(form.saleEndsAt),
        status: form.status,
        position: Number(form.position || 0),
      };

      if (editingTicketType) {
        await ticketingService.updateOrganizationEventTicketType(eventId, editingTicketType.id, payload);
        toast.success("Ticket type updated");
      } else {
        await ticketingService.createOrganizationEventTicketType(eventId, payload);
        toast.success("Ticket type created");
      }

      setModalOpen(false);
      await loadTicketTypes();
    } catch (saveError) {
      toast.error(saveError.message || "Unable to save ticket type");
    } finally {
      setIsSaving(false);
    }
  }

  if (!canManage) {
    return null;
  }

  return (
    <Card className="border-slate-800/70 bg-slate-950/85">
      <div className="flex flex-col gap-4 border-b border-slate-800/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-300">Tickets</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Ticket management</h3>
          <p className="mt-2 text-sm text-slate-400">Create and update ticket types while preserving historical order prices.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={loadTicketTypes} isLoading={isLoading}><RefreshCw className="h-4 w-4" />Refresh</Button>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />New ticket</Button>
        </div>
      </div>

      <div className="mt-5">
        {isLoading && ticketTypes.length === 0 ? (
          <div className="grid gap-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}</div>
        ) : error ? (
          <ErrorState title="Ticket types unavailable" message={error} onRetry={loadTicketTypes} />
        ) : ticketTypes.length > 0 ? (
          <div className="grid gap-3">
            {ticketTypes.map((ticketType) => (
              <div key={ticketType.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white">{ticketType.name}</p>
                      <StatusBadge status={ticketType.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{ticketType.soldQuantity} sold | {ticketType.remainingQuantity} remaining | {formatMoney(ticketType.price, ticketType.currency)}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(ticketType)}>Edit</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No ticket types" message="Create ticket types before customers can purchase this event." />
        )}
      </div>

      <Modal open={modalOpen} title={editingTicketType ? "Edit ticket type" : "Create ticket type"} onClose={() => setModalOpen(false)} className="max-w-3xl">
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Name" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
            <Input label="Price" type="number" min="0" value={form.price} onChange={(event) => updateField("price", event.target.value)} />
            <Input label="Quantity" type="number" min="0" value={form.quantity} onChange={(event) => updateField("quantity", event.target.value)} />
            <Input label="Max per order" type="number" min="1" value={form.maxPerOrder} onChange={(event) => updateField("maxPerOrder", event.target.value)} />
            <Input label="Sale starts" type="datetime-local" value={form.saleStartsAt} onChange={(event) => updateField("saleStartsAt", event.target.value)} />
            <Input label="Sale ends" type="datetime-local" value={form.saleEndsAt} onChange={(event) => updateField("saleEndsAt", event.target.value)} />
            <Input label="Position" type="number" min="0" value={form.position} onChange={(event) => updateField("position", event.target.value)} />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Status</span>
              <select value={form.status} onChange={(event) => updateField("status", event.target.value)} className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100 outline-none focus:border-app-500 focus:ring-2 focus:ring-app-500/20">
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
          </div>
          <Input label="Description" value={form.description} onChange={(event) => updateField("description", event.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSaving} loadingText="Saving..."><Save className="h-4 w-4" />Save</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

export default AdminTicketManagementPanel;
