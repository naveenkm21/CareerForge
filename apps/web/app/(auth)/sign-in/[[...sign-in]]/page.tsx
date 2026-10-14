import type { Metadata } from 'next';
import { AuthPage } from '../../auth-page';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AuthPage mode="sign-in" searchParams={searchParams} />;
}
