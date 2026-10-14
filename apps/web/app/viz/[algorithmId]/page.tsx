import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getUserSettings } from '@careerforge/db';
import { getAlgorithmMeta, LANGS, type Lang } from '@careerforge/viz';
import { EvidencePlayer } from '@/components/evidence-player';
import { getFlags } from '@/lib/flags';
import { getActor } from '@/lib/session';

type Params = Promise<{ algorithmId: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const meta = getAlgorithmMeta((await params).algorithmId);
  return meta ? { title: `${meta.title} — visualized`, description: meta.summary } : {};
}

function parseInput(raw: string | string[] | undefined): unknown {
  if (typeof raw !== 'string' || raw.length > 4000) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Public, deep-linkable: /viz/binary-search?input={"arr":[…],"target":23}&step=4&lang=python.
 * The trace is computed in the browser from packages/viz — no database, no stored frames.
 */
export default async function VizPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { algorithmId } = await params;
  const meta = getAlgorithmMeta(algorithmId);
  if (!meta) notFound();
  const sp = await searchParams;

  const actor = await getActor().catch(() => null);
  const [flags, settings] = await Promise.all([
    getFlags(actor?.id ?? null),
    actor ? getUserSettings(actor.id).catch(() => undefined) : undefined,
  ]);
  const langParam =
    typeof sp.lang === 'string' && (LANGS as readonly string[]).includes(sp.lang)
      ? (sp.lang as Lang)
      : undefined;
  const preferred =
    settings && (LANGS as readonly string[]).includes(settings.editorLang)
      ? (settings.editorLang as Lang)
      : 'cpp';
  const step = Number.parseInt(typeof sp.step === 'string' ? sp.step : '0', 10);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/viz"
          className="inline-flex w-fit items-center gap-1 text-xs text-fg-muted hover:text-fg"
        >
          <ChevronLeft size={13} aria-hidden /> All algorithms
        </Link>
        <h1 className="text-3xl font-normal tracking-[-0.021em] text-fg sm:text-4xl">
          {meta.title}
        </h1>
        <p className="max-w-3xl text-sm text-fg-muted">{meta.summary}</p>
      </div>
      <EvidencePlayer
        signedIn={actor !== null}
        algorithmId={meta.id}
        initialInput={parseInput(sp.input)}
        initialStep={Number.isFinite(step) ? step : 0}
        initialLang={langParam ?? preferred}
        syncUrl
        practiceAvailable={flags['viz.practice-mode'] ?? true}
        reducedMotion={settings?.reducedMotion ?? false}
      />
    </main>
  );
}
