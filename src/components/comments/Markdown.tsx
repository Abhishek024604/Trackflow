import * as React from 'react';
import { cn } from '@/lib/utils';

// A tiny, safe Markdown renderer for comments (AC-012): **bold**, *italic*, `code`,
// ``` code blocks ```, [links](https://...) and @mentions. It builds React nodes (never
// raw HTML), and only http(s) links are rendered as links.

const INLINE_PATTERN =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))|((?:^|(?<=[^\w@]))@[\w][\w.-]*)|(\*[^*\n]+\*)/g;

const FENCE_PATTERN = /```[\w-]*\n?([\s\S]*?)```/g;

export interface MarkdownProps {
  text: string;
  /** Lower-cased handles that resolve to team members; only these are highlighted. */
  mentionHandles?: Set<string>;
  className?: string;
}

function renderInline(text: string, mentionHandles: Set<string>, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of Array.from(text.matchAll(INLINE_PATTERN))) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;

    if (match[1]) {
      nodes.push(
        <code key={key} className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-pink-600 dark:bg-gray-900 dark:text-pink-300">
          {token.slice(1, -1)}
        </code>
      );
    } else if (match[2]) {
      nodes.push(
        <strong key={key} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (match[3]) {
      const label = token.slice(1, token.indexOf(']('));
      const href = token.slice(token.indexOf('](') + 2, -1);
      nodes.push(
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400"
        >
          {label}
        </a>
      );
    } else if (match[4]) {
      const handle = token.slice(1).replace(/[.-]+$/, '');
      const trailing = token.slice(1 + handle.length);
      if (mentionHandles.has(handle.toLowerCase())) {
        nodes.push(
          <span
            key={key}
            data-testid="mention"
            className="rounded bg-indigo-100 px-1 font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
          >
            @{handle}
          </span>
        );
        if (trailing) nodes.push(trailing);
      } else {
        nodes.push(token);
      }
    } else if (match[5]) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    last = start + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderParagraphs(text: string, mentionHandles: Set<string>, keyPrefix: string): React.ReactNode[] {
  return text
    .split(/\n{2,}/)
    .filter((p) => p.trim().length > 0)
    .map((paragraph, pIndex) => {
      const lines = paragraph.replace(/^\n+|\n+$/g, '').split('\n');
      return (
        <p key={`${keyPrefix}-p${pIndex}`} className="whitespace-pre-wrap break-words">
          {lines.map((line, lIndex) => (
            <React.Fragment key={lIndex}>
              {lIndex > 0 && <br />}
              {renderInline(line, mentionHandles, `${keyPrefix}-p${pIndex}-l${lIndex}`)}
            </React.Fragment>
          ))}
        </p>
      );
    });
}

export function Markdown({ text, mentionHandles = new Set(), className }: MarkdownProps) {
  const blocks: React.ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of Array.from(text.matchAll(FENCE_PATTERN))) {
    const start = match.index ?? 0;
    blocks.push(...renderParagraphs(text.slice(last, start), mentionHandles, `b${index}`));
    blocks.push(
      <pre
        key={`code-${index}`}
        className="overflow-x-auto rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
      >
        <code>{match[1].replace(/\n$/, '')}</code>
      </pre>
    );
    last = start + match[0].length;
    index++;
  }
  blocks.push(...renderParagraphs(text.slice(last), mentionHandles, `b${index}`));

  return <div className={cn('space-y-2 text-sm leading-relaxed', className)}>{blocks}</div>;
}
