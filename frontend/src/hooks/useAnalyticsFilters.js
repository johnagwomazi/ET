import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ANALYTICS_DEFAULT_FILTERS } from "../constants/analytics.constants";

const ALLOWED_PRESETS = new Set(["today", "this_week", "this_month", "custom", "all"]);
const ALLOWED_PERIODS = new Set(["daily", "weekly", "monthly"]);

export function useAnalyticsFilters({ eventId: fixedEventId = "", allowEvent = false } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchKey = searchParams.toString();

  const filters = useMemo(() => {
    const presetValue = searchParams.get("preset") || ANALYTICS_DEFAULT_FILTERS.preset;
    const periodValue = searchParams.get("period") || ANALYTICS_DEFAULT_FILTERS.period;
    return {
      preset: ALLOWED_PRESETS.has(presetValue) ? presetValue : ANALYTICS_DEFAULT_FILTERS.preset,
      startDate: searchParams.get("startDate") || "",
      endDate: searchParams.get("endDate") || "",
      eventId: fixedEventId || (allowEvent ? searchParams.get("eventId") || "" : ""),
      period: ALLOWED_PERIODS.has(periodValue) ? periodValue : ANALYTICS_DEFAULT_FILTERS.period,
    };
  }, [allowEvent, fixedEventId, searchKey]);

  const setFilters = useCallback((updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") next.delete(key);
      else next.set(key, value);
    });
    if (updates.preset && updates.preset !== "custom") {
      next.delete("startDate");
      next.delete("endDate");
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const validationError = useMemo(() => {
    if (filters.preset !== "custom") return "";
    if (!filters.startDate || !filters.endDate) return "Select both dates to load this range.";
    if (filters.startDate > filters.endDate) return "Start date must be before or equal to end date.";
    return "";
  }, [filters.endDate, filters.preset, filters.startDate]);

  const query = useMemo(() => ({
    preset: filters.preset,
    ...(filters.preset === "custom" ? { startDate: filters.startDate, endDate: filters.endDate } : {}),
    ...(filters.eventId ? { eventId: filters.eventId } : {}),
    timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
  }), [filters.endDate, filters.eventId, filters.preset, filters.startDate]);

  return { filters, setFilters, query, validationError, canRequest: !validationError };
}

