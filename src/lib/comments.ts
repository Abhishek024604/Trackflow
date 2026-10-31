import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Comments (CMP-006 comment-api). A deleted comment that still has replies is kept with
// empty text so its replies stay threaded; empty text is never accepted on create/edit,
// so '' unambiguously means "deleted".

export const COMMENT_MAX_LENGTH = 10000;
export const DELETED_TEXT = '';

export const commentTextSchema = z
  .string({ required_error: 'Comment cannot be empty', invalid_type_error: 'Comment cannot be empty' })
  .trim()
  .min(1, 'Comment cannot be empty')
  .max(COMMENT_MAX_LENGTH, `Comment must be at most ${COMMENT_MAX_LENGTH} characters`);

export const createCommentSchema = z.object({
  text: commentTextSchema,
  parentId: z.string().min(1).nullish(),
});

export const updateCommentSchema = z.object({ text: commentTextSchema });

export const commentAuthorSelect = { id: true, name: true, email: true, image: true } as const;

export const commentInclude = {
  author: { select: commentAuthorSelect },
  mentions: { select: { userId: true } },
} as const;

export interface CommentAuthor {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface CommentDto {
  id: string;
  issueId: string;
  parentId: string | null;
  text: string;
  deleted: boolean;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor;
  mentionedUserIds: string[];
}

interface CommentRow {
  id: string;
  issueId: string;
  parentId: string | null;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  author: CommentAuthor;
  mentions?: { userId: string }[];
}

export function toCommentDto(row: CommentRow): CommentDto {
  const deleted = row.text === DELETED_TEXT;
  const created = new Date(row.createdAt);
  const updated = new Date(row.updatedAt);
  return {
    id: row.id,
    issueId: row.issueId,
    parentId: row.parentId,
    text: deleted ? '' : row.text,
    deleted,
    edited: !deleted && updated.getTime() - created.getTime() > 1000,
    createdAt: created.toISOString(),
    updatedAt: updated.toISOString(),
    author: row.author,
    mentionedUserIds: deleted ? [] : (row.mentions ?? []).map((m) => m.userId),
  };
}

/** True when the user belongs to the team. */
export async function isTeamMember(teamId: string, userId: string): Promise<boolean> {
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  return Boolean(membership);
}

/**
 * Loads the issue if the user can see it (member of the issue's team). Returns null for a
 * missing issue and for a non-member alike, so a non-member cannot probe which issues exist.
 */
export async function getIssueForMember(issueId: string, userId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { id: true, teamId: true, title: true },
  });
  if (!issue) return null;
  return (await isTeamMember(issue.teamId, userId)) ? issue : null;
}

/** Team members who can be @mentioned. */
export async function getMentionableMembers(teamId: string) {
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: { user: { select: commentAuthorSelect } },
  });
  return members.map((m) => m.user);
}

/** Comment counts per issue for the board badge (AC-011). Deleted comments are not counted. */
export async function getCommentCounts(issueIds: string[]): Promise<Record<string, number>> {
  if (issueIds.length === 0) return {};
  const rows = await prisma.comment.groupBy({
    by: ['issueId'],
    where: { issueId: { in: issueIds }, NOT: { text: DELETED_TEXT } },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.issueId] = row._count._all;
  return counts;
}
