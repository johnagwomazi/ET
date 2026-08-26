import * as eventRepository from "../repositories/event.repository.js";
import { buildPaginationMeta, buildPaginationOptions, escapeRegex } from "../utils/query.util.js";
import {
  PUBLIC_DISCOVERY_STATUSES,
  isPubliclyDiscoverableEvent,
  mapPublicEventResponse,
} from "../utils/eventDiscovery.util.js";

const defaultDependencies = {
  eventRepository,
};

const DISCOVERY_SORTS = {
  upcoming: { startAt: 1, createdAt: -1 },
  newest: { createdAt: -1 },
  dateAsc: { startAt: 1 },
  dateDesc: { startAt: -1 },
  featured: { isFeatured: -1, featuredAt: -1, startAt: 1, createdAt: -1 },
  trending: { isFeatured: -1, startAt: 1, createdAt: -1 },
};

const DEFAULT_DISCOVERY_LIMIT = 12;
const SPOTLIGHT_LIMIT = 6;

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getUtcStartOfDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function getUtcEndOfDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function addUtcDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function getWeekStart(date) {
  const start = getUtcStartOfDay(date);
  const day = start.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + delta);
  return start;
}

function getWeekEnd(date) {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return getUtcEndOfDay(end);
}

function getMonthStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function getMonthEnd(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function getUpcomingWeekendRange(date) {
  const startOfDay = getUtcStartOfDay(date);
  const day = startOfDay.getUTCDay();
  const daysUntilSaturday = (6 - day + 7) % 7;
  const saturday = addUtcDays(startOfDay, daysUntilSaturday);
  const sunday = addUtcDays(saturday, 1);

  return {
    start: saturday,
    end: getUtcEndOfDay(sunday),
  };
}

function buildDateRange(query = {}) {
  if (query.dateFrom || query.dateTo) {
    return {
      ...(query.dateFrom ? { $gte: query.dateFrom } : {}),
      ...(query.dateTo ? { $lte: query.dateTo } : {}),
    };
  }

  if (!query.dateFilter) {
    return null;
  }

  const now = new Date();

  if (query.dateFilter === "today") {
    return {
      $gte: getUtcStartOfDay(now),
      $lte: getUtcEndOfDay(now),
    };
  }

  if (query.dateFilter === "tomorrow") {
    const tomorrow = addUtcDays(now, 1);
    return {
      $gte: getUtcStartOfDay(tomorrow),
      $lte: getUtcEndOfDay(tomorrow),
    };
  }

  if (query.dateFilter === "thisWeek") {
    return {
      $gte: getWeekStart(now),
      $lte: getWeekEnd(now),
    };
  }

  if (query.dateFilter === "thisWeekend") {
    const weekendRange = getUpcomingWeekendRange(now);

    return {
      $gte: weekendRange.start,
      $lte: weekendRange.end,
    };
  }

  if (query.dateFilter === "thisMonth") {
    return {
      $gte: getMonthStart(now),
      $lte: getMonthEnd(now),
    };
  }

  return null;
}

function buildLocationFilter(query = {}) {
  const filter = {};

  if (query.category) {
    filter.category = new RegExp(`^${escapeRegex(normalizeString(query.category))}$`, "i");
  }

  if (query.city) {
    filter["venue.address.city"] = new RegExp(`^${escapeRegex(normalizeString(query.city))}$`, "i");
  }

  if (query.state) {
    filter["venue.address.state"] = new RegExp(`^${escapeRegex(normalizeString(query.state))}$`, "i");
  }

  if (query.country) {
    filter["venue.address.country"] = new RegExp(`^${escapeRegex(normalizeString(query.country))}$`, "i");
  }

  if (query.venue) {
    filter.$or = [
      ...(filter.$or || []),
      { "venue.name": new RegExp(escapeRegex(normalizeString(query.venue)), "i") },
      { "venue.address.line1": new RegExp(escapeRegex(normalizeString(query.venue)), "i") },
    ];
  }

  return filter;
}

function buildVisibilityFilter(query = {}) {
  const filter = {
    status: {
      $in: PUBLIC_DISCOVERY_STATUSES,
    },
  };

  if (query.featured === true) {
    filter.isFeatured = true;
  }

  const locationFilter = buildLocationFilter(query);
  Object.assign(filter, locationFilter);

  const dateRange = buildDateRange(query);

  if (dateRange) {
    filter.startAt = dateRange;
  }

  return filter;
}

function buildSearchFilter(search) {
  const normalizedSearch = normalizeString(search);

  if (!normalizedSearch) {
    return null;
  }

  return {
    $text: {
      $search: normalizedSearch,
    },
  };
}

function resolveSort(query = {}, hasSearch = false) {
  const sortKey = query.sort || (query.trending ? "trending" : query.featured ? "featured" : "upcoming");
  const sort = DISCOVERY_SORTS[sortKey] || DISCOVERY_SORTS.upcoming;

  if (hasSearch) {
    return {
      score: { $meta: "textScore" },
      ...sort,
    };
  }

  return sort;
}

function mapPublicEvents(events = []) {
  return events.map(mapPublicEventResponse).filter(Boolean);
}

async function loadSpotlightEvents(dependencies = defaultDependencies) {
  const spotlightVisibilityFilter = {
    status: {
      $in: PUBLIC_DISCOVERY_STATUSES,
    },
  };

  const [featuredEvents, trendingEvents] = await Promise.all([
    dependencies.eventRepository.findPublicEvents(
      {
        ...spotlightVisibilityFilter,
        isFeatured: true,
      },
      {
        sort: {
          featuredAt: -1,
          startAt: 1,
          createdAt: -1,
        },
        limit: SPOTLIGHT_LIMIT,
      }
    ),
    dependencies.eventRepository.findPublicEvents(spotlightVisibilityFilter, {
      sort: {
        isFeatured: -1,
        startAt: 1,
        createdAt: -1,
      },
      limit: SPOTLIGHT_LIMIT,
    }),
  ]);

  return {
    featuredEvents: mapPublicEvents(featuredEvents),
    trendingEvents: mapPublicEvents(trendingEvents),
  };
}

export async function discoverPublicEvents(query = {}, dependencies = defaultDependencies) {
  const pagination = buildPaginationOptions(query, {
    page: 1,
    limit: DEFAULT_DISCOVERY_LIMIT,
    sortBy: "startAt",
    sortOrder: 1,
  });
  const visibilityFilter = buildVisibilityFilter(query);
  const searchFilter = buildSearchFilter(query.search);
  const hasSearch = Boolean(searchFilter);
  const sort = resolveSort(query, hasSearch);
  const filter = hasSearch ? { ...visibilityFilter, ...searchFilter } : visibilityFilter;

  const [events, totalItems, spotlight] = await Promise.all([
    dependencies.eventRepository.findPublicEvents(filter, {
      sort,
      skip: pagination.skip,
      limit: pagination.limit,
    }),
    dependencies.eventRepository.countPublicEvents(filter),
    loadSpotlightEvents(dependencies),
  ]);

  const mappedEvents = events.map((event) => {
    if (!isPubliclyDiscoverableEvent(event)) {
      return null;
    }

    return mapPublicEventResponse(event);
  }).filter(Boolean);

  return {
    events: mappedEvents,
    featuredEvents: spotlight.featuredEvents,
    trendingEvents: spotlight.trendingEvents,
    pagination: buildPaginationMeta(totalItems, pagination),
  };
}
