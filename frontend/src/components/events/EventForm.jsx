import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CalendarDays, Copy, Image as ImageIcon, MapPin, PencilLine, Save, X } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import FormField from "../forms/FormField";
import StatusBadge from "../dashboard/StatusBadge";
import ConfirmationDialog from "../dashboard/ConfirmationDialog";
import { ROUTE_PATHS } from "../../routes/routePaths";
import * as eventService from "../../services/event.service";
import {
  buildEventPayload,
  createEventFormSchema,
  editEventFormSchema,
  getEventBannerFile,
  getEventFormDefaultValues,
} from "../../utils/eventFormUtils";
import { formatDateTime } from "../../utils/formatters";
import { getEventImageUrl } from "../../utils/eventImage";
import { getPublicEventUrl, normalizeEventSlug } from "../../utils/eventUrl";

const fieldErrorToFieldMap = {
  "Event name is required": "eventName",
  "Event name must be 120 characters or less": "eventName",
  "Description must be 5000 characters or less": "description",
  "Category must be 80 characters or less": "category",
  "Banner must be a JPG, PNG, or WebP image": "bannerFile",
  "Banner image must be 5 MB or smaller": "bannerFile",
  "This event URL is already in use": "slug",
  "Choose a valid event URL that is not reserved": "slug",
  "Event URL must be 160 characters or less": "slug",
  "Capacity cannot be negative": "capacity",
  "Capacity must be a whole number": "capacity",
  "Capacity must be at least 1": "capacity",
  "Event capacity cannot be lower than the number of tickets already issued.": "capacity",
  "Event capacity cannot be lower than total ticket allocation. Increase the capacity or reduce ticket allocations first.": "capacity",
  "Event date is required": "eventDate",
  "Start time is required": "startTime",
  "End time is required": "endTime",
  "Please provide a valid event start date and time": "startTime",
  "Please provide a valid event end date and time": "endTime",
  "End time must be after start time": "endTime",
  "Event must be fully configured before it can be published": "eventName",
};

function getEventDetailsRoute(eventId) {
  return `${ROUTE_PATHS.ORGANIZATION_EVENTS}/${eventId}`;
}

