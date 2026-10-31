import { z } from 'zod';

/** Issue priorities, highest first. Mirrors the Prisma `Priority` enum (CMP-007). */
export const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const;
export type IssuePriority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export const CATEGORIES = ['BUG', 'FEATURE', 'TASK', 'IMPROVEMENT'] as const;
export type IssueCategory = (typeof CATEGORIES)[number];

/** The OpenAPI contract uses lowercase enums (`low|medium|high`); accept either case. */
const priority = z.preprocess(
  (v) => (typeof v === 'string' ? v.toUpperCase() : v),
  z.enum(PRIORITIES, { errorMap: () => ({ message: 'Priority not valid' }) })
);

const category = z.preprocess(
  (v) => (typeof v === 'string' ? v.toUpperCase() : v),
  z.enum(CATEGORIES, { errorMap: () => ({ message: 'Category not valid' }) })
);

const title = z
  .string({ required_error: 'Title is required', invalid_type_error: 'Title is required' })
  .trim()
  .min(1, 'Title is required')
  .max(1000, 'Title is too long');

const description = z.string().max(20000, 'Description is too long');

export const createIssueSchema = z.object({
  teamId: z.string({ required_error: 'teamId is required' }).min(1, 'teamId is required'),
  title,
  description: description.optional().nullable(),
  status: z.string().min(1).optional(),
  priority: priority.optional(),
  category: category.optional().nullable(),
  assigneeId: z.string().min(1).optional().nullable(),
});

export const updateIssueSchema = z
  .object({
    title: title.optional(),
    description: description.optional().nullable(),
    status: z.string().min(1, 'Column not valid').optional(),
    priority: priority.optional(),
    category: category.optional().nullable(),
    assigneeId: z.string().min(1).optional().nullable(),
  })
  .strict();

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;

export interface ColumnLike {
  id: string;
  name: string;
  order: number;
}

/**
 * The final ("Done") column: one named "Done", or else the last column by order,
 * so the rule still holds after a lead renames the column.
 */
export function isDoneColumn(column: ColumnLike, columns: ColumnLike[]): boolean {
  if (column.name.trim().toLowerCase() === 'done') return true;
  const last = [...columns].sort((a, b) => a.order - b.order).at(-1);
  return last?.id === column.id;
}

/**
 * CMP-004 state rule: only the current assignee or a project admin (team LEAD)
 * may move an issue to Done.
 */
export function canMoveToDone(params: {
  userId: string;
  role: 'LEAD' | 'MEMBER' | string;
  assigneeId: string | null | undefined;
}): boolean {
  return params.role === 'LEAD' || (!!params.assigneeId && params.assigneeId === params.userId);
}

export const issueInclude = {
  assignee: { select: { id: true, name: true, email: true, image: true } },
  creator: { select: { id: true, name: true, email: true, image: true } },
} as const;
