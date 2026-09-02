import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { CalendarDays, Filter, ListFilter, RefreshCw, Users } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import SectionHeader from "../../components/dashboard/SectionHeader";
import SearchInput from "../../components/dashboard/SearchInput";
import FilterSelect from "../../components/dashboard/FilterSelect";
import DataTable from "../../components/dashboard/DataTable";
import StatusBadge from "../../components/dashboard/StatusBadge";
import Pagination from "../../components/dashboard/Pagination";
import StatCard from "../../components/dashboard/StatCard";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useOrganizationPermissions } from "../../hooks/useOrganizationPermissions";
import { ORGANIZATION_PERMISSIONS } from "../../constants/organizationPermissions.constants";
import { formatDateTime, formatNumber } from "../../utils/formatters";
import { ROUTE_PATHS } from "../../routes/routePaths";
import { EVENT_STATUS_OPTIONS } from "../../constants/event.constants";
import * as eventService from "../../services/event.service";
import { EventTableSkeleton } from "../../components/events/EventLoadingStates";

const TABLE_QUERY_LIMIT = 10;

const orgInitialQuery = {
  search: "",
  status: "",
  page: 1,
  limit: TABLE_QUERY_LIMIT,
  sortBy: "createdAt",
  sortOrder: "desc",
};

const managerInitialQuery = {
  page: 1,
  limit: TABLE_QUERY_LIMIT,
};

function getEventDisplayName(event) {
  return event?.eventName || "Untitled event";
}

function getVenueLabel(event) {
  return event?.venue?.name || event?.venue?.address?.line1 || "Venue not set";
}

function getUserDisplayName(user) {
  if (!user) {
    return "Unassigned";
  }

  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Unassigned";
}

function getScheduleLabel(event) {
  const start = formatDateTime(event?.startAt);
  const end = formatDateTime(event?.endAt);

  if (start === "N/A" && end === "N/A") {
    return "Schedule not set";
  }

  return `${start} - ${end}`;
}

function getListRoute(scope) {
  return scope === "manager" ? ROUTE_PATHS.MANAGER_EVENTS : ROUTE_PATHS.ORGANIZATION_EVENTS;
}

function getDetailsRoute(scope, eventId) {
  const baseRoute = getListRoute(scope);

  return `${baseRoute}/${eventId}`;
}

function getEditRoute(scope, eventId) {
  const baseRoute = getListRoute(scope);

  return `${baseRoute}/${eventId}/edit`;
}

function buildColumns(scope) {
  const isManager = scope === "manager";

  const columns = [
    {
      key: "eventName",
      label: "Event",
      sortable: !isManager,
      render: (event) => (
        <div className="min-w-0 space-y-1">
          <Link
            to={getDetailsRoute(scope, event._id || event.id)}
            className="block truncate font-semibold text-white transition hover:text-app-300"
          >
            {getEventDisplayName(event)}
          </Link>
          <p className="truncate text-xs text-slate-500">{event.slug || "No slug"}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: !isManager,
      render: (event) => <StatusBadge status={event.status} />,
    },
    {
      key: "schedule",
      label: "Schedule",
      sortable: false,
      cellClassName: "min-w-[18rem]",
      render: (event) => (
        <div className="space-y-1">
          <p className="text-sm text-slate-200">{getScheduleLabel(event)}</p>
          <p className="text-xs text-slate-500">
            {event.startAt ? formatDateTime(event.startAt) : "N/A"}
          </p>
        </div>
      ),
    },
    {
      key: "venue",
      label: "Venue",
      sortable: false,
      render: (event) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-200">{getVenueLabel(event)}</p>
          <p className="truncate text-xs text-slate-500">
            {event.category || (isManager ? "Assigned event" : "Uncategorized")}
          </p>
        </div>
      ),
    },
  ];

  if (isManager) {
    columns.push({
      key: "assignedAt",
      label: "Assigned",
      sortable: false,
      render: (event) => (
        <div className="space-y-1">
          <p className="text-sm text-slate-200">{formatDateTime(event.assignedAt)}</p>
          <p className="text-xs text-slate-500">By {getUserDisplayName(event.assignedBy)}</p>
        </div>
      ),
    });
  } else {
    columns.push(
      {
        key: "capacity",
        label: "Capacity",
        sortable: true,
        render: (event) => formatNumber(event.capacity || 0),
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (event) => (
          <div className="space-y-1">
            <p className="text-sm text-slate-200">{formatDateTime(event.createdAt)}</p>
            <p className="text-xs text-slate-500">By {getUserDisplayName(event.createdBy)}</p>
          </div>
        ),
      }
    );

    columns.push({
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (event) => (
        <div className="flex flex-wrap gap-2">
          <Button as={Link} to={getDetailsRoute(scope, event._id || event.id)} variant="ghost" size="sm">
            View
          </Button>
          <Button as={Link} to={getEditRoute(scope, event._id || event.id)} variant="secondary" size="sm">
            Edit
          </Button>
        </div>
      ),
    });
  }

  return columns;
}

