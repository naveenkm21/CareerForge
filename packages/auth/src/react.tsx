import type { ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, UserButton } from '@clerk/nextjs';
import { authProvider } from './config';

/** Wraps the app in the vendor provider when one is configured. Server component. */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (authProvider() === 'clerk') return <ClerkProvider>{children}</ClerkProvider>;
  return <>{children}</>;
}

/**
 * Vendor sign-in UI, or `fallback` (the app's dev sign-in form) for the dev provider.
 * Keeping the fallback in the app keeps server actions out of this package.
 */
export function SignInPanel({
  mode,
  fallback,
}: {
  mode: 'sign-in' | 'sign-up';
  fallback: ReactNode;
}) {
  if (authProvider() !== 'clerk') return <>{fallback}</>;
  return mode === 'sign-in' ? <SignIn /> : <SignUp />;
}

export function VendorUserButton({ fallback }: { fallback: ReactNode }) {
  if (authProvider() !== 'clerk') return <>{fallback}</>;
  return <UserButton />;
}
