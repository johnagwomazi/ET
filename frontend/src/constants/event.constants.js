export const EVENT_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  POSTPONED: "POSTPONED",
  CANCELED: "CANCELED",
  COMPLETED: "COMPLETED",
};

export const EVENT_STATUS_META = {
  [EVENT_STATUS.DRAFT]: {
    label: "Draft",
    tone: "neutral",
  },
  [EVENT_STATUS.PUBLISHED]: {
    label: "Published",
    tone: "success",
  },
  [EVENT_STATUS.POSTPONED]: {
    label: "Postponed",
    tone: "warning",
  },
  [EVENT_STATUS.CANCELED]: {
    label: "Canceled",
    tone: "danger",
  },
  [EVENT_STATUS.COMPLETED]: {
    label: "Completed",
    tone: "success",
  },
};

export const EVENT_STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: EVENT_STATUS.DRAFT, label: EVENT_STATUS_META[EVENT_STATUS.DRAFT].label },
  { value: EVENT_STATUS.PUBLISHED, label: EVENT_STATUS_META[EVENT_STATUS.PUBLISHED].label },
  { value: EVENT_STATUS.POSTPONED, label: EVENT_STATUS_META[EVENT_STATUS.POSTPONED].label },
  { value: EVENT_STATUS.CANCELED, label: EVENT_STATUS_META[EVENT_STATUS.CANCELED].label },
  { value: EVENT_STATUS.COMPLETED, label: EVENT_STATUS_META[EVENT_STATUS.COMPLETED].label },
];
