'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { recomputeUser, saveProblem } from '@careerforge/db';
import { judge } from '@careerforge/judge';
import { requireAdmin } from '@/lib/session';

export type EditorState = { error: string | null; verify: string | null };

function parseCases(formData: FormData) {
  const inputs = formData.getAll('tc_input').map(String);
  const expected = formData.getAll('tc_expected').map(String);
  const samples = new Set(formData.getAll('tc_sample').map(String));
  return inputs
    .map((input, i) => ({
      input: input.replace(/\r\n/g, '\n'),
      expected: (expected[i] ?? '').replace(/\r\n/g, '\n'),
      isSample: samples.has(String(i)),
    }))
    .filter((c) => c.input.trim() || c.expected.trim());
}

/** Save (create or new version) a problem. "Verify" first runs the reference C++ through the judge. */
export async function saveProblemAction(
  _prev: EditorState,
  formData: FormData,
): Promise<EditorState> {
  const actor = await requireAdmin();
  const slug = String(formData.get('slug') ?? '')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,60}$/.test(slug))
    return { error: 'Slug: 3–60 lowercase letters, digits or dashes.', verify: null };
  const testcases = parseCases(formData);
  if (testcases.length === 0) return { error: 'Add at least one testcase.', verify: null };
  const referenceCpp = String(formData.get('reference') ?? '');
  const intent = String(formData.get('intent') ?? 'save');

  if (intent === 'verify') {
    if (!referenceCpp.trim())
      return { error: 'Add a reference C++ solution to verify against.', verify: null };
    const r = await judge({
      lang: 'cpp',
      code: referenceCpp,
      cases: testcases.map((t, i) => ({ id: String(i), ...t })),
      timeLimitMs: 2000,
    });
    if (r.status === 'error') return { error: r.message ?? 'Judge unavailable.', verify: null };
    return {
      error: null,
      verify:
        r.status === 'ac'
          ? `Reference passes all ${r.total} testcases.`
          : `Reference fails: ${r.status.toUpperCase()} on case ${r.passed + 1}/${r.total}. Fix the expected output or the solution.`,
    };
  }

  await saveProblem(actor.id, {
    slug,
    title: String(formData.get('title') ?? '').trim() || slug,
    skillId: String(formData.get('skillId') ?? ''),
    difficulty: Math.min(5, Math.max(1, Number(formData.get('difficulty') ?? 2))),
    statement: String(formData.get('statement') ?? ''),
    inputFormat: String(formData.get('inputFormat') ?? ''),
    outputFormat: String(formData.get('outputFormat') ?? ''),
    constraints: String(formData.get('constraints') ?? ''),
    status: formData.get('status') === 'published' ? 'published' : 'draft',
    testcases,
    referenceCpp,
  });
  revalidatePath('/admin/problems');
  revalidatePath('/practice');
  redirect(`/admin/problems?saved=${slug}`);
}

export async function recomputeMeAction() {
  const actor = await requireAdmin();
  await recomputeUser(actor.id);
  revalidatePath('/admin');
  revalidatePath('/dashboard');
}
