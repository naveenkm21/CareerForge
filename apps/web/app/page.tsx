import { redirect } from 'next/navigation';
import { getIdentity } from '@careerforge/auth/server';
import { listAlgorithms } from '@careerforge/viz';
import { LandingPage } from '@/components/landing/landing-page';

export default async function Home() {
  if (await getIdentity().catch(() => null)) redirect('/dashboard');
  return <LandingPage algorithmCount={listAlgorithms().length} />;
}
