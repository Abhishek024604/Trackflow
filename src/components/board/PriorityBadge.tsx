import { cn } from '@/lib/utils';
import { PRIORITY_LABELS, type IssuePriority } from '@/lib/issues';

/** Text/background classes per priority; also used for the card's left accent. */
export const PRIORITY_STYLES: Record<IssuePriority, { badge: string; accent: string; bars: number }> = {
  URGENT: { badge: 'bg-red-500/15 text-red-400 ring-red-500/30', accent: 'border-l-red-500', bars: 4 },
  HIGH: { badge: 'bg-orange-500/15 text-orange-400 ring-orange-500/30', accent: 'border-l-orange-500', bars: 3 },
  MEDIUM: { badge: 'bg-yellow-500/15 text-yellow-300 ring-yellow-500/30', accent: 'border-l-yellow-500', bars: 2 },
  LOW: { badge: 'bg-zinc-500/15 text-zinc-400 ring-zinc-500/30', accent: 'border-l-zinc-600', bars: 1 },
};

export function PriorityBadge({ priority, className }: { priority: IssuePriority; className?: string }) {
  const style = PRIORITY_STYLES[priority];
  return (
    <span
      data-testid="priority-badge"
      data-priority={priority}
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        style.badge,
        className
      )}
    >
      <span aria-hidden className="flex items-end gap-px">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={cn('w-[3px] rounded-sm bg-current', n <= style.bars ? 'opacity-100' : 'opacity-25')}
            style={{ height: 3 + n * 2 }}
          />
        ))}
      </span>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
