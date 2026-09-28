export function isEventEnded(event, now = new Date()) {
  if (!event?.endAt) return Boolean(event?.hasEnded);

  const endTime = new Date(event.endAt).getTime();
  const currentTime = new Date(now).getTime();

  return Number.isFinite(endTime)
    && Number.isFinite(currentTime)
    && endTime <= currentTime;
}
