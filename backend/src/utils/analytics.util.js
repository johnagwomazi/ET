import {
  ANALYTICS_DATE_PRESET,
  ANALYTICS_PERIOD,
} from "../constants/analytics.constants.js";

const MINUTES_TO_MS = 60 * 1000;

function parseDateOnly(value, endOfDay, timezoneOffsetMinutes) {
  const [year, month, day] = value.split("-").map(Number);
  const localUtc = Date.UTC(year, month - 1, day + (endOfDay ? 1 : 0));
  const boundary = localUtc - timezoneOffsetMinutes * MINUTES_TO_MS - (endOfDay ? 1 : 0);
  return new Date(boundary);
}

function parseBoundary(value, endOfDay, timezoneOffsetMinutes) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseDateOnly(value, endOfDay, timezoneOffsetMinutes);
  }

  return new Date(value);
}

function localBoundary(now, timezoneOffsetMinutes, selector) {
  const local = new Date(now.getTime() + timezoneOffsetMinutes * MINUTES_TO_MS);
  const selected = selector(local);
  return new Date(selected - timezoneOffsetMinutes * MINUTES_TO_MS);
}

export function resolveAnalyticsDateRange(query = {}, now = new Date()) {
  const preset = query.preset || ANALYTICS_DATE_PRESET.THIS_MONTH;
  const timezoneOffsetMinutes = Number(query.timezoneOffsetMinutes || 0);

  if (preset === ANALYTICS_DATE_PRESET.ALL) {
    return { preset, start: null, end: null, timezoneOffsetMinutes };
  }

  if (preset === ANALYTICS_DATE_PRESET.CUSTOM) {
    return {
      preset,
      start: parseBoundary(query.startDate, false, timezoneOffsetMinutes),
      end: parseBoundary(query.endDate, true, timezoneOffsetMinutes),
      timezoneOffsetMinutes,
    };
  }

  const end = new Date(now);
  let start;

  if (preset === ANALYTICS_DATE_PRESET.TODAY) {
    start = localBoundary(now, timezoneOffsetMinutes, (local) =>
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
    );
  } else if (preset === ANALYTICS_DATE_PRESET.THIS_WEEK) {
    start = localBoundary(now, timezoneOffsetMinutes, (local) => {
      const mondayOffset = (local.getUTCDay() + 6) % 7;
      return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - mondayOffset);
    });
  } else {
    start = localBoundary(now, timezoneOffsetMinutes, (local) =>
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1)
    );
  }

  return { preset, start, end, timezoneOffsetMinutes };
}

export function formatTimezoneOffset(timezoneOffsetMinutes = 0) {
  const sign = timezoneOffsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(timezoneOffsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

export function analyticsPeriodToMongoUnit(period) {
  return {
    [ANALYTICS_PERIOD.DAILY]: "day",
    [ANALYTICS_PERIOD.WEEKLY]: "week",
    [ANALYTICS_PERIOD.MONTHLY]: "month",
  }[period] || "day";
}

export function toMinorUnits(value) {
  return Math.round((Number(value) || 0) * 100);
}

export function fromMinorUnits(value) {
  return Math.round(Number(value || 0)) / 100;
}

export function calculateRate(numerator, denominator) {
  if (!Number(denominator)) {
    return 0;
  }

  return Math.round((Number(numerator || 0) / Number(denominator)) * 10000) / 100;
}

export function mapAnalyticsRange(range) {
  return {
    preset: range.preset,
    startDate: range.start ? range.start.toISOString() : null,
    endDate: range.end ? range.end.toISOString() : null,
    timezoneOffsetMinutes: range.timezoneOffsetMinutes,
  };
}

