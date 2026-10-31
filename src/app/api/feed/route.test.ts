jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));
jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: { findUnique: jest.fn() },
    feedEvent: { findMany: jest.fn() },
  },
}));

import type { NextRequest } from 'next/server';
import { GET } from './route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockAuth = auth as unknown as jest.Mock;
const db = prisma as unknown as {
  teamMember: { findUnique: jest.Mock };
  feedEvent: { findMany: jest.Mock };
};

const req = (query: string) => ({ url: `http://localhost/api/feed${query}` }) as unknown as NextRequest;
const actor = { id: 'user-1', name: 'Ada', email: 'ada@example.com', image: null };

function events(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `f-${i}`,
    teamId: 'team-1',
    actorId: 'user-1',
    action: 'issue_created',
    targetType: 'issue',
    targetId: `issue-${i}`,
    description: `created issue "Issue ${i}"`,
    timestamp: new Date(Date.UTC(2026, 9, 30, 10, 0, 50 - i)),
    actor,
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
  db.teamMember.findUnique.mockResolvedValue({ id: 'm-1' });
  db.feedEvent.findMany.mockResolvedValue(events(3));
});

describe('GET /api/feed', () => {
  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    expect((await GET(req('?teamId=team-1'))).status).toBe(401);
  });

  it('requires a teamId', async () => {
    expect((await GET(req(''))).status).toBe(400);
  });

  it('rejects an unknown filter', async () => {
    expect((await GET(req('?teamId=team-1&filter=everyone'))).status).toBe(400);
  });

  it('returns 403 to a non-member and reads nothing', async () => {
    db.teamMember.findUnique.mockResolvedValue(null);
    expect((await GET(req('?teamId=team-1'))).status).toBe(403);
    expect(db.feedEvent.findMany).not.toHaveBeenCalled();
  });

  it('returns the whole team feed newest first', async () => {
    const res = await GET(req('?teamId=team-1'));
    expect(res.status).toBe(200);
    expect(db.feedEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamId: 'team-1' },
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        take: 51,
      })
    );
    const body = await res.json();
    expect(body.events).toHaveLength(3);
    expect(body.events[0]).toMatchObject({ id: 'f-0', action: 'issue_created', actor: { name: 'Ada' } });
    expect(body.nextCursor).toBeNull();
  });

  it('filters to my activity', async () => {
    await GET(req('?teamId=team-1&filter=my'));
    expect(db.feedEvent.findMany.mock.calls[0][0].where).toEqual({ teamId: 'team-1', actorId: 'user-1' });
  });

  it('pages with a cursor and reports the next one', async () => {
    const res = await GET(req('?teamId=team-1&limit=2&cursor=f-9'));
    expect(db.feedEvent.findMany.mock.calls[0][0]).toMatchObject({ take: 3, cursor: { id: 'f-9' }, skip: 1 });
    const body = await res.json();
    expect(body.events.map((e: { id: string }) => e.id)).toEqual(['f-0', 'f-1']);
    expect(body.nextCursor).toBe('f-1');
  });

  it('caps the page size at 50', async () => {
    await GET(req('?teamId=team-1&limit=500'));
    expect(db.feedEvent.findMany.mock.calls[0][0].take).toBe(51);
  });
});
