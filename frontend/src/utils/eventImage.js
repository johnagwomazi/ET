import { BACKEND_ORIGIN } from "../constants/app.constants";

function getApiOrigin() {
  return BACKEND_ORIGIN;
}

export function getEventImageUrl(eventOrUrl) {
  const rawUrl = typeof eventOrUrl === "string"
    ? eventOrUrl
    : eventOrUrl?.banner?.url || (typeof eventOrUrl?.banner === "string" ? eventOrUrl.banner : "");

  if (!rawUrl || typeof rawUrl !== "string") return "";

  const trimmedUrl = rawUrl.trim();
  const browserOrigin = globalThis.location?.origin || "";
  const apiOrigin = getApiOrigin();

  try {
    const resolvedUrl = new URL(trimmedUrl, apiOrigin || browserOrigin);
    if (!["http:", "https:"].includes(resolvedUrl.protocol)) return "";

    if (
      globalThis.location?.protocol === "https:" &&
      resolvedUrl.protocol === "http:" &&
      apiOrigin &&
      resolvedUrl.hostname === new URL(apiOrigin).hostname
    ) {
      resolvedUrl.protocol = "https:";
    }

    return resolvedUrl.toString();
  } catch {
    return "";
  }
}
