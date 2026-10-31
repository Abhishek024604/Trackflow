import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignUpPage from './page';
import { useRouter } from 'next/navigation';

jest.mock('next/navigation');

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockPush = jest.fn();
const mockRefresh = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockUseRouter.mockReturnValue({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    refresh: mockRefresh,
    forward: jest.fn(),
  });

  // Mock fetch
  global.fetch = jest.fn();
});

describe('SignUpPage', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  it('renders sign up form', () => {
    render(<SignUpPage />);
    expect(screen.getByText('Create an account')).toBeInTheDocument();
    expect(screen.getByLabelText('Name (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('creates account and signs in successfully', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: { id: 'user-1', email: 'test@example.com' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    render(<SignUpPage />);
    await user.type(screen.getByLabelText('Name (optional)'), 'Test User');
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/teams/new');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('links to sign in page', () => {
    render(<SignUpPage />);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/signin');
  });
});