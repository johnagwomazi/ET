import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Clock3, History, RefreshCw, RotateCw, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import StatusBadge from "../dashboard/StatusBadge";
import { Skeleton, SkeletonText } from "../common/Skeleton";
import { formatDateTime, formatStatusLabel } from "../../utils/formatters";
import * as eventService from "../../services/event.service";

const ACTION_LABELS = {
  publish: "Publish",
  postpone: "Postpone",
  resume: "Resume",
  cancel: "Cancel",
  complete: "Complete",
};

const SIMPLE_ACTION_COPY = {
  publish: {
    title: "Publish this event?",
    message: "Publishing will move the event out of draft and make it available for the next lifecycle step.",
    confirmText: "Publish",
    cancelText: "Keep draft",
    tone: "primary",
  },
  resume: {
    title: "Resume this event?",
    message: "Resuming will move the event back to published and make it active again.",
    confirmText: "Resume",
    cancelText: "Keep postponed",
    tone: "primary",
  },
  complete: {
    title: "Complete this event?",
    message: "Completing the event marks it as finished. This is only allowed after the scheduled end time.",
    confirmText: "Complete",
    cancelText: "Keep published",
    tone: "primary",
  },
  cancel: {
    title: "Cancel this event?",
    message: "Canceling will move the event into a terminal state and hide lifecycle actions.",
    confirmText: "Cancel event",
    cancelText: "Go back",
    tone: "danger",
    requiresReason: true,
    reasonLabel: "Cancellation reason",
    reasonPlaceholder: "Explain why this event is being canceled...",
  },
};

const ACTION_SUCCESS_MESSAGES = {
  publish: "Event published successfully",
  postpone: "Event postponed successfully",
  resume: "Event resumed successfully",
  cancel: "Event canceled successfully",
  complete: "Event completed successfully",
};

function getDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDisplayName(user) {
  if (!user) {
    return "Unknown";
  }

  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Unknown";
}

function getLifecycleSummary(history) {
  return `${formatStatusLabel(history.previousStatus)} -> ${formatStatusLabel(history.newStatus)}`;
}

function getAvailableActions(event) {
  if (!event) {
    return [];
  }

  const currentStatus = event.status;
  const currentEndAt = event.endAt ? new Date(event.endAt) : null;
  const hasEnded = currentEndAt instanceof Date && !Number.isNaN(currentEndAt.getTime()) && currentEndAt <= new Date();

  if (currentStatus === "DRAFT") {
    return ["publish"];
  }

  if (currentStatus === "PUBLISHED") {
    const actions = ["postpone", "cancel"];

    if (hasEnded) {
      actions.push("complete");
    }

    return actions;
  }

  if (currentStatus === "POSTPONED") {
    return ["resume", "cancel"];
  }

  return [];
}

function getActionButtonVariant(action) {
  if (action === "cancel") {
    return "danger";
  }

  return action === "postpone" ? "secondary" : "primary";
}

