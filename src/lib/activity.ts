import { prisma } from '@/lib/prisma';

// Team activity feed (CMP-006 feed-generator). FeedEvent rows follow CMP-007.
// STORY-002's issue handlers call recordIssueCreated / recordIssueUpdated after a successful write.

import type { FeedAction, FeedTargetType } from '@/lib/feed';

export { FEED_PAGE_SIZE, issueHref } from '@/lib/feed';
export type { FeedAction, FeedTargetType } from '@/lib/feed';

export interface ActivityInput {
  teamId: string;
  actorId: string;
  action: FeedAction;
  targetType: FeedTargetType;
  targetId: string;
  description: string;
}

export interface IssueRef {
  id: string;
  teamId: string;
  title: string;
}

type FeedEventDb = { feedEvent: { create: (args: { data: ActivityInput }) => Promise<unknown> } };

/**
 * Writes one feed event. Feed recording must never fail the user's action, so errors are
 * logged (without content) and swallowed; returns null in that case.
 */
export async function recordActivity(input: ActivityInput, db: FeedEventDb = prisma) {
  try {
    return await db.feedEvent.create({ data: input });
  } catch (error) {
    console.error('Failed to record activity', { action: input.action, teamId: input.teamId });
    return null;
  }
}

function quoteTitle(title: string): string {
  const trimmed = title.trim();
  return `"${trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed}"`;
}

export function recordIssueCreated(issue: IssueRef, actorId: string, db?: FeedEventDb) {
  return recordActivity(
    {
      teamId: issue.teamId,
      actorId,
      action: 'issue_created',
      targetType: 'issue',
      targetId: issue.id,
      description: `created issue ${quoteTitle(issue.title)}`,
    },
    db
  );
}

export function recordIssueUpdated(
  issue: IssueRef,
  actorId: string,
  changedFields: string[] = [],
  db?: FeedEventDb
) {
  const changes = changedFields.length > 0 ? ` (${changedFields.join(', ')})` : '';
  return recordActivity(
    {
      teamId: issue.teamId,
      actorId,
      action: 'issue_updated',
      targetType: 'issue',
      targetId: issue.id,
      description: `updated issue ${quoteTitle(issue.title)}${changes}`,
    },
    db
  );
}

/** A comment event targets the issue, so the feed can link to the conversation. */
export function recordCommentAdded(
  issue: IssueRef,
  actorId: string,
  mentionedHandles: string[] = [],
  db?: FeedEventDb
) {
  const mentions =
    mentionedHandles.length > 0 ? ` and mentioned ${mentionedHandles.map((h) => `@${h}`).join(', ')}` : '';
  return recordActivity(
    {
      teamId: issue.teamId,
      actorId,
      action: 'comment_added',
      targetType: 'issue',
      targetId: issue.id,
      description: `commented on ${quoteTitle(issue.title)}${mentions}`,
    },
    db
  );
}
