export const ANALYTICS_DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "custom", label: "Custom range" },
  { value: "all", label: "All time" },
];

export const ANALYTICS_PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export const ANALYTICS_DEFAULT_FILTERS = {
  preset: "this_month",
  startDate: "",
  endDate: "",
  eventId: "",
  period: "daily",
};

export const ANALYTICS_PAGE_SIZE = 10;

