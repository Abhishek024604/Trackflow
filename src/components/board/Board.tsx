'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { PriorityBadge, PRIORITY_STYLES } from './PriorityBadge';
import { displayName, initials, type BoardColumnData, type BoardIssue } from './types';

interface BoardProps {
  columns: BoardColumnData[];
  issues: BoardIssue[];
  onMove: (issueId: string, status: string) => void;
  onOpen: (issue: BoardIssue) => void;
}

/** Kanban board: one column per status; cards move by drag and drop or the per-card "Move to" menu. */
export function Board({ columns, issues, onMove, onOpen }: BoardProps) {
  const draggedId = useRef<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const drop = (status: string) => {
    const id = draggedId.current;
    draggedId.current = null;
    setOverColumn(null);
    if (!id) return;
    const issue = issues.find((i) => i.id === id);
    if (issue && issue.status !== status) onMove(id, status);
  };

  return (
    <div className="flex h-full gap-3 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnIssues = issues.filter((i) => i.status === column.name);
        return (
          <section
            key={column.id}
            aria-label={column.name}
            data-testid={`column-${column.name}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (overColumn !== column.name) setOverColumn(column.name);
            }}
            onDragLeave={() => setOverColumn((c) => (c === column.name ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              drop(column.name);
            }}
            className={cn(
              'flex w-72 flex-shrink-0 flex-col rounded-lg bg-zinc-900/50 transition-colors',
              overColumn === column.name && 'bg-zinc-800/70 ring-1 ring-indigo-500/40'
            )}
          >
            <header className="flex items-center gap-2 px-3 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} aria-hidden />
              <h2 className="text-[13px] font-medium text-zinc-200">{column.name}</h2>
              <span className="text-xs text-zinc-500">{columnIssues.length}</span>
            </header>

            <ul className="flex min-h-[120px] flex-1 flex-col gap-2 px-2 pb-2">
              {columnIssues.length === 0 && (
                <li className="rounded-md border border-dashed border-zinc-800 px-3 py-6 text-center text-xs text-zinc-500">
                  No issues here. Drag one in.
                </li>
              )}
              {columnIssues.map((issue) => (
                <li key={issue.id}>
                  <article
                    draggable
                    data-testid="issue-card"
                    onDragStart={(e) => {
                      draggedId.current = issue.id;
                      try {
                        e.dataTransfer.setData('text/plain', issue.id);
                        e.dataTransfer.effectAllowed = 'move';
                      } catch {
                        // dataTransfer is unavailable in some environments; the ref carries the id.
                      }
                    }}
                    onDragEnd={() => setOverColumn(null)}
                    className={cn(
                      'group cursor-grab rounded-md border border-l-2 border-zinc-800 bg-zinc-900 p-3 shadow-sm',
                      'transition-colors hover:border-zinc-700 hover:bg-zinc-800/80 active:cursor-grabbing',
                      PRIORITY_STYLES[issue.priority].accent
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onOpen(issue)}
                      title={issue.title}
                      className="block w-full truncate text-left text-[13px] font-medium text-zinc-100 focus:outline-none focus-visible:underline"
                    >
                      {issue.title}
                    </button>
                    {issue.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{issue.description}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <PriorityBadge priority={issue.priority} />
                      <div className="flex items-center gap-2">
                        <label className="sr-only" htmlFor={`move-${issue.id}`}>
                          Move {issue.title}
                        </label>
                        <select
                          id={`move-${issue.id}`}
                          value={issue.status}
                          onChange={(e) => onMove(issue.id, e.target.value)}
                          className="rounded border border-zinc-800 bg-zinc-950 px-1 py-0.5 text-[11px] text-zinc-400 opacity-70 focus:opacity-100 group-hover:opacity-100"
                        >
                          {columns.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {issue.assignee ? (
                          <span
                            title={displayName(issue.assignee)}
                            aria-label={`Assigned to ${displayName(issue.assignee)}`}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/30 text-[10px] font-semibold text-indigo-200"
                          >
                            {initials(issue.assignee)}
                          </span>
                        ) : (
                          <span
                            title="Unassigned"
                            aria-label="Unassigned"
                            className="h-5 w-5 rounded-full border border-dashed border-zinc-600"
                          />
                        )}
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
