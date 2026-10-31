import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  DELETED_TEXT,
  commentInclude,
  getMentionableMembers,
  isTeamMember,
  toCommentDto,
  updateCommentSchema,
} from '@/lib/comments';
import { parseMentions } from '@/lib/mentions';

type RouteContext = { params: Promise<{ commentId: string }> };

type Access =
  | { ok: true; userId: string; comment: { id: string; authorId: string; text: string; teamId: string } }
  | { ok: false; response: NextResponse };

// Only the author may change a comment; non-members get 404 so they cannot probe ids.
async function authorizeAuthor(commentId: string): Promise<Access> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const userId = session.user.id;

  const row = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, text: true, issue: { select: { teamId: true } } },
  });
  if (!row || row.text === DELETED_TEXT || !(await isTeamMember(row.issue.teamId, userId))) {
    return { ok: false, response: NextResponse.json({ error: 'Comment not found' }, { status: 404 }) };
  }
  if (row.authorId !== userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'You can only change your own comments' }, { status: 403 }),
    };
  }
  return {
    ok: true,
    userId,
    comment: { id: row.id, authorId: row.authorId, text: row.text, teamId: row.issue.teamId },
  };
}

// PATCH /api/comments/{commentId}: edit own comment (AC-005). Mentions are re-parsed.
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { commentId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const access = await authorizeAuthor(commentId);
    if (!access.ok) return access.response;

    const parsed = updateCommentSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const { text } = parsed.data;

    const members = await getMentionableMembers(access.comment.teamId);
    const mentioned = parseMentions(text, members);

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        text,
        mentions: { deleteMany: {}, create: mentioned.map((u) => ({ userId: u.id })) },
      },
      include: commentInclude,
    });

    return NextResponse.json({ comment: toCommentDto(updated) });
  } catch (error) {
    console.error('Update comment failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/comments/{commentId}: delete own comment (AC-006). A comment with replies is
// blanked instead of removed so the replies stay under a "Parent comment deleted" placeholder.
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { commentId } = await params;

  try {
    const access = await authorizeAuthor(commentId);
    if (!access.ok) return access.response;

    const replyCount = await prisma.comment.count({ where: { parentId: commentId } });
    if (replyCount > 0) {
      await prisma.comment.update({
        where: { id: commentId },
        data: { text: DELETED_TEXT, mentions: { deleteMany: {} } },
      });
      return NextResponse.json({ id: commentId, deleted: true, keptForReplies: true });
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return NextResponse.json({ id: commentId, deleted: true, keptForReplies: false });
  } catch (error) {
    console.error('Delete comment failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
