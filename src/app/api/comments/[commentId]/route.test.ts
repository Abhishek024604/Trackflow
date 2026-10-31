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
    teamMember: { findUnique: jest.fn(), findMany: jest.fn() },
    comment: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
  },
}));

import type { NextRequest } from 'next/server';
import { DELETE, PATCH } from './route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockAuth = auth as unknown as jest.Mock;
const db = prisma as unknown as {
  teamMember: { findUnique: jest.Mock; findMany: jest.Mock };
  comment: { findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock; count: jest.Mock };
};

const ctx = { params: Promise.resolve({ commentId: 'c-1' }) };
const req = (body?: unknown) => ({ json: async () => body }) as unknown as NextRequest;
const ada = { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com', image: null };
const bob = { id: 'user-2', name: 'Bob', email: 'bob@example.com', image: null };
const stored = { id: 'c-1', authorId: 'user-1', text: 'Original', issue: { teamId: 'team-1' } };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
  db.comment.findUnique.mockResolvedValue(stored);
  db.teamMember.findUnique.mockResolvedValue({ id: 'm-1', role: 'MEMBER' });
  db.teamMember.findMany.mockResolvedValue([{ user: ada }, { user: bob }]);
});

describe('PATCH /api/comments/[commentId]', () => {
  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    expect((await PATCH(req({ text: 'x' }), ctx)).status).toBe(401);
  });

  it('lets the author edit and re-parses mentions', async () => {
    const t = new Date('2026-10-30T10:00:00Z');
    db.comment.update.mockResolvedValue({
      id: 'c-1',
      issueId: 'issue-1',
      parentId: null,
      text: 'Updated for @bob',
      createdAt: t,
      updatedAt: new Date(t.getTime() + 60_000),
      author: ada,
      mentions: [{ userId: 'user-2' }],
    });
    const res = await PATCH(req({ text: 'Updated for @bob' }), ctx);
    expect(res.status).toBe(200);
    expect(db.comment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c-1' },
        data: { text: 'Updated for @bob', mentions: { deleteMany: {}, create: [{ userId: 'user-2' }] } },
      })
    );
    expect((await res.json()).comment).toMatchObject({ text: 'Updated for @bob', edited: true });
  });

  it('returns 403 when another team member tries to edit', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-2' } });
    const res = await PATCH(req({ text: 'hijack' }), ctx);
    expect(res.status).toBe(403);
    expect(db.comment.update).not.toHaveBeenCalled();
  });

  it('returns 404 to a non-member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'outsider' } });
    db.teamMember.findUnique.mockResolvedValue(null);
    const res = await PATCH(req({ text: 'hijack' }), ctx);
    expect(res.status).toBe(404);
    expect(db.comment.update).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing or already deleted comment', async () => {
    db.comment.findUnique.mockResolvedValueOnce(null);
    expect((await PATCH(req({ text: 'x' }), ctx)).status).toBe(404);
    db.comment.findUnique.mockResolvedValueOnce({ ...stored, text: '' });
    expect((await PATCH(req({ text: 'x' }), ctx)).status).toBe(404);
  });

  it('rejects empty text with 400', async () => {
    const res = await PATCH(req({ text: '  ' }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Comment cannot be empty');
    expect(db.comment.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/comments/[commentId]', () => {
  it('lets the author delete a comment without replies', async () => {
    db.comment.count.mockResolvedValue(0);
    const res = await DELETE(req(), ctx);
    expect(res.status).toBe(200);
    expect(db.comment.delete).toHaveBeenCalledWith({ where: { id: 'c-1' } });
    expect(await res.json()).toEqual({ id: 'c-1', deleted: true, keptForReplies: false });
  });

  it('blanks a comment that has replies so the replies stay threaded', async () => {
    db.comment.count.mockResolvedValue(2);
    const res = await DELETE(req(), ctx);
    expect(res.status).toBe(200);
    expect(db.comment.delete).not.toHaveBeenCalled();
    expect(db.comment.update).toHaveBeenCalledWith({
      where: { id: 'c-1' },
      data: { text: '', mentions: { deleteMany: {} } },
    });
    expect((await res.json()).keptForReplies).toBe(true);
  });

  it('returns 403 when another team member tries to delete', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-2' } });
    const res = await DELETE(req(), ctx);
    expect(res.status).toBe(403);
    expect(db.comment.delete).not.toHaveBeenCalled();
    expect(db.comment.update).not.toHaveBeenCalled();
  });

  it('returns 404 to a non-member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'outsider' } });
    db.teamMember.findUnique.mockResolvedValue(null);
    expect((await DELETE(req(), ctx)).status).toBe(404);
    expect(db.comment.delete).not.toHaveBeenCalled();
  });

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    expect((await DELETE(req(), ctx)).status).toBe(401);
  });
});
