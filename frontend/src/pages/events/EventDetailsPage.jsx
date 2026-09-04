import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Building2, CalendarDays, Clock3, MapPin, UserCircle2, Users } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/dashboard/StatusBadge";
import SectionHeader from "../../components/dashboard/SectionHeader";
import EventManagersPanel from "../../components/events/EventManagersPanel";
import EventAttendancePanel from "../../components/events/EventAttendancePanel";
import EventLifecyclePanel from "../../components/events/EventLifecyclePanel";
import AdminTicketManagementPanel from "../../components/ticketing/AdminTicketManagementPanel";
import EventFinancialPanel from "../../components/ticketing/EventFinancialPanel";
import { EventDetailSkeleton } from "../../components/events/EventLoadingStates";
import { ROUTE_PATHS } from "../../routes/routePaths";
import { formatDateTime, formatNumber } from "../../utils/formatters";
import * as eventService from "../../services/event.service";
import { useOrganizationPermissions } from "../../hooks/useOrganizationPermissions";
import { ORGANIZATION_PERMISSIONS } from "../../constants/organizationPermissions.constants";

function getListRoute(scope) {
  return scope === "manager" ? ROUTE_PATHS.MANAGER_EVENTS : ROUTE_PATHS.ORGANIZATION_EVENTS;
}

function getEditRoute(scope, eventId) {
  if (scope === "manager") {
    return ROUTE_PATHS.MANAGER_EVENTS;
  }

  return ROUTE_PATHS.ORGANIZATION_EVENT_EDIT.replace(":eventId", eventId);
}

function getDisplayName(user) {
  if (!user) {
    return "Unassigned";
  }

  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Unassigned";
}

function getVenueLabel(event) {
  return event?.venue?.name || event?.venue?.address?.line1 || "Venue not set";
}

function DetailField({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="rounded-xl bg-app-500/10 p-2 text-app-300 ring-1 ring-app-500/20">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
        </div>
      </div>
    </div>
  );
}

