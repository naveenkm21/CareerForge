import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { loadScoringContext } from '@careerforge/db';
import { SkillGraph, type GraphSkill } from '@/components/skill-graph';
import { SkillTree } from '@/components/skill-tree';
import { loadRoleTree } from '@/lib/role-tree';
import { requireOnboarded } from '@/lib/session';

export const metadata: Metadata = { title: 'Skill graph' };
export const dynamic = 'force-dynamic';

export default async function SkillsPage() {
  const actor = await requireOnboarded();
  const [data, ctx] = await Promise.all([loadRoleTree(actor.id), loadScoringContext(actor.id)]);
  if (!data) redirect('/onboarding');

  // Layer = longest prerequisite chain among the role's skills (deterministic left-to-right order).
  const required = new Map(ctx.reqs.map((r) => [r.skillId, r]));
  const edges: { from: string; to: string }[] = [];
  for (const id of required.keys())
    for (const p of ctx.prereqsOf(id)) if (required.has(p)) edges.push({ from: p, to: id });
  const layer = new Map<string, number>();
  const depth = (id: string, seen = new Set<string>()): number => {
    if (layer.has(id)) return layer.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const ps = ctx.prereqsOf(id).filter((p) => required.has(p));
    const d = ps.length ? 1 + Math.max(...ps.map((p) => depth(p, seen))) : 0;
    layer.set(id, d);
    return d;
  };
  const rows = new Map<number, number>();
  const skills: GraphSkill[] = [...required.values()]
    .map((r) => ({ r, s: ctx.skillById.get(r.skillId)!, d: depth(r.skillId) }))
    .sort((a, b) => a.d - b.d || a.s.slug.localeCompare(b.s.slug))
    .map(({ r, s, d }) => {
      const row = rows.get(d) ?? 0;
      rows.set(d, row + 1);
      const st = ctx.states.get(s.id);
      return {
        id: s.id,
        name: s.name,
        layer: d,
        row,
        mastery: st && st.evidenceCount > 0 ? st.mastery : null,
        target: r.targetMastery,
        tier: r.tier,
      };
    });

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-3xl font-normal tracking-[-0.021em] text-fg sm:text-4xl">
          {data.role.title} skill graph
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-fg-muted">
          Arrows are prerequisites: learn left to right. Colour is your status against the role
          target — green at target, blue close, amber a gap, white not measured. Click any skill to
          see the evidence behind it.
        </p>
      </div>
      <SkillGraph skills={skills} edges={edges} />
      <h2 className="text-lg font-normal text-fg">Navigation tree</h2>
      <p className="-mt-4 max-w-2xl text-sm text-fg-muted">
        The tree is for browsing; prerequisites are a separate graph. <em>Heaps</em> lives under
        data structures but gates Dijkstra.
      </p>
      <SkillTree data={data} detailed />
    </main>
  );
}
