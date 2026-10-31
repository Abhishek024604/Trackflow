'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from '@/components/AppHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date | string;
  owner: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  members: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }>;
  workspaces: Array<{ id: string; name: string }>;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface DashboardClientProps {
  teams: Team[];
  user: User;
}

export default function DashboardClient({ teams, user }: DashboardClientProps) {
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to create team');
        return;
      }

      // Redirect to the new team's workspace
      window.location.href = `/teams/${result.team.id}`;
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const isTeamLead = (team: Team) => team.ownerId === user.id;

  useEffect(() => {
    if (!showCreateTeam) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCreateTeam(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCreateTeam]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader>
        <span className="hidden text-sm text-muted-foreground sm:inline">{user.name || user.email}</span>
      </AppHeader>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your teams</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your team workspaces and collaborate on issues
            </p>
          </div>
          <Button onClick={() => setShowCreateTeam(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Team
          </Button>
        </div>

        {error && !showCreateTeam && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {teams.length === 0 ? (
          <Card className="py-12 text-center">
            <CardContent>
              <Users className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">No teams yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first team to start collaborating on issues.
              </p>
              <Button onClick={() => setShowCreateTeam(true)} className="mt-6">
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="group flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-input hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="truncate text-base font-semibold text-foreground">{team.name}</h2>
                  {isTeamLead(team) && (
                    <span className="shrink-0 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-xs font-medium text-indigo-300">
                      Lead
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="mt-4 flex items-center pl-1">
                  {team.members.slice(0, 5).map((member) => (
                    <div
                      key={member.user.id}
                      className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-indigo-500/25 text-xs font-semibold text-indigo-200"
                      title={member.user.name || member.user.email}
                    >
                      {member.user.name?.[0]?.toUpperCase() || member.user.email[0].toUpperCase()}
                    </div>
                  ))}
                  {team.members.length > 5 && (
                    <div className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium text-muted-foreground">
                      +{team.members.length - 5}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm font-medium text-indigo-300 group-hover:text-indigo-200">
                  <span>Open workspace</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {showCreateTeam && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowCreateTeam(false);
            }}
          >
            <Card role="dialog" aria-modal="true" aria-labelledby="create-team-title" className="w-full max-w-md bg-popover">
              <CardHeader>
                <CardTitle id="create-team-title">Create a team</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="teamName">Team name</Label>
                    <Input
                      id="teamName"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="e.g., Engineering, Design, Marketing"
                      autoFocus
                    />
                  </div>
                  {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setShowCreateTeam(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating || !newTeamName.trim()}>
                      {isCreating ? 'Creating...' : 'Create Team'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
