import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import Card from "../ui/Card";
import StatusBadge from "../dashboard/StatusBadge";
import { Skeleton } from "../common/Skeleton";
import { formatDate } from "../../utils/formatters";
import { classNames } from "../../utils/classNames";
import { ROUTE_PATHS } from "../../routes/routePaths";
import { getEventImageUrl } from "../../utils/eventImage";

function formatEventTime(value) {
  if (!value) {
    return "Time TBA";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time TBA";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getVenueLabel(event) {
  return event?.venue?.name || event?.venue?.address?.city || event?.venue?.address?.line1 || "Venue details pending";
}

function PublicEventCard({ event, className, spotlight = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const eventHref = ROUTE_PATHS.PUBLIC_EVENT_DETAILS.replace(":eventId", event?.id || "");
  const imageUrl = getEventImageUrl(event);

  return (
    <Card
      className={classNames(
        "group h-full overflow-hidden p-0 transition duration-200 hover:-translate-y-1 hover:border-slate-700",
        className
      )}
    >
      <Link to={eventHref} className="flex h-full flex-col focus:outline-none">
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
          {imageUrl && !imageFailed ? (
            <img
              src={imageUrl}
              alt={event.eventName || "Event banner"}
              className="block h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              onError={() => setImageFailed(true)}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-900">
              <div className="space-y-2 text-center">
                <Ticket className="mx-auto h-8 w-8 text-slate-500" />
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Event preview</p>
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-black/20" />

          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            {event?.isFeatured ? (
              <span className="rounded-full bg-slate-950/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white ring-1 ring-slate-700">
                Featured
              </span>
            ) : null}
            {spotlight ? (
              <span className="rounded-full bg-[rgba(52,92,255,0.18)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white ring-1 ring-app-500/20">
                Popular
              </span>
            ) : null}
          </div>

          {event?.status ? (
            <div className="absolute right-4 top-4">
              <StatusBadge status={event.status} />
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-300">
              {event?.category || "Event"}
            </p>
            <h3 className="line-clamp-2 text-base font-semibold text-white transition group-hover:text-app-300">
              {event?.eventName || "Untitled event"}
            </h3>
          </div>

          <div className="space-y-2 text-sm text-slate-400">
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 flex-none text-slate-500" />
              <span>
                {formatDate(event?.startAt)} at {formatEventTime(event?.startAt)}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 flex-none text-slate-500" />
              <span>{getVenueLabel(event)}</span>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}

function PublicEventCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden p-0">
      <div className="aspect-[16/10] bg-slate-900">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="h-5 w-5/6 rounded-xl" />
        <Skeleton className="h-5 w-4/6 rounded-xl" />
        <Skeleton className="h-4 w-3/4 rounded-full" />
        <Skeleton className="h-4 w-2/3 rounded-full" />
      </div>
    </Card>
  );
}

export { PublicEventCardSkeleton };
export default PublicEventCard;
