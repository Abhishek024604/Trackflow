import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { SignOutButton } from '@/components/SignOutButton';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  /** Shows a back button instead of the TrackFlow mark. */
  back?: { href: string; label: string };
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Page actions, shown before Sign out. */
  children?: ReactNode;
  /** Max width of the content row, to line up with the page body. */
  width?: 'wide' | 'narrow' | 'full';
}

/** The header every signed-in page shares: back or brand, title, page actions and Sign out. */
export function AppHeader({ back, title, subtitle, children, width = 'wide' }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div
        className={cn(
          'mx-auto flex h-14 items-center justify-between gap-4 px-4 sm:px-6',
          width === 'wide' && 'max-w-6xl',
          width === 'narrow' && 'max-w-3xl'
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {back ? (
            <Link
              href={back.href}
              aria-label={back.label}
              title={back.label}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-md text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                T
              </span>
              TrackFlow
            </Link>
          )}
          {(title || subtitle) && (
            <div className="min-w-0">
              {title && <h1 className="truncate text-sm font-semibold text-foreground">{title}</h1>}
              {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {children}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
