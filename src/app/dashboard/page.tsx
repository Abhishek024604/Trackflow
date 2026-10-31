import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const teams = await prisma.team.findMany({
    where: {
      members: {
        some: { userId: session.user.id },
      },
    },
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
      },
      workspaces: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return <DashboardClient teams={teams} user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? '',
        image: session.user.image ?? null,
      }} />;
}