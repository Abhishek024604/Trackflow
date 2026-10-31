import type { IssueCategory, IssuePriority } from '@/lib/issues';

export interface BoardUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface BoardMember extends BoardUser {
  role: 'LEAD' | 'MEMBER';
}

export interface BoardColumnData {
  id: string;
  name: string;
  order: number;
  color: string;
}

export interface BoardIssue {
  id: string;
  teamId: string;
  title: string;
  description: string | null;
  status: string;
  priority: IssuePriority;
  category: IssueCategory | null;
  assigneeId: string | null;
  creatorId: string;
  columnId: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: BoardUser | null;
}

export interface BoardData {
  team: { id: string; name: string };
  columns: BoardColumnData[];
  issues: BoardIssue[];
  members: BoardMember[];
  viewer: { id: string; role: 'LEAD' | 'MEMBER' };
}

export interface IssueFormValues {
  title: string;
  description: string;
  priority: IssuePriority;
  status: string;
  assigneeId: string | null;
}

export function displayName(user: Pick<BoardUser, 'name' | 'email'>): string {
  return user.name || user.email;
}

export function initials(user: Pick<BoardUser, 'name' | 'email'>): string {
  return (user.name?.[0] || user.email[0] || '?').toUpperCase();
}
