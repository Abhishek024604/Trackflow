'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, Search } from 'lucide-react';
import { Board } from './Board';
import { BoardSkeleton } from './BoardSkeleton';
import { IssueDialog } from './IssueDialog';
import { SignOutButton } from '@/components/SignOutButton';
import { displayName, type BoardData, type BoardIssue, type IssueFormValues } from './types';

type DialogState = { mode: 'create' } | { mode: 'edit'; issue: BoardIssue } | null;

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.error || fallback;
  } catch {
    return fallback;
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function BoardClient({ teamId, openNewIssue = false }: { teamId: string; openNewIssue?: boolean }) {
  const [data, setData] = useState<BoardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [query, setQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/boards/${teamId}`);
      if (!res.ok) {
        setLoadError(await readError(res, 'Could not load the board'));
        return;
      }
      setData(await res.json());
    } catch {
      setLoadError('Could not load the board');
    }
  }, [teamId]);

  useEffect(() => {
    load();
  }, [load]);

  // Arriving with ?new=1 opens "New issue" once the board has loaded; the flag is then dropped
  // from the URL so a refresh or Back does not reopen it.
  const [pendingNewIssue, setPendingNewIssue] = useState(openNewIssue);
  useEffect(() => {
    if (!pendingNewIssue || !data) return;
    setPendingNewIssue(false);
    setDialog({ mode: 'create' });
    const url = new URL(window.location.href);
    if (url.searchParams.has('new')) {
      url.searchParams.delete('new');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
  }, [pendingNewIssue, data]);

  // Keyboard shortcut: C opens "New issue" (ignored while typing or with modifiers).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'c' && e.key !== 'C') return;
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (dialog || !data) return;
      e.preventDefault();
      setDialog({ mode: 'create' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, data]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const replaceIssue = (issue: BoardIssue) =>
    setData((d) => (d ? { ...d, issues: d.issues.map((i) => (i.id === issue.id ? issue : i)) } : d));

  const moveIssue = async (issueId: string, status: string) => {
    if (!data) return;
    const previous = data.issues.find((i) => i.id === issueId);
    if (!previous) return;
    // Optimistic move, rolled back if the server refuses it.
    replaceIssue({ ...previous, status });
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        replaceIssue(previous);
        setNotice(await readError(res, 'Could not move the issue'));
        return;
      }
      const body = await res.json();
      replaceIssue(body.issue);
    } catch {
      replaceIssue(previous);
      setNotice('Could not move the issue');
    }
  };

  const createIssue = async (values: IssueFormValues): Promise<string | null> => {
    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, ...values }),
    });
    if (!res.ok) return readError(res, 'Could not create the issue');
    const body = await res.json();
    setData((d) => (d ? { ...d, issues: [body.issue, ...d.issues] } : d));
    setDialog(null);
    return null;
  };

  const updateIssue = async (issue: BoardIssue, values: IssueFormValues): Promise<string | null> => {
    const changes: Partial<IssueFormValues> = {};
    if (values.title !== issue.title) changes.title = values.title;
    if (values.description !== (issue.description ?? '')) changes.description = values.description;
    if (values.priority !== issue.priority) changes.priority = values.priority;
    if (values.assigneeId !== issue.assigneeId) changes.assigneeId = values.assigneeId;
    if (values.status !== issue.status) changes.status = values.status;
    if (Object.keys(changes).length === 0) {
      setDialog(null);
      return null;
    }
    const res = await fetch(`/api/issues/${issue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
    if (!res.ok) return readError(res, 'Could not save the issue');
    const body = await res.json();
    replaceIssue(body.issue);
    setDialog(null);
    return null;
  };

  const deleteIssue = async (issue: BoardIssue): Promise<string | null> => {
    const res = await fetch(`/api/issues/${issue.id}`, { method: 'DELETE' });
    if (!res.ok) return readError(res, 'Could not delete the issue');
    setData((d) => (d ? { ...d, issues: d.issues.filter((i) => i.id !== issue.id) } : d));
    setDialog(null);
    return null;
  };

  const visibleIssues = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.issues.filter((i) => {
      if (assigneeFilter === 'unassigned' ? i.assigneeId !== null : assigneeFilter && i.assigneeId !== assigneeFilter) {
        return false;
      }
      if (!q) return true;
      return i.title.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q);
    });
  }, [data, query, assigneeFilter]);

  const filtering = query.trim() !== '' || assigneeFilter !== '';

  return (
    <div className="flex min-h-screen flex-col bg-background text-zinc-200">
      <header className="flex h-14 items-center justify-between gap-4 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/teams/${teamId}`}
            aria-label="Back to team"
            title="Back to team"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="truncate text-sm font-semibold text-zinc-100">{data?.team.name ?? 'Board'}</h1>
          <span className="hidden whitespace-nowrap text-sm text-zinc-400 sm:inline">/ Board</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setDialog({ mode: 'create' })}
            disabled={!data}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            New issue
            <kbd className="ml-1 hidden rounded border border-white/30 px-1 text-[10px] font-normal text-indigo-100 sm:inline">C</kbd>
          </button>
          <SignOutButton />
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-zinc-800/80 px-4 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            aria-label="Search issues"
            placeholder="Search issues"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-56 rounded-md border border-zinc-800 bg-zinc-900 pl-7 pr-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          aria-label="Filter by assignee"
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="h-8 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {data?.members.map((m) => (
            <option key={m.id} value={m.id}>{displayName(m)}</option>
          ))}
        </select>
      </div>

      {notice && (
        <div role="alert" className="mx-4 mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {notice}
        </div>
      )}

      <main className="flex-1 p-4">
        {loadError ? (
          <div className="mx-auto mt-16 max-w-sm text-center">
            <p className="text-sm text-zinc-300">{loadError}</p>
            <button type="button" onClick={load} className="mt-3 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
              Try again
            </button>
          </div>
        ) : !data ? (
          <BoardSkeleton />
        ) : data.issues.length === 0 ? (
          <div className="mx-auto mt-16 max-w-sm text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
              <Plus className="h-5 w-5 text-zinc-500" />
            </div>
            <h2 className="text-sm font-medium text-zinc-200">No issues yet</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Create the first issue for your team. Press <kbd className="rounded border border-zinc-700 px-1">C</kbd> anytime.
            </p>
            <button
              type="button"
              onClick={() => setDialog({ mode: 'create' })}
              className="mt-4 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Create issue
            </button>
          </div>
        ) : (
          <>
            {filtering && visibleIssues.length === 0 && (
              <p className="mb-3 text-xs text-zinc-400">No issues match your filters.</p>
            )}
            <Board
              columns={data.columns}
              issues={visibleIssues}
              onMove={moveIssue}
              onOpen={(issue) => setDialog({ mode: 'edit', issue })}
            />
          </>
        )}
      </main>

      {dialog && data && (
        <IssueDialog
          key={dialog.mode === 'edit' ? dialog.issue.id : 'new'}
          issue={dialog.mode === 'edit' ? dialog.issue : null}
          columns={data.columns}
          members={data.members}
          onSubmit={(values) =>
            dialog.mode === 'edit' ? updateIssue(dialog.issue, values) : createIssue(values)
          }
          onDelete={dialog.mode === 'edit' ? () => deleteIssue(dialog.issue) : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
