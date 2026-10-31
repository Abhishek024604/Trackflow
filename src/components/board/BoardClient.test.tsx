import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BoardClient } from './BoardClient';
import { COLUMNS, makeIssue } from './__fixtures__/board';
import type { BoardData } from './types';

// next/link schedules prefetch state updates outside act(); a plain anchor is enough here.
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

type FetchCall = [string, RequestInit | undefined];

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function boardData(overrides: Partial<BoardData> = {}): BoardData {
  return {
    team: { id: 't1', name: 'Web App' },
    columns: COLUMNS,
    issues: [makeIssue()],
    members: [
      { id: 'u1', name: 'Maya Chen', email: 'maya@x.dev', image: null, role: 'LEAD' },
      { id: 'u2', name: 'Sam Ortiz', email: 'sam@x.dev', image: null, role: 'MEMBER' },
    ],
    viewer: { id: 'u2', role: 'MEMBER' },
    ...overrides,
  };
}

let fetchMock: jest.Mock;

function setupFetch(board: BoardData, handler?: (url: string, init?: RequestInit) => Response | undefined) {
  fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
    const handled = handler?.(url, init);
    if (handled) return handled;
    if (url === '/api/boards/t1') return jsonResponse(200, board);
    return jsonResponse(500, { error: 'unexpected' });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
}

const callsTo = (method: string) =>
  (fetchMock.mock.calls as FetchCall[]).filter(([, init]) => (init?.method ?? 'GET') === method);

