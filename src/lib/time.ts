/** Short relative time for feeds and comments: "just now", "5m ago", "3h ago", "2d ago", then a date. */
export function timeAgo(date: Date | string, now: Date = new Date()): string {
  const then = new Date(date);
  const seconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(then.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}
