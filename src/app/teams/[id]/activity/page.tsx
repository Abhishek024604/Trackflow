import { notFound, redirect } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
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
    <div className="min-h-screen bg-background">
      <AppHeader
        width="narrow"
        back={{ href: `/teams/${team.id}`, label: 'Back to workspace' }}
        title="Activity"
        subtitle={team.name}
      />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <ActivityFeed teamId={team.id} />
      </main>
    </div>
  );
}