describe('BoardClient', () => {
  it('shows a skeleton, then the board', async () => {
    setupFetch(boardData());
    render(<BoardClient teamId="t1" />);
    expect(screen.getByRole('status', { name: 'Loading board' })).toBeInTheDocument();
    expect(await screen.findByText('Fix login redirect')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Web App' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading board' })).not.toBeInTheDocument();
  });

  it('shows a friendly empty state when there are no issues', async () => {
    setupFetch(boardData({ issues: [] }));
    render(<BoardClient teamId="t1" />);
    expect(await screen.findByText('No issues yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create issue' })).toBeInTheDocument();
  });

  it('shows an error with a retry when the board fails to load', async () => {
    setupFetch(boardData(), (url) => (url === '/api/boards/t1' ? jsonResponse(404, { error: 'Team not found' }) : undefined));
    render(<BoardClient teamId="t1" />);
    expect(await screen.findByText('Team not found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('opens "New issue" on arrival when asked to (Create issue from the workspace)', async () => {
    window.history.replaceState(null, '', '/teams/t1/board?new=1');
    setupFetch(boardData());
    render(<BoardClient teamId="t1" openNewIssue />);

    expect(await screen.findByRole('dialog', { name: 'New issue' })).toBeInTheDocument();
    expect(window.location.search).toBe('');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    window.history.replaceState(null, '', '/');
  });

  it('opens "New issue" with the C shortcut, but not while typing', async () => {
    setupFetch(boardData());
    render(<BoardClient teamId="t1" />);
    await screen.findByText('Fix login redirect');

    fireEvent.keyDown(screen.getByLabelText('Search issues'), { key: 'c' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'c' });
    expect(screen.getByRole('dialog', { name: 'New issue' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('requires a title, then creates the issue with defaults and an assignee', async () => {
    setupFetch(boardData(), (url, init) =>
      url === '/api/issues' && init?.method === 'POST'
        ? jsonResponse(201, {
            issue: makeIssue({ id: 'i9', title: 'Add dark mode', status: 'To Do', priority: 'MEDIUM', assigneeId: 'u2', assignee: { id: 'u2', name: 'Sam Ortiz', email: 'sam@x.dev', image: null } }),
          })
        : undefined
    );
    render(<BoardClient teamId="t1" />);
    await screen.findByText('Fix login redirect');

    fireEvent.click(screen.getByRole('button', { name: /New issue/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Title is required');
    expect(callsTo('POST')).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Add dark mode' } });
    expect(screen.getByLabelText('Status')).toHaveValue('To Do');
    expect(screen.getByLabelText('Priority')).toHaveValue('MEDIUM');
    fireEvent.change(screen.getByLabelText('Assignee'), { target: { value: 'u2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create issue' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [, init] = callsTo('POST')[0];
    expect(JSON.parse(init!.body as string)).toEqual({
      teamId: 't1',
      title: 'Add dark mode',
      description: '',
      priority: 'MEDIUM',
      status: 'To Do',
      assigneeId: 'u2',
    });
    expect(within(screen.getByRole('region', { name: 'To Do' })).getByText('Add dark mode')).toBeInTheDocument();
  });

  it('moves an issue between columns', async () => {
    setupFetch(boardData(), (url, init) =>
      url === '/api/issues/i1' && init?.method === 'PATCH'
        ? jsonResponse(200, { issue: makeIssue({ status: 'In Progress' }) })
        : undefined
    );
    render(<BoardClient teamId="t1" />);
    await screen.findByText('Fix login redirect');

    fireEvent.change(screen.getByLabelText('Move Fix login redirect'), { target: { value: 'In Progress' } });

    await waitFor(() =>
      expect(within(screen.getByRole('region', { name: 'In Progress' })).getByText('Fix login redirect')).toBeInTheDocument()
    );
    expect(JSON.parse(callsTo('PATCH')[0][1]!.body as string)).toEqual({ status: 'In Progress' });
  });

  it('puts the card back and explains when moving to Done is forbidden (403)', async () => {
    setupFetch(boardData(), (url, init) =>
      url === '/api/issues/i1' && init?.method === 'PATCH'
        ? jsonResponse(403, { error: 'Only the assignee or a project lead can move an issue to Done' })
        : undefined
    );
    render(<BoardClient teamId="t1" />);
    await screen.findByText('Fix login redirect');

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Move Fix login redirect'), { target: { value: 'Done' } });
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Only the assignee or a project lead can move an issue to Done');
    expect(within(screen.getByRole('region', { name: 'To Do' })).getByText('Fix login redirect')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Done' })).queryByText('Fix login redirect')).not.toBeInTheDocument();
  });

  it('edits priority from the issue details and sends only the change', async () => {
    setupFetch(boardData(), (url, init) =>
      url === '/api/issues/i1' && init?.method === 'PATCH'
        ? jsonResponse(200, { issue: makeIssue({ priority: 'LOW' }) })
        : undefined
    );
    render(<BoardClient teamId="t1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fix login redirect' }));

    const dialog = screen.getByRole('dialog', { name: 'Issue details' });
    expect(within(dialog).getByLabelText('Description')).toHaveValue('Users land on a blank page');
    expect(within(dialog).getByLabelText('Assignee')).toHaveValue('u1');
    fireEvent.change(within(dialog).getByLabelText('Priority'), { target: { value: 'LOW' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(JSON.parse(callsTo('PATCH')[0][1]!.body as string)).toEqual({ priority: 'LOW' });
    expect(screen.getByTestId('priority-badge')).toHaveTextContent('Low');
  });

  it('deletes an issue', async () => {
    setupFetch(boardData(), (url, init) =>
      url === '/api/issues/i1' && init?.method === 'DELETE' ? jsonResponse(204, null) : undefined
    );
    render(<BoardClient teamId="t1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fix login redirect' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete issue' }));
    expect(await screen.findByText('No issues yet')).toBeInTheDocument();
  });

  it('filters by search text and assignee', async () => {
    setupFetch(
      boardData({
        issues: [
          makeIssue(),
          makeIssue({ id: 'i2', title: 'Write onboarding docs', description: null, assigneeId: 'u2', assignee: { id: 'u2', name: 'Sam Ortiz', email: 'sam@x.dev', image: null } }),
        ],
      })
    );
    render(<BoardClient teamId="t1" />);
    await screen.findByText('Fix login redirect');

    fireEvent.change(screen.getByLabelText('Search issues'), { target: { value: 'onboarding' } });
    expect(screen.queryByText('Fix login redirect')).not.toBeInTheDocument();
    expect(screen.getByText('Write onboarding docs')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search issues'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Filter by assignee'), { target: { value: 'u1' } });
    expect(screen.getByText('Fix login redirect')).toBeInTheDocument();
    expect(screen.queryByText('Write onboarding docs')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter by assignee'), { target: { value: 'unassigned' } });
    expect(screen.getByText('No issues match your filters.')).toBeInTheDocument();
  });
});
