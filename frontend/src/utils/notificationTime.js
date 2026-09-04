export function formatNotificationTime(value, now = new Date()) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Recently";

  const elapsedMs = Math.max(0, now.getTime() - date.getTime());
  const minutes = Math.floor(elapsedMs / 60000);
  const hours = Math.floor(elapsedMs / 3600000);
  const days = Math.floor(elapsedMs / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(date);
}

