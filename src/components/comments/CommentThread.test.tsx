import { fireEvent, render, screen, within } from '@testing-library/react';
import { CommentThread } from './CommentThread';
import type { CommentDto } from '@/lib/comments';

const ada = { id: 'u1', name: 'Ada', email: 'ada@example.com', image: null };
const bob = { id: 'u2', name: 'Bob', email: 'bob@example.com', image: null };
const members = [ada, bob];

function comment(id: string, overrides: Partial<CommentDto> = {}): CommentDto {
  const t = new Date().toISOString();
  return {
    id,
    issueId: 'issue-1',
    parentId: null,
    text: `Comment ${id}`,
    deleted: false,
    edited: false,
    createdAt: t,
    updatedAt: t,
    author: ada,
    mentionedUserIds: [],
    ...overrides,
  };
}

const ok = (body: unknown) => Promise.resolve({ ok: true, json: async () => body });
let fetchMock: jest.Mock;

function renderThread(comments: CommentDto[]) {
  fetchMock.mockReturnValueOnce(ok({ comments }));
  return render(<CommentThread issueId="issue-1" currentUserId="u1" members={members} />);
}

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('CommentThread', () => {
  it('shows a skeleton while loading, then a friendly empty state', async () => {
    renderThread([]);
    expect(screen.getByTestId('comments-skeleton')).toBeInTheDocument();
    expect(await screen.findByText('No comments yet')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/issues/issue-1/comments');
  });

  it('threads replies under their parent and highlights mentions', async () => {
    renderThread([
      comment('1', { text: 'Can @bob look?' }),
      comment('2', { parentId: '1', author: bob, text: 'On it' }),
    ]);
    const parent = await screen.findByRole('article', { name: 'Comment by Ada' });
    expect(within(parent).getByTestId('mention')).toHaveTextContent('@bob');
    const reply = screen.getByRole('article', { name: 'Comment by Bob' });
    expect(reply.closest('li')?.parentElement?.closest('li')).toContainElement(parent);
  });

  it('shows Edit and Delete only on my own comments', async () => {
    renderThread([comment('1'), comment('2', { author: bob })]);
    const mine = await screen.findByRole('article', { name: 'Comment by Ada' });
    const theirs = screen.getByRole('article', { name: 'Comment by Bob' });
    expect(within(mine).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(mine).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(within(theirs).queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(within(theirs).queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(within(theirs).getByRole('button', { name: 'Reply' })).toBeInTheDocument();
  });

  it('blocks an empty comment with "Comment cannot be empty"', async () => {
    renderThread([]);
    fireEvent.click(await screen.findByRole('button', { name: 'Post' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Comment cannot be empty');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('posts a comment and shows it with my name', async () => {
    renderThread([]);
    fetchMock.mockReturnValueOnce(ok({ comment: comment('9', { text: 'First!' }) }));

    fireEvent.change(await screen.findByLabelText('Comment'), { target: { value: 'First!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));

    expect(await screen.findByRole('article', { name: 'Comment by Ada' })).toHaveTextContent('First!');
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/issues/issue-1/comments',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ text: 'First!' }) })
    );
    expect(screen.getByLabelText('Comment')).toHaveValue('');
  });

  it('suggests team members after "@" and inserts the chosen handle', async () => {
    renderThread([]);
    const box = await screen.findByLabelText('Comment');
    fireEvent.change(box, { target: { value: 'Hey @bo' } });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Bob');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(box).toHaveValue('Hey @bob ');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('edits my comment', async () => {
    renderThread([comment('1', { text: 'Old text' })]);
    const mine = await screen.findByRole('article', { name: 'Comment by Ada' });
    fireEvent.click(within(mine).getByRole('button', { name: 'Edit' }));

    const editor = within(mine).getByLabelText('Comment');
    fireEvent.change(editor, { target: { value: 'New text' } });
    fetchMock.mockReturnValueOnce(ok({ comment: comment('1', { text: 'New text', edited: true }) }));
    fireEvent.click(within(mine).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('(edited)')).toBeInTheDocument();
    const saved = screen.getByRole('article', { name: 'Comment by Ada' });
    expect(within(saved).queryByLabelText('Comment')).toBeNull();
    expect(saved).toHaveTextContent('New text');
    expect(fetchMock).toHaveBeenLastCalledWith('/api/comments/1', expect.objectContaining({ method: 'PATCH' }));
  });

  it('deletes my comment after confirming and leaves a placeholder', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderThread([comment('1')]);
    const mine = await screen.findByRole('article', { name: 'Comment by Ada' });
    fetchMock.mockReturnValueOnce(ok({ id: '1', deleted: true, keptForReplies: false }));

    fireEvent.click(within(mine).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Comment deleted')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/comments/1', { method: 'DELETE' });
    confirm.mockRestore();
  });

  it('shows "Parent comment deleted" above surviving replies', async () => {
    renderThread([comment('1', { deleted: true, text: '' }), comment('2', { parentId: '1', author: bob })]);
    expect(await screen.findByText('Parent comment deleted')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Comment by Bob' })).toBeInTheDocument();
  });

  it('truncates very long comments with Show more', async () => {
    renderThread([comment('1', { text: 'a'.repeat(5100) })]);
    fireEvent.click(await screen.findByRole('button', { name: 'Show more' }));
    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument();
  });
});
