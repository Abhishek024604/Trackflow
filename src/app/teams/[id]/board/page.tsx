import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BoardClient } from '@/components/board/BoardClient';

export default async function TeamBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ new?: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: id, userId: session.user.id } },
  });
  if (!membership) {
    redirect('/dashboard');
  }

  // /teams/:id/board?new=1 opens the new-issue dialog (the workspace's "Create issue" action).
  const openNewIssue = (await searchParams)?.new === '1';

  return <BoardClient teamId={id} openNewIssue={openNewIssue} />;
}
