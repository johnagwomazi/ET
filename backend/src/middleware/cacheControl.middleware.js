const PUBLIC_CACHE_PATTERN = /^\/api\/events(?:\/|$)/;

export default function cacheControlMiddleware(req, res, next) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Cache-Control", "no-store");
    return next();
  }

  if (PUBLIC_CACHE_PATTERN.test(req.path) && !req.path.endsWith("/ticket-types")) {
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    return next();
  }

  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  return next();
}
