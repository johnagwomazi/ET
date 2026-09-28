const configuredFrontendUrl = String(import.meta.env.VITE_FRONTEND_URL || "")
  .trim()
  .replace(/\/$/, "");

export function normalizeEventSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");
}

export function getPublicEventPath(eventOrIdentifier) {
  const identifier = typeof eventOrIdentifier === "object"
    ? eventOrIdentifier?.slug || eventOrIdentifier?.id || eventOrIdentifier?._id
    : eventOrIdentifier;
  return `/events/${encodeURIComponent(identifier || "")}`;
}

export function getPublicEventUrl(eventOrIdentifier) {
  const origin = configuredFrontendUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin}${getPublicEventPath(eventOrIdentifier)}`;
}
