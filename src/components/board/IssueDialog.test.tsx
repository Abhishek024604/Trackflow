import { render, screen } from '@testing-library/react';
import { IssueDialog } from './IssueDialog';
import { COLUMNS, makeIssue } from './__fixtures__/board';

describe('IssueDialog', () => {
  const props = { columns: COLUMNS, members: [], onSubmit: jest.fn(), onClose: jest.fn() };

  it('links an existing issue to its comments', () => {
    const issue = makeIssue();
    render(<IssueDialog {...props} issue={issue} />);
    expect(screen.getByRole('link', { name: /comments/i })).toHaveAttribute(
      'href',
      `/teams/${issue.teamId}/discussions/${issue.id}`,
    );
  });

  it('has no comments link while creating an issue', () => {
    render(<IssueDialog {...props} />);
    expect(screen.queryByRole('link', { name: /comments/i })).not.toBeInTheDocument();
  });
});
