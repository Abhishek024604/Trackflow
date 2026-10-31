'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-xl font-bold text-primary-600 dark:text-primary-400">
                TrackFlow
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/dashboard" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
                  Dashboard
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700 dark:text-gray-300">{user.name || user.email}</span>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/api/auth/signout">Sign out</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Your Teams
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage your team workspaces and collaborate on issues
            </p>
          </div>
          <Button onClick={() => setShowCreateTeam(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Team
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {teams.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                No teams yet
              </h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Create your first team to start collaborating on issues.
              </p>
              <Button onClick={() => setShowCreateTeam(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card key={team.id} className="group">
                <CardHeader>
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Users className="h-4 w-4" />
                    <span>{team.members.length} member{team.members.length !== 1 ? 's' : ''}</span>
                    {isTeamLead(team) && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded-full">
                        Lead
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {team.members.slice(0, 5).map((member) => (
                      <div
                        key={member.user.id}
                        className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm font-medium border-2 border-white dark:border-gray-900 -ml-1"
                        title={member.user.name || member.user.email}
                      >
                        {member.user.name?.[0]?.toUpperCase() || member.user.email[0].toUpperCase()}
                      </div>
                    ))}
                    {team.members.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 text-sm font-medium border-2 border-white dark:border-gray-900 -ml-1">
                        +{team.members.length - 5}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      href={`/teams/${team.id}`}
                      className="flex items-center justify-between w-full text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    >
                      <span>Open workspace</span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {showCreateTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Create New Team</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="teamName">Team Name</Label>
                    <Input
                      id="teamName"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="e.g., Engineering, Design, Marketing"
                      autoFocus
                    />
                  </div>
                  {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateTeam(false)}>
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