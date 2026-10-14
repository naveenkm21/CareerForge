'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createJobFromText,
  saveResume,
  upsertApplication,
  verifyResumeSkills,
  type ApplicationStatus,
} from '@careerforge/db';
import { requireActor } from '@/lib/session';

const STATUSES: ApplicationStatus[] = ['saved', 'applied', 'oa', 'interview', 'offer', 'rejected'];

export async function analyzeResumeAction(formData: FormData) {
  const actor = await requireActor();
  const text = String(formData.get('text') ?? '').slice(0, 20_000);
  if (text.trim().length < 40) redirect('/career/resume?error=short');
  await saveResume(actor.id, String(formData.get('filename') || 'resume.txt'), text);
  revalidatePath('/career');
  redirect('/career/resume');
}

export async function verifySkillsAction(resumeId: string, formData: FormData) {
  const actor = await requireActor();
  await verifyResumeSkills(actor.id, resumeId, formData.getAll('verified').map(String));
  revalidatePath('/career/resume');
  revalidatePath('/dashboard');
  redirect('/career/resume?verified=1');
}

export async function setApplicationAction(jobId: string, status: string) {
  const actor = await requireActor();
  if (!STATUSES.includes(status as ApplicationStatus)) return;
  await upsertApplication(actor.id, jobId, status as ApplicationStatus);
  revalidatePath('/career/applications');
  revalidatePath(`/career/jobs/${jobId}`);
}

export async function pasteJobAction(formData: FormData) {
  const actor = await requireActor();
  const description = String(formData.get('description') ?? '').slice(0, 20_000);
  if (description.trim().length < 40) redirect('/career/jobs/new?error=short');
  const job = await createJobFromText(actor.id, {
    title: String(formData.get('title') || 'Pasted role').slice(0, 120),
    company: String(formData.get('company') || 'Unknown company').slice(0, 120),
    description,
  });
  redirect(`/career/jobs/${job.id}`);
}
