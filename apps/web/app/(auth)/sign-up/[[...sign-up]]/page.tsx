import type { Metadata } from 'next';
import { AuthPage } from '../../auth-page';

export const metadata: Metadata = { title: 'Create account' };

export default function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AuthPage mode="sign-up" searchParams={searchParams} />;
}
