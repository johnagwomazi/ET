export const WITHDRAWAL_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  PROCESSING: "PROCESSING",
  PAID: "PAID",
  REJECTED: "REJECTED",
  FAILED: "FAILED",
};

export const WITHDRAWAL_STATUS_META = {
  PENDING: { label: "Pending", tone: "warning", description: "Waiting for Super Admin review" },
  APPROVED: { label: "Approved", tone: "info", description: "Approved and awaiting transfer processing" },
  PROCESSING: { label: "Processing", tone: "info", description: "Bank transfer is processing" },
  PAID: { label: "Completed", tone: "success", description: "Bank transfer confirmed" },
  REJECTED: { label: "Rejected", tone: "danger", description: "Request declined during review" },
  FAILED: { label: "Failed", tone: "danger", description: "Transfer could not be completed" },
};

export const TRANSFER_STATUS_META = {
  NOT_STARTED: { label: "Not started", tone: "neutral" },
  PROCESSING: { label: "Processing", tone: "info" },
  OTP: { label: "Awaiting transfer authorization", tone: "warning" },
  SUCCESS: { label: "Completed", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  REVERSED: { label: "Reversed", tone: "danger" },
  UNKNOWN: { label: "Verification required", tone: "warning" },
};

export const WITHDRAWAL_STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  ...Object.entries(WITHDRAWAL_STATUS_META).map(([value, meta]) => ({ value, label: meta.label })),
];

export const FINANCE_PAGE_SIZE = 10;

