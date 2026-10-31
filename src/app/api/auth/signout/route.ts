import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST() {
  const session = await auth();
  
  if (session) {
    // Sign out using Auth.js
    const { signOut } = await import('next-auth/react');
    await signOut({ redirect: false });
  }

  return NextResponse.json({ success: true });
}