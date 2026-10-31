import { render, screen } from '@testing-library/react';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('renders bold, italic, inline code and code blocks', () => {
    const { container } = render(
      <Markdown text={'This is **bold**, *soft* and `code`.\n\n```js\nconst x = 1;\n```'} />
    );
    expect(container.querySelector('strong')).toHaveTextContent('bold');
    expect(container.querySelector('em')).toHaveTextContent('soft');
    expect(container.querySelector('p code')).toHaveTextContent('code');
    expect(container.querySelector('pre code')).toHaveTextContent('const x = 1;');
  });

  it('renders http(s) links safely and leaves other schemes as text', () => {
    render(<Markdown text={'See [docs](https://example.com/a) or [bad](javascript:alert(1))'} />);
    const link = screen.getByRole('link', { name: 'docs' });
    expect(link).toHaveAttribute('href', 'https://example.com/a');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.queryByRole('link', { name: 'bad' })).toBeNull();
  });

  it('never injects HTML', () => {
    const { container } = render(<Markdown text={'<img src=x onerror=alert(1)>'} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('<img src=x onerror=alert(1)>');
  });

  it('highlights only mentions of team members', () => {
    render(<Markdown text={'Ping @bob and @stranger, mail bob@example.com'} mentionHandles={new Set(['bob'])} />);
    const mentions = screen.getAllByTestId('mention');
    expect(mentions).toHaveLength(1);
    expect(mentions[0]).toHaveTextContent('@bob');
  });
});
