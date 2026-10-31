import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canMoveToDone, isDoneColumn, issueInclude, updateIssueSchema } from '@/lib/issues';

type Params = { params: Promise<{ id: string }> | { id: string } };

/** Loads the issue and the caller's membership in its team; returns an error response if denied. */
async function loadForMember(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  }
  const userId = session.user.id;

  const issue = await prisma.issue.findUnique({ where: { id } });
  if (!issue) {
    return { ok: false, response: NextResponse.json({ error: 'Issue not found' }, { status: 404 }) } as const;
  }

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: issue.teamId, userId } },
  });
  if (!membership) {
    // Do not reveal issues of teams the caller is not in.
    return { ok: false, response: NextResponse.json({ error: 'Issue not found' }, { status: 404 }) } as const;
  }

  return { ok: true, issue, membership, userId } as const;
}

// GET /api/issues/{id} — issue detail with comment count.
export async function GET(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  try {
    const loaded = await loadForMember(id);
    if (!loaded.ok) return loaded.response;

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: { ...issueInclude, _count: { select: { comments: true } } },
    });
    return NextResponse.json({ issue });
  } catch (error) {
    console.error('Get issue error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/issues/{id} — update fields, assignee or status (column move).
export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = updateIssueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const input = parsed.data;

  try {
    const loaded = await loadForMember(id);
    if (!loaded.ok) return loaded.response;
    const { issue, membership, userId } = loaded;

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.category !== undefined) data.category = input.category;

    if (input.assigneeId !== undefined) {
      if (input.assigneeId) {
        const assigneeMembership = await prisma.teamMember.findUnique({
          where: { teamId_userId: { teamId: issue.teamId, userId: input.assigneeId } },
        });
        if (!assigneeMembership) {
          return NextResponse.json({ error: 'Assignee must be a team member' }, { status: 400 });
        }
      }
      data.assigneeId = input.assigneeId;
    }

    if (input.status !== undefined && input.status !== issue.status) {
      const columns = await prisma.boardColumn.findMany({
        where: { teamId: issue.teamId },
        orderBy: { order: 'asc' },
      });
      const column = columns.find((c) => c.name === input.status);
      if (!column) {
        return NextResponse.json({ error: 'Column not valid' }, { status: 400 });
      }
      // CMP-004 state rule: checked against the *current* assignee, before any write.
      if (
        isDoneColumn(column, columns) &&
        !canMoveToDone({ userId, role: membership.role, assigneeId: issue.assigneeId })
      ) {
        return NextResponse.json(
          { error: 'Only the assignee or a project lead can move an issue to Done' },
          { status: 403 }
        );
      }
      data.status = column.name;
      data.columnId = column.id;
    }

    const updated = await prisma.issue.update({
      where: { id },
      data,
      include: issueInclude,
    });
    return NextResponse.json({ issue: updated });
  } catch (error) {
    console.error('Update issue error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/issues/{id} — the creator or a project lead may delete.
export async function DELETE(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  try {
    const loaded = await loadForMember(id);
    if (!loaded.ok) return loaded.response;
    const { issue, membership, userId } = loaded;

    if (membership.role !== 'LEAD' && issue.creatorId !== userId) {
      return NextResponse.json(
        { error: 'Only the creator or a project lead can delete this issue' },
        { status: 403 }
      );
    }

    await prisma.issue.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete issue error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
