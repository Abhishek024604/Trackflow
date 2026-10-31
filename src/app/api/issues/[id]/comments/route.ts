import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordCommentAdded } from '@/lib/activity';
import {
  commentInclude,
  createCommentSchema,
  getIssueForMember,
  getMentionableMembers,
  toCommentDto,
} from '@/lib/comments';
import { mentionHandle, parseMentions } from '@/lib/mentions';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/issues/{id}/comments: all comments of the issue, oldest first (client threads them).
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  try {
    const issue = await getIssueForMember(id, session.user.id);
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const rows = await prisma.comment.findMany({
      where: { issueId: issue.id },
      include: commentInclude,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ comments: rows.map(toCommentDto) });
  } catch (error) {
    console.error('List comments failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/issues/{id}/comments: add a comment or a reply (parentId).
export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
  }
  const parsed = createCommentSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const { text, parentId } = parsed.data;

  try {
    const issue = await getIssueForMember(id, userId);
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, issueId: true },
      });
      if (!parent || parent.issueId !== issue.id) {
        return NextResponse.json({ error: 'Parent comment not found on this issue' }, { status: 400 });
      }
    }

    const members = await getMentionableMembers(issue.teamId);
    const mentioned = parseMentions(text, members);

    const comment = await prisma.comment.create({
      data: {
        text,
        issueId: issue.id,
        authorId: userId,
        parentId: parentId ?? null,
        mentions: { create: mentioned.map((u) => ({ userId: u.id })) },
      },
      include: commentInclude,
    });

    await recordCommentAdded(issue, userId, mentioned.map(mentionHandle));

    return NextResponse.json({ comment: toCommentDto(comment) }, { status: 201 });
  } catch (error) {
    console.error('Create comment failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