function EventDetailsPage({ scope = "organization" }) {
  const navigate = useNavigate();
  const params = useParams();
  const eventId = params.eventId;
  const isManager = scope === "manager";
  const { hasPermission } = useOrganizationPermissions();
  const canManageOrganizationEvents = !isManager && hasPermission(ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE);

  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);

  async function loadEvent({ quiet = false } = {}) {
    if (!eventId) {
      setError("Event id is missing");
      setIsLoading(false);
      return null;
    }

    if (quiet) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);
    setErrorStatus(null);

    try {
      const response = isManager
        ? await eventService.getManagerAssignedEventById(eventId)
        : await eventService.getOrganizationEventById(eventId);

      const nextEvent = response?.event || null;
      setEvent(nextEvent);
      return nextEvent;
    } catch (loadError) {
      const status = loadError?.status || null;
      const message = loadError instanceof Error ? loadError.message : "Unable to load event details";
      setError(message);
      setErrorStatus(status);

      if (isManager && status === 403) {
        navigate(ROUTE_PATHS.FORBIDDEN, {
          replace: true,
          state: {
            title: "Event access denied",
            message: "You are not assigned to this event.",
            reason: "manager-event-denied",
          },
        });
      }

      throw loadError;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadEvent().catch(() => {});
  }, [eventId, scope]);

  const summaryCards = useMemo(() => {
    if (!event) {
      return [];
    }

    return [
      {
        label: "Status",
        value: <StatusBadge status={event.status} />,
      },
      {
        label: "Capacity",
        value: formatNumber(event.capacity || 0),
      },
      {
        label: "Start",
        value: formatDateTime(event.startAt),
      },
      {
        label: "End",
        value: formatDateTime(event.endAt),
      },
    ];
  }, [event]);

  if (isLoading && !event) {
    return <EventDetailSkeleton />;
  }

  if (errorStatus === 404 && !event) {
    return <EmptyState title="Event not found" message="This assigned event is unavailable or no longer accessible." />;
  }

  if (error && !event) {
    return (
      <ErrorState
        title="Unable to load event"
        message={error}
        onRetry={() => {
          loadEvent().catch(() => {});
        }}
      />
    );
  }

  if (!event) {
    return <EmptyState title="Event not found" message="The requested event could not be loaded." />;
  }

  if (isManager) {
    return (
      <div className="space-y-6">
        <SectionHeader
          eyebrow="Manager workspace"
          title={event.eventName || "Assigned event"}
          description="Receive guests, validate tickets, and monitor attendance for this event."
          actions={[
            {
              label: "Back to events",
              variant: "ghost",
              onClick: () => navigate(getListRoute(scope)),
            },
            {
              label: isRefreshing ? "Refreshing..." : "Refresh",
              variant: "secondary",
              onClick: () => loadEvent({ quiet: true }).catch(() => {}),
              isLoading: isRefreshing,
              loadingText: "Refreshing...",
            },
          ]}
        />

        <Card className="border-slate-800/70 bg-slate-950/85 p-4 sm:p-5">
          <div className="flex items-start gap-4">
            {event.banner?.url ? (
              <img
                src={event.banner.url}
                alt=""
                className="h-20 w-20 shrink-0 rounded-lg object-cover sm:h-24 sm:w-24"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={event.status} />
                <span className="text-xs text-slate-500">{event.category || "Assigned event"}</span>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-3">
                <span className="flex min-w-0 items-start gap-2">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-app-300" />
                  <span>{formatDateTime(event.startAt)}</span>
                </span>
                <span className="flex min-w-0 items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-app-300" />
                  <span className="truncate">{getVenueLabel(event)}</span>
                </span>
                <span className="flex min-w-0 items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-app-300" />
                  <span>{formatNumber(event.capacity || 0)} capacity</span>
                </span>
              </div>
            </div>
          </div>
        </Card>

        {error ? (
          <div className="flex items-center justify-between gap-3 border border-rose-500/20 bg-rose-500/10 p-4">
            <p className="text-sm text-rose-100">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => loadEvent({ quiet: true }).catch(() => {})}>
              Retry
            </Button>
          </div>
        ) : null}

        <EventAttendancePanel event={event} scope="manager" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={isManager ? "Manager workspace" : "Organization management"}
        title={isManager ? event.eventName || "Assigned event" : "Event Details"}
        description={
          isManager
            ? "View the assigned event, check attendance, and export reports from the manager workspace."
            : "Review event details, manage manager assignments, control the lifecycle, and handle attendance operations."
        }
      actions={[
        {
          label: "Back to events",
          variant: "ghost",
          onClick: () => navigate(getListRoute(scope)),
        },
        ...(!isManager
          ? [
              {
                label: "Edit event",
                variant: "secondary",
                as: Link,
                to: getEditRoute(scope, eventId),
              },
            ]
          : []),
        {
          label: isRefreshing ? "Refreshing..." : "Refresh",
          variant: "secondary",
          onClick: () => loadEvent({ quiet: true }).catch(() => {}),
          isLoading: isRefreshing,
            loadingText: "Refreshing...",
          },
        ]}
      />

      <Card className="border-slate-800/70 bg-slate-950/85">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-300">
                {event.category || (isManager ? "Assigned event" : "Organization event")}
              </p>
              <h2 className="text-3xl font-semibold text-white">{event.eventName || "Untitled event"}</h2>
              <p className="max-w-3xl text-sm leading-7 text-slate-400">
                {event.description || "No description has been added for this event yet."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={event.status} />
              <span className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-xs text-slate-400">
                {event.slug || "No slug"}
              </span>
              <span className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-xs text-slate-400">
                {getDisplayName(event.createdBy || event.assignedBy)}
              </span>
            </div>

            {event.banner?.url ? (
              <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70">
                <img src={event.banner.url} alt={event.eventName || "Event banner"} className="h-64 w-full object-cover" />
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-400">
                Event banner preview will appear here once media assets are connected.
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <DetailField label="Venue" value={getVenueLabel(event)} icon={MapPin} />
            <DetailField label="Schedule" value={`${formatDateTime(event.startAt)} to ${formatDateTime(event.endAt)}`} icon={Clock3} />
            <DetailField label="Capacity" value={formatNumber(event.capacity || 0)} icon={Users} />
            <DetailField label="Created" value={formatDateTime(event.createdAt)} icon={CalendarDays} />
          </div>
        </div>
      </Card>

      {error && event ? (
        <Card className="border-rose-500/20 bg-rose-500/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-rose-200">Refresh failed</p>
              <p className="text-sm text-rose-100/80">{error}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => loadEvent({ quiet: true }).catch(() => {})}>
              Try again
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-800/70 bg-slate-950/85">
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white">Event summary</h3>
            <p className="text-sm leading-6 text-slate-400">
              Schedule, status, and capacity for this event.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {summaryCards.map((card) => (
              <DetailField key={card.label} label={card.label} value={card.value} />
            ))}
          </div>
        </Card>

        <Card className="border-slate-800/70 bg-slate-950/85">
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white">Event ownership</h3>
            <p className="text-sm leading-6 text-slate-400">
              {isManager
                ? "Assignment details for this event."
                : "Organization ownership and event authorship."}
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            <DetailField
              label="Organization"
              value={
                event.organization?.organizationName ||
                event.organization?.name ||
                (isManager ? "Assigned organization" : "Organization not attached")
              }
              icon={Building2}
            />
            <DetailField
              label={isManager ? "Assigned by" : "Created by"}
              value={getDisplayName(isManager ? event.assignedBy : event.createdBy)}
              icon={UserCircle2}
            />
            <DetailField
              label={isManager ? "Assigned at" : "Updated at"}
              value={formatDateTime(isManager ? event.assignedAt : event.updatedAt)}
              icon={CalendarDays}
            />
          </div>
        </Card>
      </div>

      {!isManager ? <EventManagersPanel event={event} canManageManagers={canManageOrganizationEvents} /> : null}

      {!isManager ? <AdminTicketManagementPanel event={event} canManage={canManageOrganizationEvents} /> : null}

      {!isManager ? <EventFinancialPanel event={event} canView={canManageOrganizationEvents} /> : null}

      {!isManager ? <EventAttendancePanel event={event} scope="organization" /> : null}

      {!isManager ? (
        <EventLifecyclePanel event={event} canManageLifecycle={canManageOrganizationEvents} onEventUpdated={setEvent} />
      ) : null}
    </div>
  );
}

export default EventDetailsPage;
