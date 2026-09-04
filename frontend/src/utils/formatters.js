const numberFormatter = new Intl.NumberFormat("en-US");
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "0";
  }

  return numberFormatter.format(Number(value));
}

export function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "$0";
  }

  return currencyFormatter.format(Number(value));
}

export function formatMoney(value, currency = "NGN") {
  const numericValue = Number(value);
  const hasFraction = Number.isFinite(numericValue) && Math.round(numericValue) !== numericValue;

  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(0);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

export function formatPercentage(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "0%";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value))}%`;
}

export function formatCompactMoney(value, currency = "NGN") {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return formatMoney(0, currency);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(numericValue);
}

export function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatStatusLabel(value) {
  if (!value) {
    return "Unknown";
  }

  return String(value)
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getInitials(value) {
  if (!value) {
    return "NA";
  }

  const parts = String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "NA";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function truncateText(value, maxLength = 30) {
  if (!value) {
    return "";
  }

  const text = String(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}
