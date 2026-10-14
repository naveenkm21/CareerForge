'use server';

import { revalidatePath } from 'next/cache';
import { updateUserPreferences } from '@careerforge/db';
import { LANGS } from '@careerforge/viz';
import { requireActor } from '@/lib/session';

export async function savePreferencesAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const lang = String(formData.get('editorLang') ?? 'cpp');
  await updateUserPreferences(actor.id, {
    editorLang: (LANGS as readonly string[]).includes(lang) ? lang : 'cpp',
    reducedMotion: formData.get('reducedMotion') === 'on',
  });
  revalidatePath('/settings');
}
