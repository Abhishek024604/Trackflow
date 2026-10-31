/**
 * Demo data: 4 people, 2 projects (teams), 12 issues across the board, and a
 * few comments (with an @mention and a reply) plus matching activity feed events.
 * Run with `npx prisma db seed`. Safe to re-run: users are upserted and the
 * demo projects' issues, comments and feed events are recreated. Every demo account uses the password
 * "password123" (local/demo use only).
 */
import { PrismaClient, type Priority } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const PEOPLE = [
  { key: 'maya', name: 'Maya Chen', email: 'maya@trackflow.dev' },
  { key: 'sam', name: 'Sam Ortiz', email: 'sam@trackflow.dev' },
  { key: 'priya', name: 'Priya Nair', email: 'priya@trackflow.dev' },
  { key: 'leo', name: 'Leo Park', email: 'leo@trackflow.dev' },
] as const;
type PersonKey = (typeof PEOPLE)[number]['key'];

const COLUMNS = [
  { name: 'To Do', order: 0, color: '#6366f1' },
  { name: 'In Progress', order: 1, color: '#f59e0b' },
  { name: 'Done', order: 2, color: '#10b981' },
];

type SeedIssue = {
  title: string;
  description: string;
  status: 'To Do' | 'In Progress' | 'Done';
  priority: Priority;
  assignee: PersonKey | null;
};

/** A comment on an issue (matched by title). `replyTo` is the index of an earlier comment in the same project. */
type SeedComment = {
  issue: string;
  author: PersonKey;
  text: string;
  mentions?: PersonKey[];
  replyTo?: number;
  hoursAgo: number;
};

/** An issue event for the activity feed. Comment events are derived from the comments. */
type SeedEvent = {
  issue: string;
  actor: PersonKey;
  action: 'issue_created' | 'issue_updated';
  changes?: string[];
  hoursAgo: number;
};

const PROJECTS: Array<{
  name: string;
  owner: PersonKey;
  members: Array<{ key: PersonKey; role: 'LEAD' | 'MEMBER' }>;
  issues: SeedIssue[];
  comments: SeedComment[];
  events: SeedEvent[];
}> = [
  {
    name: 'Web App',
    owner: 'maya',
    members: [
      { key: 'maya', role: 'LEAD' },
      { key: 'sam', role: 'MEMBER' },
      { key: 'priya', role: 'MEMBER' },
      { key: 'leo', role: 'MEMBER' },
    ],
    issues: [
      { title: 'Login redirects to a blank page after sign in', description: 'Happens on Safari when the callback URL has a query string.', status: 'In Progress', priority: 'URGENT', assignee: 'sam' },
      { title: 'Add keyboard shortcuts help panel', description: 'Show all shortcuts when the user presses "?".', status: 'To Do', priority: 'LOW', assignee: 'leo' },
      { title: 'Board loads slowly with 50+ issues', description: 'Board load must stay under 2 seconds (NFR-001). Profile the query.', status: 'To Do', priority: 'HIGH', assignee: 'priya' },
      { title: 'Invite email copy review', description: 'Make the invite email shorter and friendlier.', status: 'Done', priority: 'MEDIUM', assignee: 'maya' },
      { title: 'Empty state for new teams', description: 'Explain what a board is and how to create the first issue.', status: 'Done', priority: 'MEDIUM', assignee: 'leo' },
      { title: 'Search should match descriptions', description: 'Search currently only looks at titles.', status: 'In Progress', priority: 'MEDIUM', assignee: 'priya' },
      { title: 'Dark theme contrast on priority badges', description: 'Low priority badge is hard to read on the dark board.', status: 'To Do', priority: 'LOW', assignee: null },
    ],
    comments: [
      { issue: 'Login redirects to a blank page after sign in', author: 'sam', text: 'Reproduced on Safari 17: the callback URL loses its query string after the redirect. @mayachen is this the link from the invite email?', mentions: ['maya'], hoursAgo: 6 },
      { issue: 'Login redirects to a blank page after sign in', author: 'maya', text: 'Yes, it is the invite link. I will attach a HAR file so you can see the redirect chain.', replyTo: 0, hoursAgo: 5 },
      { issue: 'Board loads slowly with 50+ issues', author: 'priya', text: 'Profiled it: the board query does one lookup per assignee. A single `include` brings it down to about 300 ms.', hoursAgo: 3 },
    ],
    events: [
      { issue: 'Login redirects to a blank page after sign in', actor: 'maya', action: 'issue_created', hoursAgo: 72 },
      { issue: 'Board loads slowly with 50+ issues', actor: 'maya', action: 'issue_created', hoursAgo: 60 },
      { issue: 'Login redirects to a blank page after sign in', actor: 'sam', action: 'issue_updated', changes: ['status', 'assignee'], hoursAgo: 48 },
      { issue: 'Search should match descriptions', actor: 'priya', action: 'issue_updated', changes: ['status'], hoursAgo: 26 },
      { issue: 'Empty state for new teams', actor: 'leo', action: 'issue_updated', changes: ['status'], hoursAgo: 20 },
      { issue: 'Dark theme contrast on priority badges', actor: 'leo', action: 'issue_created', hoursAgo: 8 },
    ],
  },
  {
    name: 'Mobile App',
    owner: 'priya',
    members: [
      { key: 'priya', role: 'LEAD' },
      { key: 'maya', role: 'MEMBER' },
      { key: 'sam', role: 'MEMBER' },
    ],
    issues: [
      { title: 'Push notifications for assigned issues', description: 'Notify the assignee when an issue is assigned to them.', status: 'To Do', priority: 'HIGH', assignee: 'sam' },
      { title: 'Crash when opening an issue offline', description: 'App crashes if the issue was never cached.', status: 'In Progress', priority: 'URGENT', assignee: 'priya' },
      { title: 'Pull to refresh on the board', description: 'Match the native list behaviour on iOS and Android.', status: 'To Do', priority: 'MEDIUM', assignee: 'maya' },
      { title: 'App icon and splash screen', description: 'Use the new brand assets.', status: 'Done', priority: 'LOW', assignee: 'maya' },
      { title: 'Swipe to move issues between columns', description: 'Swipe right moves an issue to the next column.', status: 'To Do', priority: 'MEDIUM', assignee: null },
    ],
    comments: [
      { issue: 'Crash when opening an issue offline', author: 'priya', text: 'The stack trace points at the cache returning `undefined` for issues that were never opened. @samortiz can you add a guard and an offline empty state?', mentions: ['sam'], hoursAgo: 10 },
      { issue: 'Crash when opening an issue offline', author: 'sam', text: 'On it. I will show a "Not available offline" screen instead of crashing.', replyTo: 0, hoursAgo: 9 },
    ],
    events: [
      { issue: 'Crash when opening an issue offline', actor: 'priya', action: 'issue_created', hoursAgo: 50 },
      { issue: 'Push notifications for assigned issues', actor: 'priya', action: 'issue_created', hoursAgo: 40 },
      { issue: 'Crash when opening an issue offline', actor: 'priya', action: 'issue_updated', changes: ['status'], hoursAgo: 30 },
      { issue: 'App icon and splash screen', actor: 'maya', action: 'issue_updated', changes: ['status'], hoursAgo: 12 },
    ],
  },
];

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

