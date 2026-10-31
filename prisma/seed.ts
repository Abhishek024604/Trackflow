/**
 * Demo data: 4 people, 2 projects (teams) and 12 issues across the board.
 * Run with `npx prisma db seed`. Safe to re-run: users are upserted and the
 * demo projects' issues are recreated. Every demo account uses the password
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

const PROJECTS: Array<{
  name: string;
  owner: PersonKey;
  members: Array<{ key: PersonKey; role: 'LEAD' | 'MEMBER' }>;
  issues: SeedIssue[];
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
  },
];

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

    await prisma.issue.deleteMany({ where: { teamId: team.id } });
    for (const issue of project.issues) {
      await prisma.issue.create({
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
    }
  }

  const issueCount = PROJECTS.reduce((n, p) => n + p.issues.length, 0);
  console.log(`Seeded ${PEOPLE.length} people, ${PROJECTS.length} projects, ${issueCount} issues.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
