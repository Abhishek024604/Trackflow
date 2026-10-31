import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { issueInclude } from '@/lib/issues';

type Params = { params: Promise<{ teamId: string }> | { teamId: string } };

// GET /api/boards/{teamId} — board columns, issues and members for one team (FR-002).
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { teamId } = await params;

  try {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: session.user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const [team, columns, issues, members] = await Promise.all([
      prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true } }),
      prisma.boardColumn.findMany({
        where: { teamId },
        orderBy: { order: 'asc' },
        select: { id: true, name: true, order: true, color: true },
      }),
      prisma.issue.findMany({
        where: { teamId },
        include: issueInclude,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.teamMember.findMany({
        where: { teamId },
        orderBy: { createdAt: 'asc' },
        select: {
          role: true,
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      }),
    ]);

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({
      team,
      columns,
      issues,
      members: members.map((m) => ({ ...m.user, role: m.role })),
      viewer: { id: session.user.id, role: membership.role },
    });
  } catch (error) {
    console.error('Board load error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
