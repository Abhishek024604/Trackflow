import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link
            href={`/teams/${id}`}
            aria-label="Back to workspace"
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{issue.title}</h1>
          <span className="ml-auto shrink-0 rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
            {issue.status}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {issue.description && (
          <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{issue.description}</p>
        )}
        <CommentThread issueId={issue.id} currentUserId={session.user.id} members={members} />
      </main>
    </div>
  );
}