function buildSummaryCards(scope, pagination, events) {
  const pageLabel = pagination?.totalPages ? `${pagination.page} of ${pagination.totalPages}` : `${pagination.page} of 1`;

  return [
    {
      label: scope === "manager" ? "Assigned events" : "Total events",
      value: formatNumber(pagination.totalItems || 0),
      helperText: "Records returned by the backend",
      icon: CalendarDays,
    },
    {
      label: "Current page",
      value: pageLabel,
      helperText: "Server pagination state",
      icon: ListFilter,
    },
    {
      label: "Visible rows",
      value: formatNumber(events.length),
      helperText: "Events loaded in this view",
      icon: Users,
    },
    {
      label: scope === "manager" ? "Access" : "Filters",
      value: scope === "manager" ? "Manager scope" : "Org scoped",
      helperText: scope === "manager" ? "Only assigned events are shown" : "Search and status filters are enabled",
      icon: Filter,
    },
  ];
}

function EventsPage({ scope = "organization" }) {
  const isManager = scope === "manager";
  const { hasPermission } = useOrganizationPermissions();
  const canCreateEvents = hasPermission(ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE);
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: TABLE_QUERY_LIMIT, totalItems: 0, totalPages: 0 });
  const [query, setQuery] = useState(isManager ? managerInitialQuery : orgInitialQuery);
  const [searchValue, setSearchValue] = useState(isManager ? "" : orgInitialQuery.search);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const queryRef = useRef(isManager ? managerInitialQuery : orgInitialQuery);
  const debouncedSearch = useDebouncedValue(searchValue, 350);

  async function loadEvents(overrides = {}, options = {}) {
    const nextQuery = {
      ...queryRef.current,
      ...overrides,
      limit: TABLE_QUERY_LIMIT,
    };

    if (isManager) {
      delete nextQuery.search;
      delete nextQuery.status;
      delete nextQuery.sortBy;
      delete nextQuery.sortOrder;
    }

    queryRef.current = nextQuery;
    setQuery(nextQuery);

    if (options.quiet) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = isManager
        ? await eventService.getManagerAssignedEvents(nextQuery)
        : await eventService.getOrganizationEvents(nextQuery);

      setEvents(response?.events || []);
      setPagination(response?.pagination || { page: 1, limit: TABLE_QUERY_LIMIT, totalItems: 0, totalPages: 0 });
      return response;
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load events";
      setError(message);
      throw loadError;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadEvents().catch(() => {});
  }, [scope]);

  useEffect(() => {
    if (isManager) {
      return;
    }

    if (debouncedSearch === queryRef.current.search) {
      return;
    }

    loadEvents({
      search: debouncedSearch,
      page: 1,
    }).catch(() => {});
  }, [debouncedSearch, isManager]);

  function handleRefresh() {
    loadEvents({}, { quiet: true }).catch(() => {});
  }

  function handleStatusFilterChange(event) {
    if (isManager) {
      return;
    }

    loadEvents({
      status: event.target.value,
      page: 1,
    }).catch(() => {});
  }

  function handleSort(columnKey) {
    if (isManager) {
      return;
    }

    const nextSortOrder =
      queryRef.current.sortBy === columnKey && queryRef.current.sortOrder === "asc" ? "desc" : "asc";

    loadEvents({
      sortBy: columnKey,
      sortOrder: nextSortOrder,
      page: 1,
    }).catch(() => {});
  }

  const columns = useMemo(() => buildColumns(scope), [scope]);
  const summaryCards = useMemo(() => buildSummaryCards(scope, pagination, events), [scope, pagination, events]);

  if (error && events.length === 0) {
    return (
      <ErrorState
        title={isManager ? "Assigned events unavailable" : "Events unavailable"}
        message={error}
        onRetry={handleRefresh}
      />
    );
  }

  const emptyState = (
    <EmptyState
      title={isManager ? "No assigned events" : "No events found"}
      message={
        isManager
          ? "You do not have any assigned events in this organization yet."
          : "Try a different search term or reset the filter to see more events."
      }
    />
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={isManager ? "Manager workspace" : "Organization management"}
        title="Events"
        description={
          isManager
            ? "Review the events assigned to you and open a read-only detail view for each one."
            : "Search, filter, and review organization events from a single management table."
        }
        actions={[
          {
            label: isRefreshing ? "Refreshing..." : "Refresh",
            variant: "secondary",
            onClick: handleRefresh,
            isLoading: isRefreshing,
            loadingText: "Refreshing...",
          },
          ...(isManager || !canCreateEvents
            ? []
            : [
                {
                  label: "Create event",
                  variant: "primary",
                  as: Link,
                  to: ROUTE_PATHS.ORGANIZATION_EVENT_CREATE,
                },
              ]),
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <StatCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            helperText={card.helperText}
            loading={isLoading && events.length === 0}
          />
        ))}
      </div>

      {!isManager ? (
        <Card className="border-slate-800/70 bg-slate-950/85">
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr] xl:grid-cols-3">
            <SearchInput
              label="Search events"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search by event name, slug, venue, or category"
            />
            <FilterSelect
              label="Status filter"
              value={query.status || ""}
              onChange={handleStatusFilterChange}
              options={EVENT_STATUS_OPTIONS}
            />
            <div className="flex items-end">
              <div className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-400">
                <span>Sorting is enabled on the main event fields</span>
                <RefreshCw className="h-4 w-4 text-slate-500" />
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-slate-800/70 bg-slate-950/85">
          <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="rounded-2xl bg-app-500/10 p-3 text-app-300 ring-1 ring-app-500/20">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">Assigned scope</p>
              <p className="text-sm leading-6 text-slate-400">
                This page only shows events assigned to your manager account. Event lifecycle and attendance actions
                will come later.
              </p>
            </div>
          </div>
        </Card>
      )}

      {isLoading && events.length === 0 ? (
        <EventTableSkeleton showFilterCard={false} showSummaryCards={false} />
      ) : (
        <>
          <div className="hidden md:block">
            <div className="max-h-[38rem] overflow-auto rounded-3xl border border-slate-800/70">
              <DataTable
                columns={columns}
                data={events}
                isLoading={false}
                sortBy={query.sortBy}
                sortOrder={query.sortOrder}
                onSort={handleSort}
                emptyState={emptyState}
              />
            </div>
          </div>

          <div className="md:hidden">
            {events.length > 0 ? (
              <div className="space-y-3">
                {events.map((event) => (
                  <Card key={event._id || event.id} className="border-slate-800/70 bg-slate-950/85 p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            to={getDetailsRoute(scope, event._id || event.id)}
                            className="block truncate text-base font-semibold text-white transition hover:text-app-300"
                          >
                            {getEventDisplayName(event)}
                          </Link>
                          <p className="truncate text-xs text-slate-500">{event.slug || "No slug"}</p>
                        </div>
                        <StatusBadge status={event.status} />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Schedule</p>
                          <p className="mt-2 text-sm text-slate-200">{getScheduleLabel(event)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Venue</p>
                          <p className="mt-2 text-sm text-slate-200">{getVenueLabel(event)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button as={Link} to={getDetailsRoute(scope, event._id || event.id)} variant="ghost" size="sm">
                          View
                        </Button>
                        {!isManager ? (
                          <Button as={Link} to={getEditRoute(scope, event._id || event.id)} variant="secondary" size="sm">
                            Edit
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-800/70 bg-slate-950/85 p-4">{emptyState}</div>
            )}
          </div>

          {pagination?.totalPages > 1 ? (
            <Pagination
              page={pagination.page || 1}
              totalPages={pagination.totalPages || 0}
              totalItems={pagination.totalItems || 0}
              onPageChange={(page) => loadEvents({ page }).catch(() => {})}
            />
          ) : null}
        </>
      )}

      {error && events.length > 0 ? (
        <Card className="border-rose-500/20 bg-rose-500/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-rose-200">Refresh failed</p>
              <p className="text-sm text-rose-100/80">{error}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              Try again
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export default EventsPage;
