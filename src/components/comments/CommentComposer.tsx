'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { mentionHandle, type MentionableUser } from '@/lib/mentions';

export interface CommentComposerProps {
  members: MentionableUser[];
  onSubmit: (text: string) => Promise<boolean>;
  initialText?: string;
  submitLabel?: string;
  placeholder?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
}

const TRIGGER_PATTERN = /(^|[^\w@])@([\w.-]*)$/;

/** Textarea with @mention autocomplete (team members only) and "Comment cannot be empty" validation. */
export function CommentComposer({
  members,
  onSubmit,
  initialText = '',
  submitLabel = 'Post',
  placeholder = 'Leave a comment… Use @ to mention a teammate',
  onCancel,
  autoFocus,
}: CommentComposerProps) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listId = useId();

  const suggestions = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return members
      .filter(
        (m) =>
          mentionHandle(m).includes(q) ||
          (m.name ?? '').toLowerCase().includes(q) ||
          m.email.toLowerCase().startsWith(q)
      )
      .slice(0, 6);
  }, [members, query]);

  const updateQuery = (value: string, caret: number) => {
    const match = value.slice(0, caret).match(TRIGGER_PATTERN);
    setQuery(match ? match[2] : null);
    setActive(0);
  };

  const insertMention = (member: MentionableUser) => {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@[\w.-]*$/, `@${mentionHandle(member)} `);
    const next = before + text.slice(caret);
    setText(next);
    setQuery(null);
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(before.length, before.length);
      }
    });
  };

  const submit = async () => {
    if (!text.trim()) {
      setError('Comment cannot be empty');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const ok = await onSubmit(text.trim());
      if (ok && !initialText) setText('');
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => (a + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(suggestions[active]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setQuery(null);
        return;
      }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="relative"
    >
      <textarea
        ref={textareaRef}
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => {
          setText(e.target.value);
          if (error && e.target.value.trim()) setError(null);
          updateQuery(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        placeholder={placeholder}
        rows={3}
        aria-label="Comment"
        aria-invalid={Boolean(error)}
        aria-autocomplete="list"
        aria-controls={suggestions.length > 0 ? listId : undefined}
        className={cn(
          'w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/60 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500',
          error ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
        )}
      />

      {suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Mention a teammate"
          className="absolute left-0 z-20 mt-1 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {suggestions.map((m, i) => (
            <li
              key={m.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(m);
              }}
              className={cn(
                'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm',
                i === active
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                  : 'text-gray-700 dark:text-gray-200'
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium dark:bg-gray-700">
                {(m.name ?? m.email)[0]?.toUpperCase()}
              </span>
              <span className="truncate">{m.name ?? m.email}</span>
              <span className="ml-auto text-xs text-gray-400">@{mentionHandle(m)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <p role={error ? 'alert' : undefined} className="text-xs text-red-500">
          {error ?? ''}
        </p>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={submitting}
            className="bg-indigo-600 text-white hover:bg-indigo-500"
          >
            {submitting ? 'Posting…' : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
