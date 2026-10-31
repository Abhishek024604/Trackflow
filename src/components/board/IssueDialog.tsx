'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { PRIORITIES, PRIORITY_LABELS, type IssuePriority } from '@/lib/issues';
import { displayName, type BoardColumnData, type BoardIssue, type BoardMember, type IssueFormValues } from './types';

interface IssueDialogProps {
  /** The issue being edited; omit to create a new one. */
  issue?: BoardIssue | null;
  columns: BoardColumnData[];
  members: BoardMember[];
  defaultStatus?: string;
  /** Resolves to an error message to show, or null on success. */
  onSubmit: (values: IssueFormValues) => Promise<string | null>;
  onDelete?: () => Promise<string | null>;
  onClose: () => void;
}

const fieldClass =
  'w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
const labelClass = 'mb-1 block text-xs font-medium text-zinc-400';

export function IssueDialog({ issue, columns, members, defaultStatus, onSubmit, onDelete, onClose }: IssueDialogProps) {
  const isEdit = !!issue;
  const [values, setValues] = useState<IssueFormValues>({
    title: issue?.title ?? '',
    description: issue?.description ?? '',
    priority: issue?.priority ?? 'MEDIUM',
    status: issue?.status ?? defaultStatus ?? columns[0]?.name ?? '',
    assigneeId: issue?.assigneeId ?? null,
  });
  const [titleError, setTitleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = <K extends keyof IssueFormValues>(key: K, value: IssueFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) {
      setTitleError('Title is required');
      titleRef.current?.focus();
      return;
    }
    setTitleError(null);
    setError(null);
    setBusy(true);
    const message = await onSubmit({ ...values, title: values.title.trim() });
    setBusy(false);
    if (message) setError(message);
  };

  const remove = async () => {
    if (!onDelete) return;
    setBusy(true);
    const message = await onDelete();
    setBusy(false);
    if (message) setError(message);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-dialog-title"
        className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl"
      >
        <form onSubmit={submit} noValidate>
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
            <h2 id="issue-dialog-title" className="text-sm font-medium text-zinc-200">
              {isEdit ? 'Issue details' : 'New issue'}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 px-5 py-4">
            <div>
              <label htmlFor="issue-title" className={labelClass}>Title</label>
              <input
                id="issue-title"
                ref={titleRef}
                value={values.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Issue title"
                aria-invalid={!!titleError}
                aria-describedby={titleError ? 'issue-title-error' : undefined}
                className={fieldClass}
              />
              {titleError && (
                <p id="issue-title-error" role="alert" className="mt-1 text-xs text-red-400">{titleError}</p>
              )}
            </div>

            <div>
              <label htmlFor="issue-description" className={labelClass}>Description</label>
              <textarea
                id="issue-description"
                value={values.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Add a description…"
                rows={4}
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="issue-status" className={labelClass}>Status</label>
                <select id="issue-status" value={values.status} onChange={(e) => set('status', e.target.value)} className={fieldClass}>
                  {columns.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="issue-priority" className={labelClass}>Priority</label>
                <select
                  id="issue-priority"
                  value={values.priority}
                  onChange={(e) => set('priority', e.target.value as IssuePriority)}
                  className={fieldClass}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="issue-assignee" className={labelClass}>Assignee</label>
                <select
                  id="issue-assignee"
                  value={values.assigneeId ?? ''}
                  onChange={(e) => set('assigneeId', e.target.value || null)}
                  className={fieldClass}
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{displayName(m)}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-zinc-800 px-5 py-3">
            <div>
              {isEdit && onDelete && (
                <button
                  type="button"
                  onClick={remove}
                  disabled={busy}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  Delete issue
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800">
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {isEdit ? 'Save changes' : 'Create issue'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
