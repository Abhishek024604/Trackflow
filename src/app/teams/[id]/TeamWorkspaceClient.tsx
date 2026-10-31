'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Users, Mail, ChevronLeft, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ActivityFeed } from '@/components/feed/ActivityFeed';

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
}

export default function TeamWorkspaceClient({
  team,
  currentUserId,
  isLead,
  membership,
}: TeamWorkspaceClientProps) {
  const router = useRouter();
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

  const currentUserMember = team.members.find((m) => m.user.id === currentUserId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard">
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{team.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {team.workspaces[0]?.name || 'Workspace'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isLead && (
                <Button onClick={() => setShowInviteModal(true)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Invite Members
                </Button>
              )}
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/teams/${team.id}/settings`}>
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Team Members Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {team.members.map((member) => (
                  <div
                    key={member.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg',
                      member.user.id === currentUserId && 'bg-primary-50 dark:bg-primary-900/30'
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-medium">
                      {member.user.name?.[0]?.toUpperCase() || member.user.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {member.user.name || member.user.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {member.user.email}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded-full',
                        member.role === 'LEAD'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      )}
                    >
                      {member.role}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Team Activity Feed (STORY-003) */}
            <ActivityFeed teamId={team.id} compact pageSize={10} />
            <Link
              href={`/teams/${team.id}/activity`}
              className="block text-center text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              View all activity
            </Link>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Board Columns Overview */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Board Columns
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {team.boardColumns.map((column) => (
                  <div
                    key={column.id}
                    className="flex-shrink-0 w-64"
                    style={{ borderLeft: `4px solid ${column.color}` }}
                  >
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: column.color }}
                        />
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {column.name}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Drag issues here
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Button
                  variant="outline"
                  asChild
                  className="h-auto py-4 text-left"
                >
                  <Link href={`/teams/${team.id}/board`}>
                    <Plus className="mr-2 h-5 w-5" />
                    <div>
                      <p className="font-medium">Create Issue</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Add a new task to the board
                      </p>
                    </div>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="h-auto py-4 text-left"
                >
                  <Link href={`/teams/${team.id}/board`}>
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                      <div>
                        <p className="font-medium">View Board</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          See all issues in Kanban view
                        </p>
                      </div>
                    </div>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invite Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email Address</Label>
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
                  <Alert className="bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <AlertDescription>Invitation sent successfully!</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteError(null);
                      setInviteSuccess(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isInviting || !inviteEmail.trim()}>
                    {isInviting ? 'Sending...' : 'Send Invitation'}
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