import type { Metadata } from 'next';
import { getUserSettings } from '@careerforge/db';
import { LANG_LABELS, LANGS } from '@careerforge/viz';
import { Button, Card, CardBody, CardHeader, CardTitle } from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';
import { savePreferencesAction } from './actions';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const actor = await requireOnboarded();
  const settings = await getUserSettings(actor.id);
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-normal tracking-[-0.021em] text-fg sm:text-4xl">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Learning preferences</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={savePreferencesAction} className="flex flex-col gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-fg">Default code language</span>
              <select
                name="editorLang"
                defaultValue={settings?.editorLang ?? 'cpp'}
                className="h-10 w-48 rounded-md border border-border bg-surface px-2 text-sm text-fg"
              >
                {LANGS.map((l) => (
                  <option key={l} value={l}>
                    {LANG_LABELS[l]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="reducedMotion"
                defaultChecked={settings?.reducedMotion ?? false}
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                <span className="block text-sm font-medium text-fg">Reduce motion</span>
                <span className="block text-sm text-fg-muted">
                  Visualizations change state instantly instead of animating. Your system setting is
                  always respected too.
                </span>
              </span>
            </label>
            <div>
              <Button type="submit" size="sm">
                Save
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
