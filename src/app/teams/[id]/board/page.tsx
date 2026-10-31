import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BoardClient } from '@/components/board/BoardClient';

export default async function TeamBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  return <BoardClient teamId={id} />;
}
