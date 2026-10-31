import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import TeamWorkspaceClient from './TeamWorkspaceClient';

export default async function TeamWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Check if user is a member of this team
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId: id,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    redirect('/dashboard');
  }

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      workspaces: true,
      boardColumns: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!team) {
    notFound();
  }

  const isLead = membership.role === 'LEAD';

  return <TeamWorkspaceClient team={team} currentUserId={session.user.id} isLead={isLead} membership={membership} />;
}