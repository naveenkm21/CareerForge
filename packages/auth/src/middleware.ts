import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';
import { authProvider, isPublicPath, SIGN_IN_PATH } from './config';
import { DEV_COOKIE, devAuthSecret, verifyDevSession } from './dev-session';

const clerk = clerkMiddleware(async (auth, req) => {
  if (!isPublicPath(req.nextUrl.pathname)) await auth.protect();
});

async function devMiddleware(req: NextRequest): Promise<NextResponse> {
  if (isPublicPath(req.nextUrl.pathname)) return NextResponse.next();
  const session = await verifyDevSession(req.cookies.get(DEV_COOKIE)?.value, devAuthSecret());
  if (session) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = SIGN_IN_PATH;
  url.search = `?redirect_url=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

/** Route protection for apps/web. Public routes are listed once, in config.ts. */
export function authMiddleware(req: NextRequest, ev: NextFetchEvent) {
  return authProvider() === 'clerk' ? clerk(req, ev) : devMiddleware(req);
}

export const middlewareMatcher = [
  // Skip Next internals and static files unless found in search params.
  '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  '/(api|trpc)(.*)',
];
