'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare, Pencil, Reply, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Markdown } from '@/components/comments/Markdown';
import { CommentComposer } from '@/components/comments/CommentComposer';
import { mentionHandle, type MentionableUser } from '@/lib/mentions';
import { timeAgo } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { CommentDto } from '@/lib/comments';

// Threaded comments for one issue (FR-007, AC-001 to AC-006, AC-012).
// STORY-002's issue detail view can mount <CommentThread issueId=... /> as is.

export const COMMENT_PREVIEW_LENGTH = 5000;

export interface CommentThreadProps {
  issueId: string;
  currentUserId: string;
  members: MentionableUser[];
  /** Called with the number of visible comments whenever it changes (board badge, AC-011). */
  onCountChange?: (count: number) => void;
}

type Status = 'loading' | 'error' | 'ready';

interface Node {
  comment: CommentDto;
  replies: Node[];
}

function buildTree(comments: CommentDto[]): Node[] {
  const byId = new Map<string, Node>();
  comments.forEach((c) => byId.set(c.id, { comment: c, replies: [] }));
  const roots: Node[] = [];
  comments.forEach((c) => {
    const node = byId.get(c.id)!;
    const parent = c.parentId ? byId.get(c.parentId) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  });
  return roots;
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return body?.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function CommentThread({ issueId, currentUserId, members, onCountChange }: CommentThreadProps) {
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [actionError, setActionError] = useState<string | null>(null);

  const mentionHandles = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      set.add(mentionHandle(m));
      set.add(m.email.split('@')[0].toLowerCase());
    });
    return set;
  }, [members]);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await fetch(`/api/issues/${issueId}/comments`);
      if (!response.ok) throw new Error('load failed');
      const body = await response.json();
      setComments(body.comments ?? []);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [issueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleCount = comments.filter((c) => !c.deleted).length;
  useEffect(() => {
    if (status === 'ready') onCountChange?.(visibleCount);
  }, [visibleCount, status, onCountChange]);

  const create = async (text: string, parentId?: string) => {
    setActionError(null);
    const response = await fetch(`/api/issues/${issueId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, parentId }),
    });
    if (!response.ok) {
      setActionError(await readError(response, 'Could not post your comment. Please try again.'));
      return false;
    }
    const body = await response.json();
    setComments((prev) => [...prev, body.comment]);
    return true;
  };

  const update = async (id: string, text: string) => {
    setActionError(null);
    const response = await fetch(`/api/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      setActionError(await readError(response, 'Could not save your changes.'));
      return false;
    }
    const body = await response.json();
    setComments((prev) => prev.map((c) => (c.id === id ? body.comment : c)));
    return true;
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this comment?')) return;
    setActionError(null);
    const response = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setActionError(await readError(response, 'Could not delete the comment.'));
      return;
    }
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, deleted: true, text: '', mentionedUserIds: [] } : c))
    );
  };

  const tree = buildTree(comments);

  return (
    <section aria-label="Comments" className="space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
        <MessageSquare className="h-4 w-4 text-gray-400" />
        Comments
        {status === 'ready' && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {visibleCount}
          </span>
        )}
      </h2>

      {status === 'loading' && <CommentSkeleton />}

      {status === 'error' && (
        <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
          We couldn&apos;t load the comments.{' '}
          <button type="button" onClick={() => void load()} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && tree.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center dark:border-gray-700">
          <MessageSquare className="mx-auto mb-2 h-6 w-6 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">No comments yet</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Start the conversation. Mention a teammate with @.</p>
        </div>
      )}

      {status === 'ready' && tree.length > 0 && (
        <ul className="space-y-3">
          {tree.map((node) => (
            <CommentNode
              key={node.comment.id}
              node={node}
              depth={0}
              currentUserId={currentUserId}
              members={members}
              mentionHandles={mentionHandles}
              onReply={create}
              onUpdate={update}
              onDelete={remove}
            />
          ))}
        </ul>
      )}

      {actionError && (
        <p role="alert" className="text-xs text-red-500">
          {actionError}
        </p>
      )}

      {status === 'ready' && <CommentComposer members={members} onSubmit={(text) => create(text)} />}
    </section>
  );
}