function ActionHistoryItem({ history }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={history.previousStatus} />
            <span className="text-sm text-slate-500">to</span>
            <StatusBadge status={history.newStatus} />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">{ACTION_LABELS[history.action] || formatStatusLabel(history.action)}</p>
            <p className="text-sm text-slate-400">{getLifecycleSummary(history)}</p>
          </div>

          {history.reason ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Reason</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">{history.reason}</p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:w-[24rem] lg:flex-none">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Changed by</p>
            <p className="mt-2 text-sm text-slate-200">{getDisplayName(history.changedBy)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Changed at</p>
            <p className="mt-2 text-sm text-slate-200">{formatDateTime(history.changedAt)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Previous schedule</p>
            <p className="mt-2 text-sm text-slate-200">
              {formatDateTime(history.previousStartAt)} - {formatDateTime(history.previousEndAt)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">New schedule</p>
            <p className="mt-2 text-sm text-slate-200">
              {formatDateTime(history.newStartAt)} - {formatDateTime(history.newEndAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading lifecycle history">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={`lifecycle-history-skeleton-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-5 w-40 rounded-full" />
            <SkeletonText className="h-4 w-3/4" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LifecycleActionDialog({
  action,
  event,
  open,
  isSubmitting,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState("");
  const [newStartDateTime, setNewStartDateTime] = useState("");
  const [newEndDateTime, setNewEndDateTime] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open || !action) {
      return;
    }

    setFormError("");
    setReason("");
    setNewStartDateTime(getDateTimeLocalValue(event?.startAt));
    setNewEndDateTime(getDateTimeLocalValue(event?.endAt));
  }, [action, event, open]);

  if (!action) {
    return null;
  }

  const copy = SIMPLE_ACTION_COPY[action];
  const title = copy?.title || "Confirm action";
  const message = copy?.message || "Please confirm this action.";
  const requiresReason = Boolean(copy?.requiresReason);
  const requiresDateTimeInputs = action === "postpone";

  async function handleSubmit() {
    if (action === "postpone") {
      if (!reason.trim()) {
        setFormError("Reason is required");
        return;
      }

      if (!newStartDateTime || !newEndDateTime) {
        setFormError("Please provide both new start and end date/times");
        return;
      }

      const startDate = new Date(newStartDateTime);
      const endDate = new Date(newEndDateTime);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        setFormError("Please provide valid date and time values");
        return;
      }

      if (endDate <= startDate) {
        setFormError("New end date and time must be after new start date and time");
        return;
      }

      setFormError("");
      await onConfirm({
        reason: reason.trim(),
        newStartDateTime: startDate,
        newEndDateTime: endDate,
      });
      return;
    }

    if (requiresReason && !reason.trim()) {
      setFormError("Reason is required");
      return;
    }

    setFormError("");
    await onConfirm(requiresReason ? { reason: reason.trim() } : {});
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={isSubmitting ? undefined : onClose}
      className="max-w-2xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {copy?.cancelText || "Cancel"}
          </Button>
          <Button
            variant={copy?.tone === "danger" ? "danger" : "primary"}
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText={copy?.confirmText || "Confirming..."}
          >
            {copy?.confirmText || "Confirm"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-sm font-semibold text-white">{event?.eventName || "Untitled event"}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>
          {action === "complete" ? (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-300" />
              <p className="text-sm leading-6 text-amber-100/90">
                Completing is only allowed after the scheduled end time. The backend will enforce this rule.
              </p>
            </div>
          ) : null}
        </div>

        {requiresDateTimeInputs ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="datetime-local"
              label="New start date and time"
              value={newStartDateTime}
              onChange={(event) => setNewStartDateTime(event.target.value)}
            />
            <Input
              type="datetime-local"
              label="New end date and time"
              value={newEndDateTime}
              onChange={(event) => setNewEndDateTime(event.target.value)}
            />
            <div className="md:col-span-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">Reason</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                  placeholder="Explain why the event is being postponed..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-app-500 focus:ring-2 focus:ring-app-500/20"
                />
              </label>
            </div>
          </div>
        ) : requiresReason ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">{copy?.reasonLabel || "Reason"}</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              placeholder={copy?.reasonPlaceholder || "Add a reason..."}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-app-500 focus:ring-2 focus:ring-app-500/20"
            />
          </label>
        ) : null}

        {formError ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-300" />
            <p className="text-sm leading-6 text-rose-100/90">{formError}</p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function EventLifecyclePanel({ event, canManageLifecycle = false, onEventUpdated }) {
  const eventId = event?._id || event?.id || null;
  const [history, setHistory] = useState([]);
  const [historyPagination, setHistoryPagination] = useState(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const availableActions = useMemo(() => getAvailableActions(event), [event]);
  const hasActions = availableActions.length > 0;

  async function loadHistory({ quiet = false } = {}) {
    if (!eventId || !canManageLifecycle) {
      setHistory([]);
      setHistoryPagination(null);
      return null;
    }

    if (quiet) {
      setIsHistoryLoading(true);
    } else {
      setIsHistoryLoading(true);
    }

    setHistoryError(null);

    try {
      const response = await eventService.getOrganizationEventHistory(eventId, {
        page: 1,
        limit: 10,
      });

      setHistory(response?.history || []);
      setHistoryPagination(response?.pagination || null);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load lifecycle history";
      setHistoryError(message);
      throw error;
    } finally {
      setIsHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (!eventId || !canManageLifecycle) {
      setHistory([]);
      setHistoryPagination(null);
      setHistoryError(null);
      setIsHistoryLoading(false);
      return undefined;
    }

    loadHistory().catch(() => {});
    return undefined;
  }, [canManageLifecycle, eventId]);

  async function handleLifecycleAction(action, payload = {}) {
    setIsActionSubmitting(true);

    try {
      let response;

      if (action === "publish") {
        response = await eventService.publishOrganizationEvent(eventId);
      } else if (action === "postpone") {
        response = await eventService.postponeOrganizationEvent(eventId, payload);
      } else if (action === "resume") {
        response = await eventService.resumeOrganizationEvent(eventId);
      } else if (action === "cancel") {
        response = await eventService.cancelOrganizationEvent(eventId, payload);
      } else if (action === "complete") {
        response = await eventService.completeOrganizationEvent(eventId);
      }

      if (response?.event) {
        onEventUpdated?.(response.event);
      }

      toast.success(ACTION_SUCCESS_MESSAGES[action] || "Operation successful");
      setSelectedAction(null);
      await loadHistory({ quiet: true }).catch(() => {});
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsActionSubmitting(false);
    }
  }

  if (!canManageLifecycle) {
    return null;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="border-slate-800/70 bg-slate-950/85">
        <div className="flex flex-col gap-4 border-b border-slate-800/70 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-2xl bg-app-500/10 p-2 text-app-300 ring-1 ring-app-500/20">
                  <History className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-300">Lifecycle</p>
              </div>
              <h3 className="text-lg font-semibold text-white">Event controls</h3>
              <p className="text-sm leading-6 text-slate-400">
                Use the backend lifecycle transitions to publish, postpone, resume, cancel, or complete this event.
              </p>
            </div>
            <StatusBadge status={event?.status} />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDateTime(event?.startAt)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1">
              <Clock3 className="h-3.5 w-3.5" />
              {formatDateTime(event?.endAt)}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {hasActions ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {availableActions.map((action) => (
                <Button
                  key={action}
                  variant={getActionButtonVariant(action)}
                  onClick={() => setSelectedAction(action)}
                  disabled={isActionSubmitting}
                  className="justify-center"
                >
                  {ACTION_LABELS[action] || formatStatusLabel(action)}
                </Button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-slate-500/15 p-3 text-slate-300 ring-1 ring-slate-500/20">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">No lifecycle actions available</p>
                  <p className="text-sm leading-6 text-slate-400">
                    This event is in a terminal state, or no action is currently allowed for its status.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="border-slate-800/70 bg-slate-950/85">
        <div className="flex flex-col gap-4 border-b border-slate-800/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="rounded-2xl bg-app-500/10 p-2 text-app-300 ring-1 ring-app-500/20">
                <RotateCw className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-300">History</p>
            </div>
            <h3 className="text-lg font-semibold text-white">Lifecycle history</h3>
            <p className="text-sm leading-6 text-slate-400">
              Review status transitions, timestamps, and the actor associated with each lifecycle change.
            </p>
          </div>

          <Button variant="secondary" size="sm" onClick={() => loadHistory({ quiet: true }).catch(() => {})} isLoading={isHistoryLoading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="mt-5">
          {isHistoryLoading && history.length === 0 ? (
            <HistorySkeleton />
          ) : historyError && history.length === 0 ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-rose-200">Unable to load lifecycle history</p>
                  <p className="text-sm text-rose-100/80">{historyError}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => loadHistory().catch(() => {})}>
                  Try again
                </Button>
              </div>
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-3">
              {history.map((item) => (
                <ActionHistoryItem key={item._id || `${item.changedAt}-${item.action}`} history={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="space-y-2 text-center">
                <h4 className="text-base font-semibold text-white">No lifecycle history yet</h4>
                <p className="text-sm text-slate-400">
                  Lifecycle transitions will appear here once the event is published or moved through later states.
                </p>
              </div>
            </div>
          )}
        </div>

        {historyError && history.length > 0 ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-300" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-rose-200">History refresh failed</p>
              <p className="text-sm text-rose-100/80">{historyError}</p>
            </div>
          </div>
        ) : null}

        {historyPagination?.totalItems ? (
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">
            Showing {history.length} of {historyPagination.totalItems} entries
          </p>
        ) : null}
      </Card>

      <LifecycleActionDialog
        action={selectedAction}
        event={event}
        open={Boolean(selectedAction)}
        isSubmitting={isActionSubmitting}
        onClose={() => {
          if (isActionSubmitting) {
            return;
          }

          setSelectedAction(null);
        }}
        onConfirm={(payload) => handleLifecycleAction(selectedAction, payload)}
      />
    </div>
  );
}

export default EventLifecyclePanel;
