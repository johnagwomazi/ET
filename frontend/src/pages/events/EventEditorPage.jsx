import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import ErrorState from "../../components/common/ErrorState";
import SectionHeader from "../../components/dashboard/SectionHeader";
import { EventFormSkeleton } from "../../components/events/EventLoadingStates";
import EventForm from "../../components/events/EventForm";
import { ROUTE_PATHS } from "../../routes/routePaths";
import * as eventService from "../../services/event.service";
import StatusBadge from "../../components/dashboard/StatusBadge";

function getBackRoute() {
  return ROUTE_PATHS.ORGANIZATION_EVENTS;
}

function EventEditorPage({ mode = "create" }) {
  const navigate = useNavigate();
  const params = useParams();
  const eventId = params.eventId;
  const isEditMode = mode === "edit";

  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(isEditMode));
  const [error, setError] = useState(null);
  const requestControllerRef = useRef(null);

  async function loadEvent() {
    if (!isEditMode) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      const response = await eventService.getOrganizationEventById(eventId, { signal: controller.signal });
      if (controller.signal.aborted) return null;
      const nextEvent = response?.event || null;
      setEvent(nextEvent);
      return nextEvent;
    } catch (loadError) {
      if (controller.signal.aborted) return null;
      const message = loadError instanceof Error ? loadError.message : "Unable to load event";
      setError(message);
      throw loadError;
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!isEditMode) {
      return undefined;
    }

    loadEvent().catch(() => {});
    return () => requestControllerRef.current?.abort();
  }, [eventId, isEditMode]);

  if (isLoading && isEditMode && !event) {
    return <EventFormSkeleton />;
  }

  if (error && isEditMode && !event) {
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

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Organization management"
        title={isEditMode ? "Edit Event" : "Create Event"}
        description={
          isEditMode
            ? "Update this event's details, schedule, venue, capacity, and banner."
            : "Create a draft with the event details needed for publishing."
        }
        actions={[
          {
            label: "Back to events",
            variant: "ghost",
            onClick: () => navigate(getBackRoute()),
          },
        ]}
      />

      {isEditMode && event ? (
        <Card className="border-slate-800/70 bg-slate-950/85">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{event.eventName || "Untitled event"}</p>
              <p className="text-sm text-slate-400">Current status is shown for reference only.</p>
            </div>
            <StatusBadge status={event.status} />
          </div>
        </Card>
      ) : null}

      <EventForm
        mode={mode}
        initialEvent={isEditMode ? event : null}
        onCancel={() => navigate(getBackRoute())}
      />
    </div>
  );
}

export default EventEditorPage;
