export function buildEventSlug(sourceValue, fallbackId) {
  const slugSource = String(sourceValue || "").trim().toLowerCase();
  const normalizedSlug = slugSource.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  if (normalizedSlug) {
    return normalizedSlug;
  }

  const fallbackSuffix = fallbackId ? fallbackId.toString().slice(-6) : "draft";
  return `event-${fallbackSuffix}`;
}
