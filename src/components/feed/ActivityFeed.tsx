'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, CircleDot, MessageSquare, PencilLine, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { issueHref, type FeedAction } from '@/lib/feed';
import { timeAgo } from '@/lib/time';
import { cn } from '@/lib/utils';

// Team activity feed (FR-008, AC-007 to AC-010). Loads on mount (MVP: no realtime),
// with a manual refresh, an "All team / My activity" filter and "Load more" paging.

export type FeedFilter = 'all' | 'my';

export interface FeedEventDto {
  id: string;
  action: FeedAction | string;
  targetType: string;
  targetId: string;
  description: string;
  timestamp: string;
  actor: { id: string; name: string | null; email: string; image: string | null };
}

export interface ActivityFeedProps {
  teamId: string;
  /** Compact sidebar variant for the workspace page. */
  compact?: boolean;
  pageSize?: number;
  className?: string;
}

type Status = 'loading' | 'error' | 'ready';

const ACTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  issue_created: CircleDot,
  issue_updated: PencilLine,
  comment_added: MessageSquare,
};

const ACTION_TINT: Record<string, string> = {
  issue_created: 'text-emerald-500',
  issue_updated: 'text-amber-500',
  comment_added: 'text-indigo-500',
};

export function ActivityFeed({ teamId, compact = false, pageSize, className }: ActivityFeedProps) {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [events, setEvents] = useState<FeedEventDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams({ teamId, filter });
      if (cursor) params.set('cursor', cursor);
      if (pageSize) params.set('limit', String(pageSize));
      const response = await fetch(`/api/feed?${params.toString()}`);
      if (!response.ok) throw new Error('feed failed');
      return (await response.json()) as { events: FeedEventDto[]; nextCursor: string | null };
    },
    [teamId, filter, pageSize]
  );

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const page = await fetchPage();
      setEvents(page.events);
      setNextCursor(page.nextCursor);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [fetchPage]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(nextCursor);
      setEvents((prev) => [...prev, ...page.events]);
      setNextCursor(page.nextCursor);
    } catch {
      setStatus('error');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section
      aria-label="Team activity"
      className={cn(
        'rounded-lg border border-gray-200 bg-white dark:border-border dark:bg-card',
        className
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-border">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          <Activity className="h-4 w-4 text-indigo-400" />
          Activity
        </h2>
        <div className="flex items-center gap-1">
          <div role="tablist" aria-label="Filter activity" className="flex rounded-md bg-gray-100 p-0.5 text-xs dark:bg-gray-800">
            {(
              [
                ['all', 'All team'],
                ['my', 'My activity'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  'rounded px-2 py-1 font-medium transition-colors',
                  filter === value
                    ? 'bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Refresh activity"
            title="Refresh"
            onClick={() => void load()}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', status === 'loading' && 'animate-spin')} />
          </button>
        </div>
      </header>

      <div className={cn('px-4 py-3', compact && 'max-h-[28rem] overflow-y-auto')}>
        {status === 'loading' && <FeedSkeleton rows={compact ? 4 : 6} />}

        {status === 'error' && (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            We couldn&apos;t load the activity.{' '}
            <button type="button" onClick={() => void load()} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Try again
            </button>
          </p>
        )}

        {status === 'ready' && events.length === 0 && (
          <div className="py-8 text-center">
            <Activity className="mx-auto mb-2 h-6 w-6 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {filter === 'my' ? 'You haven’t done anything yet' : 'No activity yet'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {filter === 'my'
                ? 'Create an issue or leave a comment and it will show up here.'
                : 'When teammates create issues or comment, it shows up here.'}
            </p>
          </div>
        )}

        {status === 'ready' && events.length > 0 && (
          <ol className="space-y-3">
            {events.map((event) => (
              <FeedItem key={event.id} event={event} teamId={teamId} />
            ))}
          </ol>
        )}

        {status === 'ready' && nextCursor && (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="mt-3 w-full rounded-md border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </section>
  );
}

function FeedItem({ event, teamId }: { event: FeedEventDto; teamId: string }) {
  const Icon = ACTION_ICON[event.action] ?? Activity;
  const actorName = event.actor.name ?? event.actor.email;
  const body = (
    <>
      <span className="font-medium text-gray-900 dark:text-gray-100">{actorName}</span>{' '}
      <span className="text-gray-600 dark:text-gray-300">{event.description}</span>
    </>
  );

  return (
    <li className="flex items-start gap-3" data-testid="feed-item">
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
        {actorName[0]?.toUpperCase()}
        <Icon
          className={cn(
            'absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-white p-px dark:bg-card',
            ACTION_TINT[event.action] ?? 'text-gray-400'
          )}
        />
      </span>
      <div className="min-w-0 flex-1 text-sm leading-snug">
        {event.targetType === 'issue' ? (
          <Link href={issueHref(teamId, event.targetId)} className="hover:underline">
            {body}
          </Link>
        ) : (
          body
        )}
        <time dateTime={event.timestamp} className="block text-xs text-gray-500 dark:text-gray-400">
          {timeAgo(event.timestamp)}
        </time>
      </div>
    </li>
  );
}

export function FeedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div data-testid="feed-skeleton" className="space-y-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
