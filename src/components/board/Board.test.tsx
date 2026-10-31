import { fireEvent, render, screen, within } from '@testing-library/react';
import { Board } from './Board';
import { BoardSkeleton } from './BoardSkeleton';
import { PriorityBadge } from './PriorityBadge';
import { COLUMNS, makeIssue } from './__fixtures__/board';

describe('Board', () => {
  const issues = [
    makeIssue(),
    makeIssue({ id: 'i2', title: 'Write docs', status: 'In Progress', priority: 'LOW', assignee: null, assigneeId: null }),
  ];

  it('renders one column per status with its issues and counts', () => {
    render(<Board columns={COLUMNS} issues={issues} onMove={jest.fn()} onOpen={jest.fn()} />);

    const todo = screen.getByRole('region', { name: 'To Do' });
    expect(within(todo).getByText('Fix login redirect')).toBeInTheDocument();
    expect(within(todo).getByText('1')).toBeInTheDocument();

    const doing = screen.getByRole('region', { name: 'In Progress' });
    expect(within(doing).getByText('Write docs')).toBeInTheDocument();
    expect(within(doing).getByLabelText('Unassigned')).toBeInTheDocument();

    const done = screen.getByRole('region', { name: 'Done' });
    expect(within(done).getByText(/No issues here/)).toBeInTheDocument();
  });

  it('shows priority badges and the assignee', () => {
    render(<Board columns={COLUMNS} issues={issues} onMove={jest.fn()} onOpen={jest.fn()} />);
    const badges = screen.getAllByTestId('priority-badge');
    expect(badges.map((b) => b.textContent)).toEqual(['High', 'Low']);
    expect(screen.getByLabelText('Assigned to Maya Chen')).toBeInTheDocument();
  });

  it('moves an issue by drag and drop', () => {
    const onMove = jest.fn();
    render(<Board columns={COLUMNS} issues={issues} onMove={onMove} onOpen={jest.fn()} />);

    const card = within(screen.getByRole('region', { name: 'To Do' })).getByTestId('issue-card');
    const target = screen.getByRole('region', { name: 'In Progress' });
    fireEvent.dragStart(card);
    fireEvent.dragOver(target);
    fireEvent.drop(target);

    expect(onMove).toHaveBeenCalledWith('i1', 'In Progress');
  });

  it('does not move when dropped back on its own column', () => {
    const onMove = jest.fn();
    render(<Board columns={COLUMNS} issues={issues} onMove={onMove} onOpen={jest.fn()} />);
    const todo = screen.getByRole('region', { name: 'To Do' });
    fireEvent.dragStart(within(todo).getByTestId('issue-card'));
    fireEvent.drop(todo);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('moves an issue with the keyboard-friendly "Move to" menu', () => {
    const onMove = jest.fn();
    render(<Board columns={COLUMNS} issues={issues} onMove={onMove} onOpen={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('Move Fix login redirect'), { target: { value: 'Done' } });
    expect(onMove).toHaveBeenCalledWith('i1', 'Done');
  });

  it('opens an issue when its title is clicked and keeps long titles whole', () => {
    const onOpen = jest.fn();
    const long = 'x'.repeat(250);
    render(<Board columns={COLUMNS} issues={[makeIssue({ title: long })]} onMove={jest.fn()} onOpen={onOpen} />);
    const title = screen.getByRole('button', { name: long });
    expect(title).toHaveAttribute('title', long);
    expect(title).toHaveClass('truncate');
    fireEvent.click(title);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'i1' }));
  });
});

describe('PriorityBadge', () => {
  it('labels every priority', () => {
    const { rerender } = render(<PriorityBadge priority="URGENT" />);
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    rerender(<PriorityBadge priority="MEDIUM" />);
    expect(screen.getByTestId('priority-badge')).toHaveAttribute('data-priority', 'MEDIUM');
  });
});

describe('BoardSkeleton', () => {
  it('announces loading', () => {
    render(<BoardSkeleton />);
    expect(screen.getByRole('status', { name: 'Loading board' })).toBeInTheDocument();
  });
});
