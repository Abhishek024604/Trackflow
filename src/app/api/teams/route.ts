import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  return NextResponse.json({ teams });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    // Create team with owner as lead member
    const team = await prisma.team.create({
      data: {
        name,
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: 'LEAD',
          },
        },
        boardColumns: {
          create: [
            { name: 'To Do', order: 0, color: '#6366f1' },
            { name: 'In Progress', order: 1, color: '#f59e0b' },
            { name: 'Done', order: 2, color: '#10b981' },
          ],
        },
        workspaces: {
          create: {
            name: `${name} Workspace`,
          },
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
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('Create team error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}