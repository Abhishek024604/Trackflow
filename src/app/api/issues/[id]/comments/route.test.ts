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
    issue: { findUnique: jest.fn() },
    teamMember: { findUnique: jest.fn(), findMany: jest.fn() },
    comment: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    feedEvent: { create: jest.fn() },
  },
}));

import type { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockAuth = auth as unknown as jest.Mock;
const db = prisma as unknown as {
  issue: { findUnique: jest.Mock };
  teamMember: { findUnique: jest.Mock; findMany: jest.Mock };
  comment: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
  feedEvent: { create: jest.Mock };
};

const ctx = { params: Promise.resolve({ id: 'issue-1' }) };
const req = (body?: unknown) => ({ json: async () => body }) as unknown as NextRequest;

const issue = { id: 'issue-1', teamId: 'team-1', title: 'Login fails on Safari' };
const ada = { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com', image: null };
const bob = { id: 'user-2', name: 'Bob', email: 'bob@example.com', image: null };
const now = new Date('2026-10-30T10:00:00Z');

function commentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c-1',
    issueId: 'issue-1',
    parentId: null,
    text: 'Looks good',
    createdAt: now,
    updatedAt: now,
    author: ada,
    mentions: [],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
  db.issue.findUnique.mockResolvedValue(issue);
  db.teamMember.findUnique.mockResolvedValue({ id: 'm-1', teamId: 'team-1', userId: 'user-1', role: 'MEMBER' });
  db.teamMember.findMany.mockResolvedValue([{ user: ada }, { user: bob }]);
  db.feedEvent.create.mockResolvedValue({ id: 'f-1' });
});

describe('GET /api/issues/[id]/comments', () => {
  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(req(), ctx);
    expect(res.status).toBe(401);
    expect(db.comment.findMany).not.toHaveBeenCalled();
  });

  it('returns 404 to a user who is not a member of the issue team', async () => {
    db.teamMember.findUnique.mockResolvedValue(null);
    const res = await GET(req(), ctx);
    expect(res.status).toBe(404);
    expect(db.comment.findMany).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown issue', async () => {
    db.issue.findUnique.mockResolvedValue(null);
    const res = await GET(req(), ctx);
    expect(res.status).toBe(404);
  });

  it('lists comments oldest first and marks deleted ones', async () => {
    db.comment.findMany.mockResolvedValue([
      commentRow(),
      commentRow({ id: 'c-2', text: '' }),
      commentRow({ id: 'c-3', parentId: 'c-2', text: 'reply', mentions: [{ userId: 'user-2' }] }),
    ]);
    const res = await GET(req(), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(db.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { issueId: 'issue-1' }, orderBy: { createdAt: 'asc' } })
    );
    expect(body.comments).toHaveLength(3);
    expect(body.comments[0]).toMatchObject({ id: 'c-1', text: 'Looks good', deleted: false, edited: false });
    expect(body.comments[1]).toMatchObject({ id: 'c-2', deleted: true });
    expect(body.comments[2]).toMatchObject({ parentId: 'c-2', mentionedUserIds: ['user-2'] });
  });
});

describe('POST /api/issues/[id]/comments', () => {
  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(req({ text: 'hi' }), ctx);
    expect(res.status).toBe(401);
  });

  it.each([{}, { text: '' }, { text: '   \n ' }, { text: 42 }])(
    'rejects an empty comment %p with 400 and writes nothing',
    async (body) => {
      const res = await POST(req(body), ctx);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Comment cannot be empty');
      expect(db.comment.create).not.toHaveBeenCalled();
      expect(db.feedEvent.create).not.toHaveBeenCalled();
    }
  );

  it('rejects a comment longer than the limit', async () => {
    const res = await POST(req({ text: 'x'.repeat(10001) }), ctx);
    expect(res.status).toBe(400);
    expect(db.comment.create).not.toHaveBeenCalled();
  });

  it('returns 404 to a non-member and writes nothing', async () => {
    db.teamMember.findUnique.mockResolvedValue(null);
    const res = await POST(req({ text: 'sneaky' }), ctx);
    expect(res.status).toBe(404);
    expect(db.comment.create).not.toHaveBeenCalled();
    expect(db.feedEvent.create).not.toHaveBeenCalled();
  });

  it('creates the comment with mention tags and records a feed event', async () => {
    db.comment.create.mockResolvedValue(
      commentRow({ id: 'c-9', text: 'Can you check @bob and @nobody?', mentions: [{ userId: 'user-2' }] })
    );
    const res = await POST(req({ text: '  Can you check @bob and @nobody?  ' }), ctx);

    expect(res.status).toBe(201);
    expect(db.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          text: 'Can you check @bob and @nobody?',
          issueId: 'issue-1',
          authorId: 'user-1',
          parentId: null,
          mentions: { create: [{ userId: 'user-2' }] },
        },
      })
    );
    expect(db.feedEvent.create).toHaveBeenCalledWith({
      data: {
        teamId: 'team-1',
        actorId: 'user-1',
        action: 'comment_added',
        targetType: 'issue',
        targetId: 'issue-1',
        description: 'commented on "Login fails on Safari" and mentioned @bob',
      },
    });
    const body = await res.json();
    expect(body.comment).toMatchObject({ id: 'c-9', mentionedUserIds: ['user-2'], author: { id: 'user-1' } });
  });

  it('creates a reply when the parent belongs to the same issue', async () => {
    db.comment.findUnique.mockResolvedValue({ id: 'c-1', issueId: 'issue-1' });
    db.comment.create.mockResolvedValue(commentRow({ id: 'c-2', parentId: 'c-1', text: 'Agreed' }));
    const res = await POST(req({ text: 'Agreed', parentId: 'c-1' }), ctx);
    expect(res.status).toBe(201);
    expect(db.comment.create.mock.calls[0][0].data.parentId).toBe('c-1');
  });

  it('rejects a reply to a comment on another issue', async () => {
    db.comment.findUnique.mockResolvedValue({ id: 'c-x', issueId: 'issue-2' });
    const res = await POST(req({ text: 'Agreed', parentId: 'c-x' }), ctx);
    expect(res.status).toBe(400);
    expect(db.comment.create).not.toHaveBeenCalled();
  });

  it('still returns the comment when the feed write fails', async () => {
    db.comment.create.mockResolvedValue(commentRow());
    db.feedEvent.create.mockRejectedValue(new Error('db down'));
    const res = await POST(req({ text: 'Looks good' }), ctx);
    expect(res.status).toBe(201);
  });
});
