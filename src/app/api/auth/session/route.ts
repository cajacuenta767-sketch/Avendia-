import { NextResponse } from 'next/server';
import { readServerSession, REGISTRADOR_ROLE } from '@/lib/serverSession';

const ADMIN_ROLES = new Set(['ADMIN', 'ADMINISTRADOR', 'SUPERADMINISTRADOR', 'GESTOR_LICENCIAS']);

export async function GET() {
  const session = readServerSession();

  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    role: session.role,
    email: session.email,
    isAdmin: ADMIN_ROLES.has(session.role),
    isRegistrador: session.role === REGISTRADOR_ROLE,
    permissions: session.permissions ?? {},
  });
}
