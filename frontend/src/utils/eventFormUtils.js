import { z } from "zod";

const optionalDescriptionSchema = z.string().trim().max(5000, "Description must be 5000 characters or less").optional().or(z.literal(""));
const optionalCategorySchema = z.string().trim().max(80, "Category must be 80 characters or less").optional().or(z.literal(""));
const optionalTextSchema = z.string().trim().max(255, "Value must be 255 characters or less").optional().or(z.literal(""));
const optionalUrlSchema = z.string().trim().url("Please provide a valid URL").optional().or(z.literal(""));

function isValidDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value) {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

function trimText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeOptionalValue(value) {
  const trimmed = trimText(value);

  return trimmed || "";
}

function parseDateTime(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDateInputValue(value) {
  const date = parseDateTime(value);

  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTimeInputValue(value) {
  const date = parseDateTime(value);

  if (!date) {
    return "";
  }

  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${hours}:${minutes}`;
}

function combineDateAndTime(dateValue, timeValue) {
  if (!isValidDate(dateValue) || !isValidTime(timeValue)) {
    return null;
  }

  const combined = new Date(`${dateValue}T${timeValue}:00`);

  if (Number.isNaN(combined.getTime())) {
    return null;
  }

  return combined;
}

function buildVenue(values = {}) {
  const venue = {};

  const name = normalizeOptionalValue(values.venueName);
  const line1 = normalizeOptionalValue(values.venueLine1);
  const line2 = normalizeOptionalValue(values.venueLine2);
  const city = normalizeOptionalValue(values.venueCity);
  const state = normalizeOptionalValue(values.venueState);
  const country = normalizeOptionalValue(values.venueCountry);
  const postalCode = normalizeOptionalValue(values.venuePostalCode);
  const notes = normalizeOptionalValue(values.venueNotes);

  if (name) {
    venue.name = name;
  }

  const address = {};

  if (line1) {
    address.line1 = line1;
  }

  if (line2) {
    address.line2 = line2;
  }

  if (city) {
    address.city = city;
  }

  if (state) {
    address.state = state;
  }

  if (country) {
    address.country = country;
  }

  if (postalCode) {
    address.postalCode = postalCode;
  }

  if (Object.keys(address).length > 0) {
    venue.address = address;
  }

  if (notes) {
    venue.notes = notes;
  }

  return venue;
}

function buildBanner(values = {}) {
  const bannerUrl = normalizeOptionalValue(values.bannerUrl);

  if (!bannerUrl) {
    return undefined;
  }

  return {
    url: bannerUrl,
  };
}

function createBaseSchema({ includeSchedule = true } = {}) {
  return z
    .object({
      eventName: z.string().trim().min(1, "Event name is required").max(120, "Event name must be 120 characters or less"),
      description: optionalDescriptionSchema,
      category: optionalCategorySchema,
      bannerUrl: optionalUrlSchema,
      venueName: optionalTextSchema,
      venueLine1: optionalTextSchema,
      venueLine2: optionalTextSchema,
      venueCity: optionalTextSchema,
      venueState: optionalTextSchema,
      venueCountry: optionalTextSchema,
      venuePostalCode: optionalTextSchema,
      venueNotes: z.string().trim().max(500, "Venue notes must be 500 characters or less").optional().or(z.literal("")),
      capacity: z.coerce.number().int("Capacity must be a whole number").min(1, "Capacity must be at least 1"),
      eventDate: includeSchedule ? z.string().min(1, "Event date is required") : z.string().optional().or(z.literal("")),
      startTime: includeSchedule ? z.string().min(1, "Start time is required") : z.string().optional().or(z.literal("")),
      endTime: includeSchedule ? z.string().min(1, "End time is required") : z.string().optional().or(z.literal("")),
    })
    .refine(
      (values) => {
        if (!includeSchedule) {
          return true;
        }

        return Boolean(combineDateAndTime(values.eventDate, values.startTime));
      },
      {
        message: "Please provide a valid event start date and time",
        path: ["startTime"],
      }
    )
    .refine(
      (values) => {
        if (!includeSchedule) {
          return true;
        }

        return Boolean(combineDateAndTime(values.eventDate, values.endTime));
      },
      {
        message: "Please provide a valid event end date and time",
        path: ["endTime"],
      }
    )
    .refine(
      (values) => {
        if (!includeSchedule) {
          return true;
        }

        const startAt = combineDateAndTime(values.eventDate, values.startTime);
        const endAt = combineDateAndTime(values.eventDate, values.endTime);

        if (!startAt || !endAt) {
          return true;
        }

        return endAt > startAt;
      },
      {
        message: "End time must be after start time",
        path: ["endTime"],
      }
    );
}

export function createEventFormSchema() {
  return createBaseSchema({ includeSchedule: true });
}

export function editEventFormSchema() {
  return createBaseSchema({ includeSchedule: false });
}

export function buildEventFormValues(event = null) {
  return {
    eventName: event?.eventName || "",
    description: event?.description || "",
    category: event?.category || "",
    bannerUrl: event?.banner?.url || "",
    venueName: event?.venue?.name || "",
    venueLine1: event?.venue?.address?.line1 || "",
    venueLine2: event?.venue?.address?.line2 || "",
    venueCity: event?.venue?.address?.city || "",
    venueState: event?.venue?.address?.state || "",
    venueCountry: event?.venue?.address?.country || "",
    venuePostalCode: event?.venue?.address?.postalCode || "",
    venueNotes: event?.venue?.notes || "",
    eventDate: formatDateInputValue(event?.startAt),
    startTime: formatTimeInputValue(event?.startAt),
    endTime: formatTimeInputValue(event?.endAt),
    capacity: event?.capacity ?? "",
  };
}

export function buildEventPayload(values = {}, mode = "create") {
  const payload = {
    eventName: normalizeOptionalValue(values.eventName),
    description: normalizeOptionalValue(values.description),
    category: normalizeOptionalValue(values.category),
    capacity: Number(values.capacity),
  };

  const banner = buildBanner(values);
  const venue = buildVenue(values);

  if (banner) {
    payload.banner = banner;
  }

  if (Object.keys(venue).length > 0) {
    payload.venue = venue;
  }

  if (mode === "create") {
    const startAt = combineDateAndTime(values.eventDate, values.startTime);
    const endAt = combineDateAndTime(values.eventDate, values.endTime);

    if (startAt) {
      payload.startAt = startAt;
    }

    if (endAt) {
      payload.endAt = endAt;
    }
  }

  return payload;
}

export function getEventFormDefaultValues(event = null) {
  return buildEventFormValues(event);
}

export function getEventPreviewUrl(values = {}, fallbackUrl = "") {
  const nextUrl = normalizeOptionalValue(values.bannerUrl);

  return nextUrl || fallbackUrl || "";
}

export function getEventScheduleLabel(event = null) {
  if (!event) {
    return "Schedule not set";
  }

  return `${formatDateInputValue(event.startAt)} ${formatTimeInputValue(event.startAt)} - ${formatTimeInputValue(event.endAt)}`;
}
