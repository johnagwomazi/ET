const RESERVED_EVENT_SLUGS = new Set([
  "discover",
  "new",
  "edit",
  "admin",
  "api",
  "auth",
  "checkout",
  "customer",
  "login",
  "manager",
  "organization",
  "payment",
  "register",
  "signup",
  "super-admin",
  "tickets",
]);

export function buildEventSlug(sourceValue, fallbackId) {
  const slugSource = String(sourceValue || "").trim().toLowerCase();
  const normalizedSlug = slugSource
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");

  if (normalizedSlug) {
    return normalizedSlug;
  }

  const fallbackSuffix = fallbackId ? fallbackId.toString().slice(-6) : "draft";
  return `event-${fallbackSuffix}`;
}

export function isReservedEventSlug(slug) {
  return RESERVED_EVENT_SLUGS.has(buildEventSlug(slug));
}

export function isEventSlugInputValid(sourceValue) {
  const normalized = buildEventSlug(sourceValue);
  return Boolean(String(sourceValue || "").trim())
    && normalized !== "event-draft"
    && !isReservedEventSlug(normalized);
}

export function hasEventEnded(event, now = new Date()) {
  if (!event?.endAt) return false;
  const endAt = new Date(event?.endAt).getTime();
  const currentTime = new Date(now).getTime();
  return Number.isFinite(endAt) && Number.isFinite(currentTime) && endAt <= currentTime;
}
