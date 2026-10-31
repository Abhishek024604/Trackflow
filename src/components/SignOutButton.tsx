'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const SIGN_OUT_CALLBACK_URL = '/auth/signin';

/**
 * Signs out through Auth.js's own sign-out endpoint (CSRF-protected POST to /api/auth/signout),
 * then lands on the sign-in page.
 */
export function SignOutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={busy}
      aria-label={busy ? 'Signing out' : 'Sign out'}
      title="Sign out"
      onClick={async () => {
        setBusy(true);
        try {
          await signOut({ callbackUrl: SIGN_OUT_CALLBACK_URL });
        } catch {
          setBusy(false);
        }
      }}
      className={cn('gap-2 text-muted-foreground hover:text-foreground', className)}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">{busy ? 'Signing out…' : 'Sign out'}</span>
    </Button>
  );
}
