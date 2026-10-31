import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ActivityFeed } from '@/components/feed/ActivityFeed';

// Full-page team activity feed (FR-008).
export default async function TeamActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');
  const { id } = await params;

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: id, userId: session.user.id } },
  });
  if (!membership) redirect('/dashboard');

  const team = await prisma.team.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!team) notFound();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link
            href={`/teams/${team.id}`}
            aria-label="Back to workspace"
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Activity</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{team.name}</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <ActivityFeed teamId={team.id} />
      </main>
    </div>
  );
}
