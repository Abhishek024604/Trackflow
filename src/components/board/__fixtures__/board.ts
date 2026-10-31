import type { BoardColumnData, BoardIssue } from '../types';

export const COLUMNS: BoardColumnData[] = [
  { id: 'c1', name: 'To Do', order: 0, color: '#6366f1' },
  { id: 'c2', name: 'In Progress', order: 1, color: '#f59e0b' },
  { id: 'c3', name: 'Done', order: 2, color: '#10b981' },
];

export function makeIssue(overrides: Partial<BoardIssue> = {}): BoardIssue {
  return {
    id: 'i1',
    teamId: 't1',
    title: 'Fix login redirect',
    description: 'Users land on a blank page',
    status: 'To Do',
    priority: 'HIGH',
    category: null,
    assigneeId: 'u1',
    creatorId: 'u1',
    columnId: 'c1',
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z',
    assignee: { id: 'u1', name: 'Maya Chen', email: 'maya@x.dev', image: null },
    ...overrides,
  };
}
