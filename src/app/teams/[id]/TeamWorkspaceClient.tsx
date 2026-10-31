'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Activity, ChevronRight, KanbanSquare, Mail, Plus, Settings, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ActivityFeed } from '@/components/feed/ActivityFeed';
import { AppHeader } from '@/components/AppHeader';

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface TeamMember {
  id: string;
  role: 'LEAD' | 'MEMBER';
  createdAt: Date | string;
  user: User;
}

interface Team {
  id: string;
  name: string;
  ownerId: string;
  owner: User;
  members: TeamMember[];
  workspaces: Array<{ id: string; name: string }>;
  boardColumns: Array<{ id: string; name: string; order: number; color: string }>;
}

interface TeamWorkspaceClientProps {
  team: Team;
  currentUserId: string;
  isLead: boolean;
  membership: { id: string; role: 'LEAD' | 'MEMBER' };
  /** Issues per column name. */
  issueCounts?: Record<string, number>;
}

const tileClass =
  'rounded-lg border border-border bg-card transition-colors hover:border-input hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function TeamWorkspaceClient({
  team,
  currentUserId,
  isLead,
  issueCounts = {},
}: TeamWorkspaceClientProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteError(null);

    try {
      const response = await fetch(`/api/teams/${team.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        setInviteError(result.error || 'Failed to send invitation');
        return;
      }

      setInviteSuccess(true);
      setInviteEmail('');
      // In a real app, you'd refresh the members list
    } catch (err) {
      setInviteError('Something went wrong. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  const closeInvite = () => {
    setShowInviteModal(false);
    setInviteError(null);
    setInviteSuccess(false);
  };

  const boardHref = `/teams/${team.id}/board`;
  const totalIssues = team.boardColumns.reduce((n, c) => n + (issueCounts[c.name] ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        back={{ href: '/dashboard', label: 'Back to teams' }}
        title={team.name}
        subtitle={team.workspaces[0]?.name || 'Workspace'}
      >
        {isLead && (
          <Button size="sm" onClick={() => setShowInviteModal(true)} className="hidden sm:inline-flex">
            <Mail className="mr-2 h-4 w-4" />
            Invite members
          </Button>
        )}
        <TeamMenu teamId={team.id} isLead={isLead} onInvite={() => setShowInviteModal(true)} />
      </AppHeader>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Team members and activity */}
          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Team members
                  <span className="text-xs font-normal text-muted-foreground">{team.members.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {team.members.map((member) => (
                  <div
                    key={member.id}
                    className={cn(
                      'flex items-center gap-3 rounded-md p-2',
                      member.user.id === currentUserId && 'bg-primary/10'
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/25 text-xs font-semibold text-indigo-200">
                      {member.user.name?.[0]?.toUpperCase() || member.user.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {member.user.name || member.user.email}
                        {member.user.id === currentUserId && (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        member.role === 'LEAD'
                          ? 'border-primary/40 bg-primary/15 text-indigo-300'
                          : 'border-border bg-muted text-muted-foreground'
                      )}
                    >
                      {member.role === 'LEAD' ? 'Lead' : 'Member'}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Team Activity Feed (STORY-003) */}
            <div className="space-y-2">
              <ActivityFeed teamId={team.id} compact pageSize={10} />
              <Link
                href={`/teams/${team.id}/activity`}
                className="block rounded-md py-1 text-center text-xs font-medium text-indigo-300 hover:text-indigo-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                View all activity
              </Link>
            </div>
          </div>

          <div className="space-y-8 lg:col-span-2">
            {/* Board overview: issues per column */}
            <section aria-labelledby="board-overview">
              <div className="mb-4 flex items-baseline justify-between gap-2">
                <h2 id="board-overview" className="text-sm font-semibold text-foreground">
                  Board
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {totalIssues} issue{totalIssues !== 1 ? 's' : ''}
                  </span>
                </h2>
                <Link
                  href={boardHref}
                  className="flex items-center gap-1 rounded-md text-xs font-medium text-indigo-300 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Open board
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {team.boardColumns.map((column) => {
                  const count = issueCounts[column.name] ?? 0;
                  return (
                    <Link
                      key={column.id}
                      href={boardHref}
                      aria-label={`${column.name}: ${count} issue${count !== 1 ? 's' : ''}. Open the board`}
                      className={cn(tileClass, 'p-4')}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} aria-hidden />
                        <h3 className="text-sm font-medium text-foreground">{column.name}</h3>
                      </div>
                      <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{count}</p>
                      <p className="text-xs text-muted-foreground">issue{count !== 1 ? 's' : ''}</p>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="quick-actions">
              <h2 id="quick-actions" className="mb-4 text-sm font-semibold text-foreground">
                Quick actions
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link href={`${boardHref}?new=1`} className={cn(tileClass, 'flex items-center gap-3 p-4')}>
                  <QuickActionBody icon={<Plus className="h-5 w-5" />} title="Create issue" description="Add a new task to the board" />
                </Link>
                <Link href={boardHref} className={cn(tileClass, 'flex items-center gap-3 p-4')}>
                  <QuickActionBody
                    icon={<KanbanSquare className="h-5 w-5" />}
                    title="View board"
                    description="See all issues in Kanban view"
                  />
                </Link>
                <Link href={`/teams/${team.id}/activity`} className={cn(tileClass, 'flex items-center gap-3 p-4')}>
                  <QuickActionBody
                    icon={<Activity className="h-5 w-5" />}
                    title="Team activity"
                    description="What changed, and who changed it"
                  />
                </Link>
                {isLead && (
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(true)}
                    className={cn(tileClass, 'flex items-center gap-3 p-4 text-left')}
                  >
                    <QuickActionBody icon={<Mail className="h-5 w-5" />} title="Invite members" description="Add teammates by email" />
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeInvite();
          }}
        >
          <Card role="dialog" aria-modal="true" aria-labelledby="invite-title" className="w-full max-w-md bg-popover">
            <CardHeader>
              <CardTitle id="invite-title">Invite team members</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email address</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    autoFocus
                  />
                </div>
                {inviteError && (
                  <Alert variant="destructive">
                    <AlertDescription>{inviteError}</AlertDescription>
                  </Alert>
                )}
                {inviteSuccess && (
                  <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                    <AlertDescription>Invitation sent successfully!</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={closeInvite}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isInviting || !inviteEmail.trim()}>
                    {isInviting ? 'Sending...' : 'Send invitation'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function QuickActionBody({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-indigo-300">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </>
  );
}

/**
 * The header's settings button. There is no team settings page yet, so it opens a menu
 * with the team's pages and (for leads) inviting members.
 */
function TeamMenu({ teamId, isLead, onInvite }: { teamId: string; isLead: boolean; onInvite: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const itemClass =
    'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm text-popover-foreground hover:bg-accent focus-visible:bg-accent focus-visible:outline-none';

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="icon"
        aria-label="Team settings"
        title="Team settings"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="h-9 w-9 text-muted-foreground hover:text-foreground"
      >
        <Settings className="h-5 w-5" />
      </Button>
      {open && (
        <div
          role="menu"
          aria-label="Team settings"
          className="absolute right-0 z-40 mt-2 w-52 rounded-md border border-border bg-popover p-1"
        >
          <Link role="menuitem" href={`/teams/${teamId}/board`} className={itemClass} onClick={() => setOpen(false)}>
            <KanbanSquare className="h-4 w-4 text-muted-foreground" />
            Board
          </Link>
          <Link role="menuitem" href={`/teams/${teamId}/activity`} className={itemClass} onClick={() => setOpen(false)}>
            <Activity className="h-4 w-4 text-muted-foreground" />
            Activity
          </Link>
          {isLead && (
            <button
              role="menuitem"
              type="button"
              className={itemClass}
              onClick={() => {
                setOpen(false);
                onInvite();
              }}
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
              Invite members
            </button>
          )}
        </div>
      )}
    </div>
  );
}
