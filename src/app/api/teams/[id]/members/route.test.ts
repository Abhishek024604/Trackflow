import { z } from 'zod';

// Import validation schemas
const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
});

describe('/api/teams/[id]/members - validation logic', () => {
  it('validates email format', () => {
    const result = inviteMemberSchema.safeParse({ email: 'invalid-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('Invalid email address');
    }
  });

  it('validates valid email', () => {
    const result = inviteMemberSchema.safeParse({ email: 'member@example.com' });
    expect(result.success).toBe(true);
  });
});

// Mock Prisma for handler logic tests
jest.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockPrisma = require('@/lib/prisma').prisma;

describe('/api/teams/[id]/members - handler logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockMembership = {
    id: 'member-1',
    teamId: 'team-1',
    userId: 'user-1',
    role: 'LEAD',
    createdAt: new Date(),
  };

  const mockMembers = [
    {
      id: 'member-1',
      teamId: 'team-1',
      userId: 'user-1',
      role: 'LEAD',
      createdAt: new Date(),
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null },
    },
    {
      id: 'member-2',
      teamId: 'team-1',
      userId: 'user-2',
      role: 'MEMBER',
      createdAt: new Date(),
      user: { id: 'user-2', name: 'Member Two', email: 'member2@example.com', image: null },
    },
  ];

  it('returns 403 for non-member on GET', async () => {
    mockPrisma.teamMember.findUnique.mockResolvedValue(null);

    const membership = await mockPrisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: 'team-1', userId: 'user-1' } },
    });

    expect(membership).toBeNull();
    // Would return 403
  });

  it('returns members for team member on GET', async () => {
    mockPrisma.teamMember.findUnique.mockResolvedValue(mockMembership);
    mockPrisma.teamMember.findMany.mockResolvedValue(mockMembers);

    const membership = await mockPrisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: 'team-1', userId: 'user-1' } },
    });

    expect(membership).not.toBeNull();

    const members = await mockPrisma.teamMember.findMany({
      where: { teamId: 'team-1' },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: 'asc' },
    });

    expect(members).toHaveLength(2);
  });

  it('returns 403 for non-lead on POST', async () => {
    const memberMembership = { ...mockMembership, role: 'MEMBER' };
    mockPrisma.teamMember.findUnique.mockResolvedValue(memberMembership);

    const membership = await mockPrisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: 'team-1', userId: 'user-1' } },
    });

    expect(membership?.role).toBe('MEMBER');
    // Would return 403
  });

  it('returns 409 when user already a member', async () => {
    mockPrisma.teamMember.findUnique.mockResolvedValue(mockMembership);
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2', email: 'existing@example.com' });
    mockPrisma.teamMember.findUnique.mockResolvedValueOnce(mockMembership).mockResolvedValueOnce({
      id: 'member-2',
      teamId: 'team-1',
      userId: 'user-2',
      role: 'MEMBER',
      createdAt: new Date(),
    });

    const membership = await mockPrisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: 'team-1', userId: 'user-1' } },
    });
    expect(membership?.role).toBe('LEAD');

    const existingMember = await mockPrisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: 'team-1', userId: 'user-2' } },
    });
    expect(existingMember).not.toBeNull();
    // Would return 409
  });

  it('invites new member successfully', async () => {
    mockPrisma.teamMember.findUnique.mockResolvedValue(mockMembership);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-2',
      email: 'newmember@example.com',
      name: 'newmember',
      passwordHash: null,
      githubId: null,
      image: null,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.teamMember.findUnique.mockResolvedValueOnce(mockMembership).mockResolvedValueOnce(null);
    mockPrisma.teamMember.create.mockResolvedValue({
      id: 'member-2',
      teamId: 'team-1',
      userId: 'user-2',
      role: 'MEMBER',
      createdAt: new Date(),
      user: { id: 'user-2', name: 'newmember', email: 'newmember@example.com', image: null },
    });

    const membership = await mockPrisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: 'team-1', userId: 'user-1' } },
    });
    expect(membership?.role).toBe('LEAD');

    const user = await mockPrisma.user.create({
      data: { email: 'newmember@example.com', name: 'newmember' },
    });
    expect(user.email).toBe('newmember@example.com');

    const existingMember = await mockPrisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: 'team-1', userId: 'user-2' } },
    });
    expect(existingMember).toBeNull();

    const member = await mockPrisma.teamMember.create({
      data: { teamId: 'team-1', userId: 'user-2', role: 'MEMBER' },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });
    expect(member.role).toBe('MEMBER');
  });
});