interface CommentNodeProps {
  node: Node;
  depth: number;
  currentUserId: string;
  members: MentionableUser[];
  mentionHandles: Set<string>;
  onReply: (text: string, parentId?: string) => Promise<boolean>;
  onUpdate: (id: string, text: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
}

function CommentNode({ node, depth, currentUserId, members, mentionHandles, onReply, onUpdate, onDelete }: CommentNodeProps) {
  const { comment, replies } = node;
  const [mode, setMode] = useState<'view' | 'edit' | 'reply'>('view');
  const [expanded, setExpanded] = useState(false);
  const isOwn = comment.author.id === currentUserId;
  const authorName = comment.author.name ?? comment.author.email;
  const isLong = comment.text.length > COMMENT_PREVIEW_LENGTH;
  const shownText = isLong && !expanded ? `${comment.text.slice(0, COMMENT_PREVIEW_LENGTH)}…` : comment.text;

  return (
    <li className={cn(depth > 0 && 'ml-6 border-l border-gray-200 pl-4 dark:border-gray-700')}>
      {comment.deleted ? (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs italic text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
          {replies.length > 0 ? 'Parent comment deleted' : 'Comment deleted'}
        </p>
      ) : (
        <article
          aria-label={`Comment by ${authorName}`}
          className="group rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-border dark:bg-card"
        >
          <header className="mb-1 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
              {authorName[0]?.toUpperCase()}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{authorName}</span>
            <time dateTime={comment.createdAt} className="text-xs text-gray-500 dark:text-gray-400">
              {timeAgo(comment.createdAt)}
            </time>
            {comment.edited && <span className="text-xs text-gray-400">(edited)</span>}
            <div className="ml-auto flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <IconButton label="Reply" onClick={() => setMode('reply')}>
                <Reply className="h-3.5 w-3.5" />
              </IconButton>
              {isOwn && (
                <>
                  <IconButton label="Edit" onClick={() => setMode('edit')}>
                    <Pencil className="h-3.5 w-3.5" />
                  </IconButton>
                  <IconButton label="Delete" onClick={() => void onDelete(comment.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </>
              )}
            </div>
          </header>

          {mode === 'edit' ? (
            <CommentComposer
              members={members}
              initialText={comment.text}
              submitLabel="Save"
              autoFocus
              onCancel={() => setMode('view')}
              onSubmit={async (text) => {
                const ok = await onUpdate(comment.id, text);
                if (ok) setMode('view');
                return ok;
              }}
            />
          ) : (
            <>
              <Markdown text={shownText} mentionHandles={mentionHandles} className="text-gray-800 dark:text-gray-200" />
              {isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </>
          )}
        </article>
      )}

      {mode === 'reply' && (
        <div className="ml-6 mt-2">
          <CommentComposer
            members={members}
            submitLabel="Reply"
            placeholder={`Reply to ${authorName}…`}
            autoFocus
            onCancel={() => setMode('view')}
            onSubmit={async (text) => {
              const ok = await onReply(text, comment.id);
              if (ok) setMode('view');
              return ok;
            }}
          />
        </div>
      )}

      {replies.length > 0 && (
        <ul className="mt-2 space-y-2">
          {replies.map((child) => (
            <CommentNode
              key={child.comment.id}
              node={child}
              depth={depth + 1}
              currentUserId={currentUserId}
              members={members}
              mentionHandles={mentionHandles}
              onReply={onReply}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="h-7 w-7 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
    >
      {children}
    </Button>
  );
}

export function CommentSkeleton() {
  return (
    <div data-testid="comments-skeleton" className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="mb-2 flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="mb-1.5 h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
