/**
 * @jest-environment node
 */
import { POST } from './route';
import { DELETE, GET, PATCH } from './[id]/route';
import { GET as GET_BOARD } from '../boards/[teamId]/route';

jest.mock('next/server', () => {
  class NextResponse {
    status: number;
    body: unknown;
    constructor(body: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }
    async json() {
      return this.body;
    }
    static json(body: unknown, init?: { status?: number }) {
      return new NextResponse(body, init);
    }
  }
  return { NextResponse };
});

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: { findUnique: jest.fn(), findMany: jest.fn() },
    boardColumn: { findMany: jest.fn() },
    team: { findUnique: jest.fn() },
    issue: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const { auth } = jest.requireMock('@/lib/auth') as { auth: jest.Mock };
const { prisma } = jest.requireMock('@/lib/prisma') as {
  prisma: {
    teamMember: { findUnique: jest.Mock; findMany: jest.Mock };
    boardColumn: { findMany: jest.Mock };
    team: { findUnique: jest.Mock };
    issue: Record<'findUnique' | 'findMany' | 'create' | 'update' | 'delete', jest.Mock>;
  };
};

const COLUMNS = [
  { id: 'col-todo', teamId: 'team-1', name: 'To Do', order: 0, color: '#6366f1' },
  { id: 'col-doing', teamId: 'team-1', name: 'In Progress', order: 1, color: '#f59e0b' },
  { id: 'col-done', teamId: 'team-1', name: 'Done', order: 2, color: '#10b981' },
];

const baseIssue = {
  id: 'issue-1',
  teamId: 'team-1',
  title: 'Fix login',
  description: null,
  status: 'In Progress',
  priority: 'MEDIUM',
  category: null,
  assigneeId: 'user-assignee',
  creatorId: 'user-creator',
  columnId: 'col-doing',
};

const req = (body?: unknown) =>
  ({
    json: async () => {
      if (body === undefined) throw new SyntaxError('no body');
      return body;
    },
  }) as never;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

