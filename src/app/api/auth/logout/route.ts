import { NextResponse } from 'next/server';
import { clearServerSession } from '@/lib/serverSession';

export async function POST() {
  clearServerSession();
  return NextResponse.json({ success: true });
}
