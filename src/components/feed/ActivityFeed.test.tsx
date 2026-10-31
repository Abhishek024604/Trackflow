import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ActivityFeed, type FeedEventDto } from './ActivityFeed';

const ada = { id: 'u1', name: 'Ada', email: 'ada@example.com', image: null };

function event(id: string, overrides: Partial<FeedEventDto> = {}): FeedEventDto {
  return {
    id,
    action: 'issue_created',
    targetType: 'issue',
    targetId: `issue-${id}`,
    description: `created issue "Issue ${id}"`,
    timestamp: new Date().toISOString(),
    actor: ada,
    ...overrides,
  };
}

const ok = (body: unknown) => Promise.resolve({ ok: true, json: async () => body });
let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('ActivityFeed', () => {
  it('shows a skeleton, then events with actor, description, time and a link', async () => {
    let resolve!: (v: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    render(<ActivityFeed teamId="team-1" />);

    expect(screen.getByTestId('feed-skeleton')).toBeInTheDocument();
    resolve({
      ok: true,
      json: async () => ({
        events: [event('1'), event('2', { action: 'comment_added', description: 'commented on "Issue 1"' })],
        nextCursor: null,
      }),
    });

    const items = await screen.findAllByTestId('feed-item');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Ada created issue "Issue 1"');
    expect(items[0]).toHaveTextContent('just now');
    expect(items[1]).toHaveTextContent('commented on "Issue 1"');
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/teams/team-1/discussions/issue-1');
    expect(screen.queryByTestId('feed-skeleton')).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/api/feed?teamId=team-1&filter=all');
  });

  it('shows a friendly empty state', async () => {
    fetchMock.mockReturnValue(ok({ events: [], nextCursor: null }));
    render(<ActivityFeed teamId="team-1" />);
    expect(await screen.findByText('No activity yet')).toBeInTheDocument();
  });

  it('switches to My activity and refetches with filter=my', async () => {
    fetchMock.mockReturnValue(ok({ events: [], nextCursor: null }));
    render(<ActivityFeed teamId="team-1" />);
    await screen.findByText('No activity yet');

    fireEvent.click(screen.getByRole('tab', { name: 'My activity' }));

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('/api/feed?teamId=team-1&filter=my'));
    expect(await screen.findByText('You haven’t done anything yet')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'My activity' })).toHaveAttribute('aria-selected', 'true');
  });

  it('loads more with the cursor and appends events', async () => {
    fetchMock
      .mockReturnValueOnce(ok({ events: [event('1')], nextCursor: '1' }))
      .mockReturnValueOnce(ok({ events: [event('2')], nextCursor: null }));
    render(<ActivityFeed teamId="team-1" pageSize={1} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Load more' }));

    await waitFor(() => expect(screen.getAllByTestId('feed-item')).toHaveLength(2));
    expect(fetchMock).toHaveBeenLastCalledWith('/api/feed?teamId=team-1&filter=all&cursor=1&limit=1');
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  it('shows an error with a retry', async () => {
    fetchMock
      .mockReturnValueOnce(Promise.resolve({ ok: false, json: async () => ({}) }))
      .mockReturnValueOnce(ok({ events: [event('1')], nextCursor: null }));
    render(<ActivityFeed teamId="team-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findAllByTestId('feed-item')).toHaveLength(1);
  });
});
