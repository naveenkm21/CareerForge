/**
 * The auth vendor is behind this facade so it stays swappable (docs/02 §3.1). Apps import
 * from @careerforge/auth/*, never from @clerk/* directly.
 *
 * Provider selection uses NEXT_PUBLIC_* variables so the server, the edge middleware, and the
 * browser bundle always agree.
 */
export type AuthProviderName = 'clerk' | 'dev';

export function authProvider(): AuthProviderName {
  const explicit = process.env.NEXT_PUBLIC_AUTH_PROVIDER;
  if (explicit === 'clerk' || explicit === 'dev') return explicit;
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'clerk' : 'dev';
}

export type Identity = {
  provider: AuthProviderName;
  subject: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

/** Routes reachable without signing in. Everything else is protected by the middleware. */
export const PUBLIC_ROUTE_PATTERNS: RegExp[] = [
  /^\/$/,
  /^\/viz(\/.*)?$/,
  /^\/sign-in(\/.*)?$/,
  /^\/sign-up(\/.*)?$/,
  /^\/api\/health$/,
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_ROUTE_PATTERNS.some((re) => re.test(pathname));
}

export const SIGN_IN_PATH = '/sign-in';
export const AFTER_SIGN_IN_PATH = '/dashboard';