/** The @handle the app inserts for a person: the name without spaces, lower-cased (src/lib/mentions.ts). */
function handleOf(key: PersonKey): string {
  const person = PEOPLE.find((p) => p.key === key)!;
  return person.name.replace(/\s+/g, '').toLowerCase();
}

async function main() {
  const passwordHash = await hash('password123', 12);

  const users = {} as Record<PersonKey, string>;
  for (const person of PEOPLE) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: { name: person.name },
      create: { email: person.email, name: person.name, passwordHash },
    });
    users[person.key] = user.id;
  }

  for (const project of PROJECTS) {
    const ownerId = users[project.owner];
    let team = await prisma.team.findFirst({ where: { name: project.name, ownerId } });
    if (!team) {
      team = await prisma.team.create({
        data: {
          name: project.name,
          ownerId,
          boardColumns: { create: COLUMNS },
          workspaces: { create: { name: `${project.name} Workspace` } },
        },
      });
    }

    for (const member of project.members) {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: team.id, userId: users[member.key] } },
        update: { role: member.role },
        create: { teamId: team.id, userId: users[member.key], role: member.role },
      });
    }

    const columns = await prisma.boardColumn.findMany({ where: { teamId: team.id } });
    const columnId = (name: string) => columns.find((c) => c.name === name)?.id ?? null;

    // Recreate the issues (their comments and mentions cascade) and the team's feed events,
    // so re-running the seed never duplicates them.
    await prisma.feedEvent.deleteMany({ where: { teamId: team.id } });
    await prisma.issue.deleteMany({ where: { teamId: team.id } });
    const issueIds: Record<string, string> = {};
    for (const issue of project.issues) {
      const created = await prisma.issue.create({
        data: {
          teamId: team.id,
          title: issue.title,
          description: issue.description,
          status: issue.status,
          columnId: columnId(issue.status),
          priority: issue.priority,
          assigneeId: issue.assignee ? users[issue.assignee] : null,
          creatorId: ownerId,
        },
      });
      issueIds[issue.title] = created.id;
    }

    const teamId = team.id;
    const issueId = (title: string) => {
      const id = issueIds[title];
      if (!id) throw new Error(`Seed refers to an unknown issue: ${title}`);
      return id;
    };

    // Descriptions match src/lib/activity.ts so seeded events read like real ones.
    for (const event of project.events) {
      const changes = event.changes?.length ? ` (${event.changes.join(', ')})` : '';
      const verb = event.action === 'issue_created' ? 'created' : 'updated';
      await prisma.feedEvent.create({
        data: {
          teamId,
          actorId: users[event.actor],
          action: event.action,
          targetType: 'issue',
          targetId: issueId(event.issue),
          description: `${verb} issue "${event.issue}"${changes}`,
          timestamp: hoursAgo(event.hoursAgo),
        },
      });
    }

    const commentIds: string[] = [];
    for (const comment of project.comments) {
      const at = hoursAgo(comment.hoursAgo);
      const created = await prisma.comment.create({
        data: {
          text: comment.text,
          issueId: issueId(comment.issue),
          authorId: users[comment.author],
          parentId: comment.replyTo !== undefined ? commentIds[comment.replyTo] : null,
          createdAt: at,
          updatedAt: at,
          mentions: comment.mentions?.length
            ? { create: comment.mentions.map((key) => ({ userId: users[key] })) }
            : undefined,
        },
      });
      commentIds.push(created.id);

      const handles = (comment.mentions ?? []).map((key) => `@${handleOf(key)}`);
      const mentioned = handles.length ? ` and mentioned ${handles.join(', ')}` : '';
      await prisma.feedEvent.create({
        data: {
          teamId,
          actorId: users[comment.author],
          action: 'comment_added',
          targetType: 'issue',
          targetId: issueId(comment.issue),
          description: `commented on "${comment.issue}"${mentioned}`,
          timestamp: at,
        },
      });
    }
  }

  const issueCount = PROJECTS.reduce((n, p) => n + p.issues.length, 0);
  const commentCount = PROJECTS.reduce((n, p) => n + p.comments.length, 0);
  console.log(
    `Seeded ${PEOPLE.length} people, ${PROJECTS.length} projects, ${issueCount} issues, ${commentCount} comments.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
