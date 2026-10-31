jest.mock('@/lib/prisma', () => ({
  prisma: { feedEvent: { create: jest.fn() } },
}));

import { prisma } from '@/lib/prisma';
import {
  issueHref,
  recordActivity,
  recordCommentAdded,
  recordIssueCreated,
  recordIssueUpdated,
} from '@/lib/activity';

const create = (prisma as unknown as { feedEvent: { create: jest.Mock } }).feedEvent.create;
const issue = { id: 'issue-1', teamId: 'team-1', title: 'Fix login' };

beforeEach(() => {
  jest.clearAllMocks();
  create.mockResolvedValue({ id: 'f-1' });
});

describe('activity recording', () => {
  it('records an issue creation', async () => {
    await recordIssueCreated(issue, 'user-1');
    expect(create).toHaveBeenCalledWith({
      data: {
        teamId: 'team-1',
        actorId: 'user-1',
        action: 'issue_created',
        targetType: 'issue',
        targetId: 'issue-1',
        description: 'created issue "Fix login"',
      },
    });
  });

  it('records an issue update with the changed fields', async () => {
    await recordIssueUpdated(issue, 'user-2', ['status', 'priority']);
    expect(create.mock.calls[0][0].data).toMatchObject({
      actorId: 'user-2',
      action: 'issue_updated',
      description: 'updated issue "Fix login" (status, priority)',
    });
  });

  it('records a comment with its mentions', async () => {
    await recordCommentAdded(issue, 'user-1', ['bob', 'cy']);
    expect(create.mock.calls[0][0].data).toMatchObject({
      action: 'comment_added',
      targetType: 'issue',
      targetId: 'issue-1',
      description: 'commented on "Fix login" and mentioned @bob, @cy',
    });
  });

  it('shortens very long issue titles', async () => {
    await recordIssueCreated({ ...issue, title: 'a'.repeat(200) }, 'user-1');
    const description: string = create.mock.calls[0][0].data.description;
    expect(description.length).toBeLessThan(100);
    expect(description.endsWith('..."')).toBe(true);
  });

  it('uses the given client (e.g. a transaction)', async () => {
    const tx = { feedEvent: { create: jest.fn().mockResolvedValue({ id: 'tx' }) } };
    await recordIssueCreated(issue, 'user-1', tx);
    expect(tx.feedEvent.create).toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('never throws when the write fails, and logs no content', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    create.mockRejectedValue(new Error('db down'));
    await expect(
      recordActivity({
        teamId: 'team-1',
        actorId: 'user-1',
        action: 'comment_added',
        targetType: 'issue',
        targetId: 'issue-1',
        description: 'secret text',
      })
    ).resolves.toBeNull();
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret text');
    log.mockRestore();
  });

  it('links feed events to the issue discussion', () => {
    expect(issueHref('team-1', 'issue-1')).toBe('/teams/team-1/discussions/issue-1');
  });
});