function EventBannerPreview({ url, title }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70">
      {url ? (
        <img src={url} alt={title} className="h-56 w-full object-cover" />
      ) : (
        <div className="flex h-56 items-center justify-center px-6 text-center">
          <div className="space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-app-500/10 text-app-300 ring-1 ring-app-500/20">
              <ImageIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-200">Banner preview</p>
            <p className="text-sm leading-6 text-slate-400">
              Choose a banner image from your device to preview it here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function EventForm({ mode = "create", initialEvent = null, onCancel }) {
  const navigate = useNavigate();
  const isEditMode = mode === "edit";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const eventStatus = initialEvent?.status || "DRAFT";
  const canEditSchedule = !isEditMode || eventStatus === "DRAFT";
  const [submitError, setSubmitError] = useState(null);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  const schema = useMemo(
    () => (isEditMode ? editEventFormSchema({ includeSchedule: canEditSchedule }) : createEventFormSchema()),
    [canEditSchedule, isEditMode]
  );
  const defaultValues = useMemo(() => getEventFormDefaultValues(initialEvent), [initialEvent]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const bannerFiles = watch("bannerFile");
  const bannerFile = getEventBannerFile({ bannerFile: bannerFiles });
  const storedBannerUrl = getEventImageUrl(initialEvent);
  const slugValue = watch("slug");
  const eventNameValue = watch("eventName");
  const previewSlug = normalizeEventSlug(slugValue || eventNameValue);
  const shareableUrl = previewSlug ? getPublicEventUrl(previewSlug) : "";
  const persistedShareableUrl = isEditMode && initialEvent?.slug
    ? getPublicEventUrl(initialEvent.slug)
    : "";
  const [previewUrl, setPreviewUrl] = useState(storedBannerUrl);

  useEffect(() => {
    if (!bannerFile) {
      setPreviewUrl(storedBannerUrl);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(bannerFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [bannerFile, storedBannerUrl]);

  function navigateBack() {
    if (typeof onCancel === "function") {
      onCancel();
      return;
    }

    navigate(ROUTE_PATHS.ORGANIZATION_EVENTS);
  }

  function handleCancel() {
    if (isSubmitting) {
      return;
    }

    if (isDirty) {
      setDiscardDialogOpen(true);
      return;
    }

    navigateBack();
  }

  function mapServerErrorToField(errorMessage) {
    return fieldErrorToFieldMap[errorMessage] || null;
  }

  async function copyShareableUrl() {
    try {
      if (!persistedShareableUrl || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(persistedShareableUrl);
      toast.success("Event link copied");
    } catch {
      toast.error("Unable to copy the event link");
    }
  }

  async function submit(values) {
    setIsSubmitting(true);
    setSubmitError(null);


    try {
      const payload = buildEventPayload(values, mode, { includeSchedule: canEditSchedule });
      const selectedBanner = getEventBannerFile(values);
      const response = isEditMode
        ? await eventService.updateEvent(initialEvent?._id || initialEvent?.id, payload, selectedBanner)
        : await eventService.createEvent(payload, selectedBanner);
      const event = response?.event || null;
      const eventId = event?._id || event?.id || initialEvent?._id || initialEvent?.id;

      toast.success(isEditMode ? "Event updated successfully" : "Event draft created successfully");

      if (eventId) {
        navigate(getEventDetailsRoute(eventId));
      } else {
        navigate(ROUTE_PATHS.ORGANIZATION_EVENTS);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      const mappedField = mapServerErrorToField(message);

      if (mappedField) {
        setError(mappedField, {
          type: "server",
          message,
        });
      } else {
        setSubmitError(message);
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form className="space-y-6" onSubmit={handleSubmit(submit)}>
        {submitError ? (
          <Card className="border-rose-500/20 bg-rose-500/10">
            <p className="text-sm font-semibold text-rose-200">Unable to save event</p>
            <p className="mt-1 text-sm text-rose-100/80">{submitError}</p>
          </Card>
        ) : null}

        <Card className="border-slate-800/70 bg-slate-950/85">
          <div className="flex flex-col gap-4 border-b border-slate-800/70 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-300">
                {isEditMode ? "Edit event" : "Create draft"}
              </p>
              <h2 className="text-2xl font-semibold text-white">
                {isEditMode ? "Update event details" : "Create a new event draft"}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-400">
                {isEditMode
                  ? canEditSchedule ? "Update this draft's details, schedule, shareable URL, venue, and capacity." : "Update event details and its shareable URL. Published schedule changes use lifecycle actions."
                  : "Provide the event information that will be saved as a draft and can be refined later."}
              </p>
            </div>

            {isEditMode ? (
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={eventStatus} />
                <span className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-xs text-slate-400">
                  {initialEvent?.slug || "No slug"}
                </span>
              </div>
            ) : (
              <div className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-xs text-slate-400">
                New events are created as drafts.
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-6">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <Input
                  label="Event name"
                  placeholder="Spring Music Festival"
                  error={errors.eventName?.message}
                  {...register("eventName")}
                />

                <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <Input
                    label="Shareable event URL"
                    placeholder="spring-music-festival"
                    error={errors.slug?.message}
                    helperText="Lowercase letters, numbers, and hyphens. Reserved or existing URLs cannot be used."
                    {...register("slug")}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 break-all text-xs text-slate-400">
                      {shareableUrl || "Your Eventidor URL will appear here."}
                    </p>
                    {persistedShareableUrl ? (
                      <Button type="button" variant="secondary" size="sm" onClick={copyShareableUrl}>
                        <Copy className="h-4 w-4" />
                        Copy link
                      </Button>
                    ) : null}
                  </div>
                </div>

                <Input
                  label="Category"
                  placeholder="Concert, Conference, Expo"
                  error={errors.category?.message}
                  {...register("category")}
                />

                <FormField label="Description" error={errors.description?.message} helperText="Optional. Up to 5,000 characters.">
                  <textarea
                    rows={8}
                    placeholder="Write a short description of the event..."
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-app-500 focus:ring-2 focus:ring-app-500/20"
                    {...register("description")}
                  />
                </FormField>
              </div>

              <div className="space-y-4">
                <Input
                  label="Banner image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  error={errors.bannerFile?.message}
                  helperText="JPG, PNG, or WebP. Maximum file size: 5 MB."
                  className="h-auto min-h-11 py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-100 hover:file:bg-slate-600"
                  {...register("bannerFile")}
                />

                <EventBannerPreview url={previewUrl} title={initialEvent?.eventName || "Event banner"} />
              </div>
            </div>

            <Card className="border-slate-800/70 bg-slate-950/70 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-app-500/10 p-3 text-app-300 ring-1 ring-app-500/20">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">Schedule</p>
                  <p className="text-sm leading-6 text-slate-400">
                    {canEditSchedule
                      ? "Draft schedule changes are saved as normal edits and do not postpone the event."
                      : "Published schedule changes must use the existing postponement lifecycle action."}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Input
                  label="Event date"
                  type="date"
                  error={errors.eventDate?.message}
                  disabled={!canEditSchedule}
                  helperText={canEditSchedule ? "Required" : "Use Postpone to change a published schedule"}
                  {...register("eventDate")}
                />
                <Input
                  label="Start time"
                  type="time"
                  error={errors.startTime?.message}
                  disabled={!canEditSchedule}
                  helperText={canEditSchedule ? "Required" : "Use Postpone to change a published schedule"}
                  {...register("startTime")}
                />
                <Input
                  label="End time"
                  type="time"
                  error={errors.endTime?.message}
                  disabled={!canEditSchedule}
                  helperText={canEditSchedule ? "Must be after start time" : "Use Postpone to change a published schedule"}
                  {...register("endTime")}
                />
              </div>

              {isEditMode && !canEditSchedule ? (
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-400">
                  Current schedule: {formatDateTime(initialEvent?.startAt)} to {formatDateTime(initialEvent?.endAt)}
                </div>
              ) : null}
            </Card>

            <Card className="border-slate-800/70 bg-slate-950/70 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-app-500/10 p-3 text-app-300 ring-1 ring-app-500/20">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">Venue</p>
                  <p className="text-sm leading-6 text-slate-400">
                    Add the location details attendees need. Leave optional fields blank when they do not apply.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Input label="Venue name" placeholder="Main Hall" error={errors.venueName?.message} {...register("venueName")} />
                <Input
                  label="Address line 1"
                  placeholder="123 Example Street"
                  error={errors.venueLine1?.message}
                  {...register("venueLine1")}
                />
                <Input
                  label="Address line 2"
                  placeholder="Suite 200"
                  error={errors.venueLine2?.message}
                  {...register("venueLine2")}
                />
                <Input label="City" placeholder="Lagos" error={errors.venueCity?.message} {...register("venueCity")} />
                <Input label="State" placeholder="Lagos State" error={errors.venueState?.message} {...register("venueState")} />
                <Input
                  label="Country"
                  placeholder="Nigeria"
                  error={errors.venueCountry?.message}
                  {...register("venueCountry")}
                />
                <Input
                  label="Postal code"
                  placeholder="100001"
                  error={errors.venuePostalCode?.message}
                  {...register("venuePostalCode")}
                />
                <div className="md:col-span-2">
                  <FormField label="Venue notes" error={errors.venueNotes?.message} helperText="Optional notes for staff and attendees.">
                    <textarea
                      rows={4}
                      placeholder="Parking, access instructions, nearby landmarks..."
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-app-500 focus:ring-2 focus:ring-app-500/20"
                      {...register("venueNotes")}
                    />
                  </FormField>
                </div>
              </div>
            </Card>

            <Card className="border-slate-800/70 bg-slate-950/70 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-app-500/10 p-3 text-app-300 ring-1 ring-app-500/20">
                  <PencilLine className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">Capacity</p>
                  <p className="text-sm leading-6 text-slate-400">
                    Enter the maximum number of attendees for this event. Published-event capacity may be increased at any time.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Input
                  label="Capacity"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="250"
                  error={errors.capacity?.message}
                  helperText={isEditMode
                    ? `${Number(initialEvent?.allocatedTicketQuantity || 0)} ticket(s) are currently issued or reserved. Capacity cannot be reduced below issued tickets or total ticket allocation.`
                    : "Ticket-type allocations cannot exceed this capacity."}
                  {...register("capacity")}
                />
              </div>
            </Card>
          </div>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} loadingText={isEditMode ? "Saving..." : "Creating..."}>
            <Save className="h-4 w-4" />
            {isEditMode ? "Save changes" : "Create draft"}
          </Button>
        </div>
      </form>

      <ConfirmationDialog
        open={discardDialogOpen}
        title="Discard changes?"
        message="You have unsaved changes. Leaving now will discard them."
        confirmText="Discard"
        tone="danger"
        onCancel={() => setDiscardDialogOpen(false)}
        onConfirm={() => {
          setDiscardDialogOpen(false);
          navigateBack();
        }}
      />
    </>
  );
}

export default EventForm;
