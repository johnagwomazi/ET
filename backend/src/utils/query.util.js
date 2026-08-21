export function toPositiveInteger(value, fallback) {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  return fallback;
}

export function buildPaginationOptions(query = {}, defaults = {}) {
  const page = toPositiveInteger(query.page, defaults.page || 1);
  const limit = toPositiveInteger(query.limit, defaults.limit || 10);
  const sortBy = typeof query.sortBy === "string" && query.sortBy.trim() ? query.sortBy.trim() : defaults.sortBy || "createdAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sortBy,
    sortOrder,
    search: typeof query.search === "string" ? query.search.trim() : "",
  };
}

export function buildPaginationMeta(totalItems, paginationOptions) {
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / paginationOptions.limit);

  return {
    page: paginationOptions.page,
    limit: paginationOptions.limit,
    totalItems,
    totalPages,
  };
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
