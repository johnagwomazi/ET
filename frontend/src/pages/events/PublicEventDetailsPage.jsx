import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Globe,
  MapPin,
  Ticket,
  Tag,
  Building2,
  Info,
} from "lucide-react";
import GuestNavbar from "../../components/layout/GuestNavbar";
import CustomerFooter from "../../components/layout/CustomerFooter";
import BackButton from "../../components/layout/BackButton";
import Avatar from "../../components/dashboard/Avatar";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import PageContainer from "../../components/ui/PageContainer";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { Skeleton } from "../../components/common/Skeleton";
import { ROUTE_PATHS } from "../../routes/routePaths";
import { getPublicEventById } from "../../services/publicEvent.service";
import { formatDate, formatDateTime, formatNumber } from "../../utils/formatters";

function formatTime(value) {
  if (!value) {
    return "TBA";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "TBA";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function joinLocationParts(parts = []) {
  return parts.filter(Boolean).join(", ");
}

function getLocationLines(event) {
  const venue = event?.venue || {};
  const address = venue.address || {};

  const primaryLocation = joinLocationParts([
    address.line1,
    address.line2,
  ]);

  const secondaryLocation = joinLocationParts([
    address.city,
    address.state,
    address.country,
  ]);

  return {
    venueName: venue.name || "Venue details pending",
    primaryLocation,
    secondaryLocation,
    postalCode: address.postalCode || "",
  };
}

function getSocialLinks(socialLinks) {
  if (!socialLinks || typeof socialLinks !== "object") {
    return [];
  }

  return Object.entries(socialLinks)
    .map(([key, value]) => ({
      label: key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .trim(),
      url: typeof value === "string" ? value.trim() : "",
    }))
    .filter((item) => item.url);
}

function PublicEventDetailsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading event details">
      <Card className="overflow-hidden p-0">
        <Skeleton className="aspect-[21/9] w-full rounded-none" />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card className="space-y-4">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-10 w-4/5 rounded-2xl" />
            <Skeleton className="h-4 w-3/5 rounded-full" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          </Card>

          <Card className="space-y-4">
            <Skeleton className="h-4 w-40 rounded-full" />
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-[92%] rounded-full" />
            <Skeleton className="h-4 w-[85%] rounded-full" />
            <Skeleton className="h-4 w-[78%] rounded-full" />
          </Card>

          <Card className="space-y-4">
            <Skeleton className="h-4 w-36 rounded-full" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-5 w-2/3 rounded-full" />
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-[90%] rounded-full" />
          </Card>

          <Card className="space-y-4">
            <Skeleton className="h-4 w-40 rounded-full" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailsItem({ icon: Icon, label, value, className }) {
  return (
    <div className={className}>
      <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="rounded-xl bg-[rgba(52,92,255,0.18)] p-2 text-app-300 ring-1 ring-app-500/20">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
        </div>
      </div>
    </div>
  );
}

function PublicEventDetailsError({ title, message, onRetry }) {
  return (
    <PageContainer className="py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <Card className="space-y-5 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-white">{title}</h1>
            <p className="text-sm leading-6 text-slate-400">{message}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {onRetry ? (
              <Button onClick={onRetry}>
                <Info className="h-4 w-4" />
                Try again
              </Button>
            ) : null}
            <Button as={Link} to={ROUTE_PATHS.HOME} variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back to discovery
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

function PublicEventDetailsPage() {
  const params = useParams();
  const eventId = params.eventId;

  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [bannerFailed, setBannerFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const isReload = Boolean(event && event.id === eventId);

    async function loadEvent() {
      if (!eventId) {
        setError("Event ID is missing");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (event && event.id !== eventId) {
        setEvent(null);
      }

      if (isReload) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const response = await getPublicEventById(eventId, { signal });
        const nextEvent = response?.event || null;

        setEvent(nextEvent);
        setBannerFailed(false);
      } catch (loadError) {
        if (signal.aborted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load event details");
        setEvent(null);
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    loadEvent().catch(() => {});

    return () => controller.abort();
  }, [eventId, reloadToken]);

  const location = useMemo(() => getLocationLines(event), [event]);
  const socialLinks = useMemo(() => getSocialLinks(event?.organization?.socialLinks), [event?.organization?.socialLinks]);
  const capacityLabel = useMemo(() => formatNumber(event?.capacity || 0), [event?.capacity]);
  const isPostponed = event?.status === "POSTPONED";
  const scheduleLabel = useMemo(() => {
    if (!event) {
      return "TBA";
    }

    return `${formatDate(event.startAt)} at ${formatTime(event.startAt)}`;
  }, [event]);

  if (isLoading && !event) {
    return (
      <div className="min-h-screen app-shell">
        <GuestNavbar />
        <main className="pb-10">
          <PageContainer className="py-6 sm:py-8">
            <BackButton to={ROUTE_PATHS.HOME} label="Back to discovery" />
          </PageContainer>
          <PageContainer>
            <PublicEventDetailsSkeleton />
          </PageContainer>
        </main>
        <CustomerFooter />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen app-shell">
        <GuestNavbar />
        <main className="pb-10">
          <PublicEventDetailsError title="Unable to load event" message={error} onRetry={() => setReloadToken((current) => current + 1)} />
        </main>
        <CustomerFooter />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen app-shell">
        <GuestNavbar />
        <main className="pb-10">
          <PublicEventDetailsError
            title="Event not found"
            message="The requested public event could not be loaded."
            onRetry={() => setReloadToken((current) => current + 1)}
          />
        </main>
        <CustomerFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell">
      <GuestNavbar />

      <main className="pb-10">
        <PageContainer className="py-6 sm:py-8">
          <BackButton to={ROUTE_PATHS.HOME} label="Back to discovery" />
        </PageContainer>

        <PageContainer className="space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="relative overflow-hidden bg-slate-950">
              <div className="aspect-[21/9] w-full bg-slate-950 sm:aspect-[16/7]">
                {event.banner?.url && !bannerFailed ? (
                  <img
                    src={event.banner.url}
                    alt={event.eventName || "Event banner"}
                    className="h-full w-full object-cover"
                    onError={() => setBannerFailed(true)}
                    loading="eager"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-900">
                    <div className="space-y-2 text-center">
                      <Ticket className="mx-auto h-10 w-10 text-slate-500" />
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Event banner</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute inset-0 bg-black/35" />

              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <div className="max-w-4xl space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={event.status} />
                    {event.category ? (
                      <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
                        {event.category}
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                      {event.eventName || "Untitled event"}
                    </h1>
                    <p className="max-w-3xl text-sm leading-6 text-slate-200 sm:text-base">
                      {scheduleLabel}
                      {location.venueName ? ` · ${location.venueName}` : ""}
                      {location.secondaryLocation ? ` · ${location.secondaryLocation}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {isPostponed && event?.lifecycle?.reason ? (
            <Card className="border-amber-500/20 bg-amber-500/10">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-500/15 p-2 text-amber-300 ring-1 ring-amber-500/20">
                  <Info className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-amber-100">Event postponed</p>
                  <p className="text-sm leading-6 text-amber-50/85">{event.lifecycle.reason}</p>
                </div>
              </div>
            </Card>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <Card className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-app-300">Description</p>
                  <h2 className="text-xl font-semibold text-white">Event details</h2>
                </div>

                {event.description ? (
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">{event.description}</p>
                ) : (
                  <p className="text-sm leading-7 text-slate-400">No description has been provided for this event yet.</p>
                )}
              </Card>

              <Card className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-app-300">Event information</p>
                  <h2 className="text-xl font-semibold text-white">Key details</h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailsItem icon={CalendarDays} label="Date" value={formatDate(event.startAt)} />
                  <DetailsItem icon={Clock3} label="Time" value={`${formatTime(event.startAt)} - ${formatTime(event.endAt)}`} />
                  <DetailsItem icon={MapPin} label="Venue" value={location.venueName} />
                  <DetailsItem icon={Building2} label="Location" value={joinLocationParts([location.primaryLocation, location.secondaryLocation, location.postalCode]) || "Location details pending"} />
                  <DetailsItem icon={Tag} label="Category" value={event.category || "Category not set"} />
                  <DetailsItem icon={Ticket} label="Capacity" value={capacityLabel} />
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-app-300">Organizer</p>
                  <h2 className="text-xl font-semibold text-white">Public organizer information</h2>
                </div>

                <div className="flex items-center gap-4">
                  <Avatar
                    name={event.organization?.organizationName || "Organization"}
                    src={event.organization?.logo?.url || ""}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white">
                      {event.organization?.organizationName || "Organization details unavailable"}
                    </p>
                    {event.organization?.website ? (
                      <a
                        href={event.organization.website}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-white"
                      >
                        <Globe className="h-4 w-4" />
                        Website
                      </a>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">No public website provided.</p>
                    )}
                  </div>
                </div>

                {socialLinks.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Social links</p>
                    <div className="flex flex-wrap gap-2">
                      {socialLinks.map((link) => (
                        <Button
                          key={`${link.label}-${link.url}`}
                          as="a"
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          variant="secondary"
                          size="sm"
                        >
                          {link.label || "Link"}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Card>

              <Card className="space-y-4 border-slate-800/70 bg-slate-950/85">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-app-300">Ticketing</p>
                  <h2 className="text-xl font-semibold text-white">Future ticketing CTA</h2>
                </div>

                <p className="text-sm leading-7 text-slate-400">
                  {event.status === "POSTPONED"
                    ? "This event is postponed. Ticketing will open once the new date is confirmed."
                    : "Ticketing will be added in a future phase. The page is ready for that flow without exposing checkout yet."}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button disabled>
                    <Ticket className="h-4 w-4" />
                    {event.status === "POSTPONED" ? "Tickets paused" : "Get Tickets"}
                  </Button>
                  <Button as={Link} to={ROUTE_PATHS.HOME} variant="secondary">
                    Back to discovery
                  </Button>
                </div>
              </Card>

              <Card className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-app-300" />
                  <p className="text-sm font-semibold text-white">Status summary</p>
                </div>
                <p className="text-sm leading-6 text-slate-400">
                  {isRefreshing ? "Refreshing event details..." : "This public page uses the backend as the source of truth for visibility and status."}
                </p>
                {event.updatedAt ? (
                  <p className="text-xs text-slate-500">Last updated {formatDateTime(event.updatedAt)}</p>
                ) : null}
              </Card>
            </div>
          </div>
        </PageContainer>
      </main>

      <CustomerFooter />
    </div>
  );
}

export default PublicEventDetailsPage;
