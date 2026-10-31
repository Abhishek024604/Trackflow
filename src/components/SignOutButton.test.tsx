import { existsSync } from 'fs';
import { join } from 'path';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { signOut } from 'next-auth/react';
import { SignOutButton } from '@/components/SignOutButton';

// next-auth/react is mocked in jest.setup.ts.

const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;

describe('SignOutButton', () => {
  beforeEach(() => mockSignOut.mockReset());

  it('signs out through Auth.js and returns to the sign-in page', async () => {
    mockSignOut.mockResolvedValue(undefined as never);
    render(<SignOutButton />);

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/auth/signin' });
    expect(screen.getByRole('button', { name: /signing out/i })).toBeDisabled();
  });

  it('can be clicked again if signing out fails', async () => {
    mockSignOut.mockRejectedValue(new Error('network'));
    render(<SignOutButton />);

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /sign out/i })).toBeEnabled());
  });

  it('no custom route shadows the Auth.js sign-out endpoint', () => {
    const shadowRoute = join(process.cwd(), 'src/app/api/auth/signout/route.ts');
    expect(existsSync(shadowRoute)).toBe(false);
  });
});
