import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canMoveToDone, createIssueSchema, isDoneColumn, issueInclude } from '@/lib/issues';

// POST /api/issues — create an issue (FR-001). Defaults: first column ("To Do"), priority MEDIUM.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createIssueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const input = parsed.data;

  try {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: input.teamId, userId } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden: not a team member' }, { status: 403 });
    }

    const columns = await prisma.boardColumn.findMany({
      where: { teamId: input.teamId },
      orderBy: { order: 'asc' },
    });
    const column = input.status ? columns.find((c) => c.name === input.status) : columns[0];
    if (!column) {
      return NextResponse.json({ error: 'Column not valid' }, { status: 400 });
    }

    const assigneeId = input.assigneeId ?? null;
    if (assigneeId) {
      const assigneeMembership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId: assigneeId } },
      });
      if (!assigneeMembership) {
        return NextResponse.json({ error: 'Assignee must be a team member' }, { status: 400 });
      }
    }

    if (
      isDoneColumn(column, columns) &&
      !canMoveToDone({ userId, role: membership.role, assigneeId })
    ) {
      return NextResponse.json(
        { error: 'Only the assignee or a project lead can move an issue to Done' },
        { status: 403 }
      );
    }

    const issue = await prisma.issue.create({
      data: {
        teamId: input.teamId,
        title: input.title,
        description: input.description ?? null,
        status: column.name,
        columnId: column.id,
        priority: input.priority ?? 'MEDIUM',
        category: input.category ?? null,
        assigneeId,
        creatorId: userId,
      },
      include: issueInclude,
    });

    return NextResponse.json({ issue }, { status: 201 });
  } catch (error) {
    console.error('Create issue error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
