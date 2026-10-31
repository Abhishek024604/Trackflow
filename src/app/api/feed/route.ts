import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FEED_PAGE_SIZE } from '@/lib/activity';
import { isTeamMember } from '@/lib/comments';

// GET /api/feed?teamId=...&filter=all|my&cursor=...&limit=...
// Newest first, FEED_PAGE_SIZE per page; `nextCursor` loads the next page (AC-007 to AC-010).
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const params = new URL(request.url).searchParams;
  const teamId = params.get('teamId');
  const filter = params.get('filter') ?? 'all';
  const cursor = params.get('cursor');
  const requestedLimit = Number(params.get('limit') ?? FEED_PAGE_SIZE);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), FEED_PAGE_SIZE)
    : FEED_PAGE_SIZE;

  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
  }
  if (filter !== 'all' && filter !== 'my') {
    return NextResponse.json({ error: 'filter must be "all" or "my"' }, { status: 400 });
  }

  try {
    if (!(await isTeamMember(teamId, userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await prisma.feedEvent.findMany({
      where: { teamId, ...(filter === 'my' ? { actorId: userId } : {}) },
      include: { actor: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return NextResponse.json({
      events: page.map((e) => ({
        id: e.id,
        action: e.action,
        targetType: e.targetType,
        targetId: e.targetId,
        description: e.description,
        timestamp: new Date(e.timestamp).toISOString(),
        actor: e.actor,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  } catch (error) {
    console.error('Load feed failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
