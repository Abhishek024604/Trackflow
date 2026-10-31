import { notFound, redirect } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getMentionableMembers } from '@/lib/comments';
import { CommentThread } from '@/components/comments/CommentThread';

// An issue's discussion: the issue summary and its comment thread (FR-007).
// Feed events link here; STORY-002's issue detail view can mount <CommentThread /> directly.
export default async function IssueDiscussionPage({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');
  const { id, issueId } = await params;

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: id, userId: session.user.id } },
  });
  if (!membership) redirect('/dashboard');

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { id: true, teamId: true, title: true, description: true, status: true },
  });
  if (!issue || issue.teamId !== id) notFound();

  const members = await getMentionableMembers(id);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader width="narrow" back={{ href: `/teams/${id}`, label: 'Back to workspace' }} title="Discussion">
        <span className="hidden rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:inline">
          {issue.status}
        </span>
      </AppHeader>
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{issue.title}</h2>
          {issue.description && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{issue.description}</p>
          )}
        </div>
        <CommentThread issueId={issue.id} currentUserId={session.user.id} members={members} />
      </main>
    </div>
  );
}
