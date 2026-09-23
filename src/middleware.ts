// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get('host') || req.nextUrl.host || '';

  // Redirección 301 Permanente: Si entra por mundoavend.com -> redirigir a cuadernillos.avend.pe
  if (host.includes('mundoavend.com')) {
    const redirectUrl = new URL(pathname + req.nextUrl.search, 'https://cuadernillos.avend.pe');
    return NextResponse.redirect(redirectUrl, { status: 301 });
  }

  // Evita que Next sirva directamente los archivos conservados en public/uploads.
  // El endpoint protegido valida la sesión antes de leerlos.
  if (pathname.startsWith('/uploads/')) {
    const target = new URL('/api/pdf-stream', req.url);
    target.searchParams.set('url', pathname);
    return NextResponse.redirect(target);
  }

  // 1. Redirección Automática de la Raíz (/) al Catálogo de Cuadernillos si existe Sesión Activa
  if (pathname === '/') {
    const docenteCookie = req.cookies.get('docente_session')?.value;
    const adminCookie = req.cookies.get('admin_auth_session')?.value;

    if (docenteCookie) {
      try {
        const decoded = decodeURIComponent(docenteCookie);
        const session = JSON.parse(decoded);
        if (session && (session.email || session.id)) {
          return NextResponse.redirect(new URL('/cuadernillos', req.url));
        }
      } catch {}
    }

    if (adminCookie) {
      try {
        const decoded = decodeURIComponent(adminCookie);
        const adminSession = JSON.parse(decoded);
        if (adminSession && adminSession.email) {
          return NextResponse.redirect(new URL('/admin', req.url));
        }
      } catch {}
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
