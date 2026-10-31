// Client-safe feed constants and helpers (no Prisma import), shared by the API and the UI.

export type FeedAction = 'issue_created' | 'issue_updated' | 'comment_added';
export type FeedTargetType = 'issue' | 'comment';

export const FEED_PAGE_SIZE = 50;

/** Where a feed event about an issue links to. One place to change once the issue page exists. */
export function issueHref(teamId: string, issueId: string): string {
  return `/teams/${teamId}/discussions/${issueId}`;
}
