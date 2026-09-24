import { NextResponse } from 'next/server';
import { clearServerSession, isPanelAccountActive, readServerSession, REGISTRADOR_ROLE } from '@/lib/serverSession';
import { hasAdminRole } from '@/lib/adminPolicy';

export async function GET() {
  const session = readServerSession();

  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  // Una cuenta de panel pausada, eliminada o con otro rol pierde la sesión de inmediato.
  if (!(await isPanelAccountActive(session))) {
    clearServerSession();
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    role: session.role,
    email: session.email,
    isAdmin: hasAdminRole(session.role),
    isRegistrador: session.role === REGISTRADOR_ROLE,
    permissions: session.permissions ?? {},
  });
}