/** Signs in `userId`; `roles` maps each team member's userId to their role. */
function signIn(userId: string | null, roles: Record<string, 'LEAD' | 'MEMBER'> = {}) {
  auth.mockResolvedValue(userId ? { user: { id: userId } } : null);
  prisma.teamMember.findUnique.mockImplementation(async ({ where }) => {
    const { userId: uid, teamId } = where.teamId_userId;
    const role = roles[uid];
    return role ? { id: `m-${uid}`, teamId, userId: uid, role } : null;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.boardColumn.findMany.mockResolvedValue(COLUMNS);
  prisma.issue.findUnique.mockResolvedValue({ ...baseIssue });
  prisma.issue.update.mockImplementation(async ({ data }) => ({ ...baseIssue, ...data }));
  prisma.issue.create.mockImplementation(async ({ data }) => ({ id: 'new-issue', ...data }));
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('POST /api/issues', () => {
  it('returns 401 when signed out', async () => {
    signIn(null);
    const res = await POST(req({ teamId: 'team-1', title: 'A' }));
    expect(res.status).toBe(401);
  });

  it('rejects an empty title with "Title is required"', async () => {
    signIn('user-1', { 'user-1': 'MEMBER' });
    const res = await POST(req({ teamId: 'team-1', title: '   ' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Title is required' });
    expect(prisma.issue.create).not.toHaveBeenCalled();
  });

  it('returns 403 for a non-member', async () => {
    signIn('outsider', {});
    const res = await POST(req({ teamId: 'team-1', title: 'A' }));
    expect(res.status).toBe(403);
    expect(prisma.issue.create).not.toHaveBeenCalled();
  });

  it('creates in "To Do" with MEDIUM priority by default', async () => {
    signIn('user-1', { 'user-1': 'MEMBER' });
    const res = await POST(req({ teamId: 'team-1', title: 'New thing', description: 'Details' }));
    expect(res.status).toBe(201);
    const { data } = prisma.issue.create.mock.calls[0][0];
    expect(data).toMatchObject({
      status: 'To Do',
      columnId: 'col-todo',
      priority: 'MEDIUM',
      creatorId: 'user-1',
      title: 'New thing',
      description: 'Details',
    });
  });

  it('accepts lowercase priority from the OpenAPI contract and saves the assignee', async () => {
    signIn('user-1', { 'user-1': 'MEMBER', 'user-2': 'MEMBER' });
    const res = await POST(req({ teamId: 'team-1', title: 'A', priority: 'high', assigneeId: 'user-2' }));
    expect(res.status).toBe(201);
    expect(prisma.issue.create.mock.calls[0][0].data).toMatchObject({ priority: 'HIGH', assigneeId: 'user-2' });
  });

  it('rejects an assignee who is not on the team', async () => {
    signIn('user-1', { 'user-1': 'MEMBER' });
    const res = await POST(req({ teamId: 'team-1', title: 'A', assigneeId: 'stranger' }));
    expect(res.status).toBe(400);
  });

  it('rejects an unknown column with "Column not valid"', async () => {
    signIn('user-1', { 'user-1': 'MEMBER' });
    const res = await POST(req({ teamId: 'team-1', title: 'A', status: 'Backlog' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Column not valid' });
  });

  it('returns 403 when a member creates straight into Done for someone else', async () => {
    signIn('user-1', { 'user-1': 'MEMBER', 'user-2': 'MEMBER' });
    const res = await POST(req({ teamId: 'team-1', title: 'A', status: 'Done', assigneeId: 'user-2' }));
    expect(res.status).toBe(403);
    expect(prisma.issue.create).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/issues/{id}: moving to Done', () => {
  it('lets the assignee move the issue to Done', async () => {
    signIn('user-assignee', { 'user-assignee': 'MEMBER' });
    const res = await PATCH(req({ status: 'Done' }), ctx('issue-1'));
    expect(res.status).toBe(200);
    expect(prisma.issue.update.mock.calls[0][0].data).toMatchObject({ status: 'Done', columnId: 'col-done' });
  });

  it('lets a project lead move the issue to Done', async () => {
    signIn('user-lead', { 'user-lead': 'LEAD' });
    const res = await PATCH(req({ status: 'Done' }), ctx('issue-1'));
    expect(res.status).toBe(200);
  });

  it('returns 403 and writes nothing for another member', async () => {
    signIn('user-other', { 'user-other': 'MEMBER' });
    const res = await PATCH(req({ status: 'Done' }), ctx('issue-1'));
    expect(res.status).toBe(403);
    expect(prisma.issue.update).not.toHaveBeenCalled();
  });

  it('returns 403 for a member on an unassigned issue', async () => {
    prisma.issue.findUnique.mockResolvedValue({ ...baseIssue, assigneeId: null });
    signIn('user-other', { 'user-other': 'MEMBER' });
    const res = await PATCH(req({ status: 'Done' }), ctx('issue-1'));
    expect(res.status).toBe(403);
  });

  it('checks the current assignee, not one set in the same request', async () => {
    signIn('user-other', { 'user-other': 'MEMBER' });
    const res = await PATCH(req({ status: 'Done', assigneeId: 'user-other' }), ctx('issue-1'));
    expect(res.status).toBe(403);
    expect(prisma.issue.update).not.toHaveBeenCalled();
  });

  it('treats a renamed final column as Done', async () => {
    prisma.boardColumn.findMany.mockResolvedValue([
      COLUMNS[0],
      COLUMNS[1],
      { ...COLUMNS[2], name: 'Shipped' },
    ]);
    signIn('user-other', { 'user-other': 'MEMBER' });
    const res = await PATCH(req({ status: 'Shipped' }), ctx('issue-1'));
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/issues/{id}: other updates', () => {
  it('lets any member move between non-final columns', async () => {
    signIn('user-other', { 'user-other': 'MEMBER' });
    const res = await PATCH(req({ status: 'To Do' }), ctx('issue-1'));
    expect(res.status).toBe(200);
    expect(prisma.issue.update.mock.calls[0][0].data).toEqual({ status: 'To Do', columnId: 'col-todo' });
  });

  it('lets any member change title, priority and assignee', async () => {
    signIn('user-other', { 'user-other': 'MEMBER', 'user-2': 'MEMBER' });
    const res = await PATCH(req({ title: 'Renamed', priority: 'LOW', assigneeId: 'user-2' }), ctx('issue-1'));
    expect(res.status).toBe(200);
    expect(prisma.issue.update.mock.calls[0][0].data).toEqual({
      title: 'Renamed',
      priority: 'LOW',
      assigneeId: 'user-2',
    });
  });

  it('rejects an unknown column', async () => {
    signIn('user-lead', { 'user-lead': 'LEAD' });
    const res = await PATCH(req({ status: 'Nowhere' }), ctx('issue-1'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Column not valid' });
  });

  it('rejects an empty title and unknown fields', async () => {
    signIn('user-lead', { 'user-lead': 'LEAD' });
    expect((await PATCH(req({ title: '' }), ctx('issue-1'))).status).toBe(400);
    expect((await PATCH(req({ teamId: 'other-team' }), ctx('issue-1'))).status).toBe(400);
  });

  it('returns 404 for a missing issue', async () => {
    prisma.issue.findUnique.mockResolvedValue(null);
    signIn('user-lead', { 'user-lead': 'LEAD' });
    const res = await PATCH(req({ title: 'X' }), ctx('missing'));
    expect(res.status).toBe(404);
  });

  it('hides issues of other teams (404)', async () => {
    signIn('outsider', {});
    const res = await PATCH(req({ title: 'X' }), ctx('issue-1'));
    expect(res.status).toBe(404);
    expect(prisma.issue.update).not.toHaveBeenCalled();
  });
});

describe('GET and DELETE /api/issues/{id}', () => {
  it('returns the issue to a member', async () => {
    signIn('user-other', { 'user-other': 'MEMBER' });
    const res = await GET(req(), ctx('issue-1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ issue: expect.objectContaining({ id: 'issue-1' }) });
  });

  it('lets the creator delete', async () => {
    signIn('user-creator', { 'user-creator': 'MEMBER' });
    const res = await DELETE(req(), ctx('issue-1'));
    expect(res.status).toBe(204);
    expect(prisma.issue.delete).toHaveBeenCalledWith({ where: { id: 'issue-1' } });
  });

  it('lets a lead delete', async () => {
    signIn('user-lead', { 'user-lead': 'LEAD' });
    expect((await DELETE(req(), ctx('issue-1'))).status).toBe(204);
  });

  it('returns 403 when another member deletes', async () => {
    signIn('user-other', { 'user-other': 'MEMBER' });
    const res = await DELETE(req(), ctx('issue-1'));
    expect(res.status).toBe(403);
    expect(prisma.issue.delete).not.toHaveBeenCalled();
  });
});

describe('GET /api/boards/{teamId}', () => {
  const boardCtx = { params: Promise.resolve({ teamId: 'team-1' }) };

  it('returns 404 to a non-member', async () => {
    signIn('outsider', {});
    const res = await GET_BOARD(req(), boardCtx);
    expect(res.status).toBe(404);
    expect(prisma.issue.findMany).not.toHaveBeenCalled();
  });

  it('returns columns, issues, members and the viewer role', async () => {
    signIn('user-lead', { 'user-lead': 'LEAD' });
    prisma.team.findUnique.mockResolvedValue({ id: 'team-1', name: 'Web' });
    prisma.issue.findMany.mockResolvedValue([baseIssue]);
    prisma.teamMember.findMany.mockResolvedValue([
      { role: 'LEAD', user: { id: 'user-lead', name: 'Lea', email: 'lea@x.dev', image: null } },
    ]);
    const res = await GET_BOARD(req(), boardCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.columns).toHaveLength(3);
    expect(body.issues).toHaveLength(1);
    expect(body.members).toEqual([{ id: 'user-lead', name: 'Lea', email: 'lea@x.dev', image: null, role: 'LEAD' }]);
    expect(body.viewer).toEqual({ id: 'user-lead', role: 'LEAD' });
  });
});
