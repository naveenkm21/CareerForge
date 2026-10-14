import type { SkillDomain, SkillEdgeKind, SkillsFile, SkillTreeSeed } from '@careerforge/contracts';

/**
 * Skills are a TREE for navigation (parentSlug) and a DAG for prerequisites (edges).
 * They are different relationships — see ADR-008.
 */
export type FlatSkill = {
  slug: string;
  name: string;
  summary: string;
  icon: string | null;
  domain: SkillDomain;
  parentSlug: string | null;
  depth: number;
  sort: number;
};

export type SkillEdge = {
  from: string;
  to: string;
  kind: SkillEdgeKind;
  strength: number;
};

export type FlatTaxonomy = { skills: FlatSkill[]; edges: SkillEdge[] };

/** Flattens the nested YAML tree into rows. Order is stable: pre-order, file order. */
export function flattenSkills(file: SkillsFile): FlatTaxonomy {
  const skills: FlatSkill[] = [];
  const edges: SkillEdge[] = [];

  const visit = (
    node: SkillTreeSeed,
    domain: SkillDomain,
    parent: string | null,
    depth: number,
    sort: number,
  ) => {
    skills.push({
      slug: node.slug,
      name: node.name,
      summary: node.summary ?? '',
      icon: node.icon ?? null,
      domain,
      parentSlug: parent,
      depth,
      sort,
    });
    for (const req of node.requires ?? [])
      edges.push({ from: req, to: node.slug, kind: 'prereq', strength: 1 });
    for (const r of node.reinforces ?? [])
      edges.push({ from: node.slug, to: r, kind: 'reinforces', strength: 0.5 });
    (node.children ?? []).forEach((child, i) => visit(child, domain, node.slug, depth + 1, i));
  };

  for (const d of file.domains) d.skills.forEach((s, i) => visit(s, d.domain, null, 0, i));
  return { skills, edges };
}

export class TaxonomyError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid skill taxonomy:\n  - ${problems.join('\n  - ')}`);
    this.name = 'TaxonomyError';
  }
}

/** Returns every problem found; empty array means valid. */
export function findTaxonomyProblems({ skills, edges }: FlatTaxonomy): string[] {
  const problems: string[] = [];
  const slugs = new Set<string>();
  for (const s of skills) {
    if (slugs.has(s.slug)) problems.push(`duplicate skill slug "${s.slug}"`);
    slugs.add(s.slug);
  }
  for (const s of skills) {
    if (s.parentSlug) {
      if (!s.slug.startsWith(`${s.parentSlug}.`)) {
        problems.push(`"${s.slug}" must be prefixed by its parent "${s.parentSlug}."`);
      }
    }
  }
  const seenEdges = new Set<string>();
  for (const e of edges) {
    if (!slugs.has(e.from)) problems.push(`edge references unknown skill "${e.from}"`);
    if (!slugs.has(e.to)) problems.push(`edge references unknown skill "${e.to}"`);
    if (e.from === e.to) problems.push(`self-edge on "${e.from}"`);
    const key = `${e.from}|${e.to}|${e.kind}`;
    if (seenEdges.has(key)) problems.push(`duplicate ${e.kind} edge ${e.from} → ${e.to}`);
    seenEdges.add(key);
  }
  const cycle = findPrereqCycle(
    skills.map((s) => s.slug),
    edges.filter((e) => e.kind === 'prereq' && slugs.has(e.from) && slugs.has(e.to)),
  );
  if (cycle) problems.push(`prerequisite cycle: ${cycle.join(' → ')}`);
  return problems;
}

export function assertValidTaxonomy(tax: FlatTaxonomy): void {
  const problems = findTaxonomyProblems(tax);
  if (problems.length) throw new TaxonomyError(problems);
}

/** Returns a cycle as a slug path (first === last) or null if the prereq graph is a DAG. */
export function findPrereqCycle(
  nodes: string[],
  edges: Pick<SkillEdge, 'from' | 'to'>[],
): string[] | null {
  const adj = new Map<string, string[]>(nodes.map((n) => [n, []]));
  for (const e of edges) adj.get(e.from)?.push(e.to);
  const state = new Map<string, 0 | 1 | 2>(); // 0 unvisited, 1 on stack, 2 done
  const stack: string[] = [];

  const dfs = (u: string): string[] | null => {
    state.set(u, 1);
    stack.push(u);
    for (const v of adj.get(u) ?? []) {
      const sv = state.get(v) ?? 0;
      if (sv === 1) return [...stack.slice(stack.indexOf(v)), v];
      if (sv === 0) {
        const found = dfs(v);
        if (found) return found;
      }
    }
    stack.pop();
    state.set(u, 2);
    return null;
  };

  for (const n of nodes) {
    if ((state.get(n) ?? 0) === 0) {
      const found = dfs(n);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Kahn's algorithm with a deterministic tie-break (input order), so the same taxonomy always
 * yields the same learning order. Throws on a cycle.
 */
export function topoOrder(nodes: string[], edges: Pick<SkillEdge, 'from' | 'to'>[]): string[] {
  const index = new Map(nodes.map((n, i) => [n, i]));
  const indeg = new Map(nodes.map((n) => [n, 0]));
  const adj = new Map<string, string[]>(nodes.map((n) => [n, []]));
  for (const e of edges) {
    if (!index.has(e.from) || !index.has(e.to)) continue;
    adj.get(e.from)!.push(e.to);
    indeg.set(e.to, indeg.get(e.to)! + 1);
  }
  const ready = nodes.filter((n) => indeg.get(n) === 0);
  const out: string[] = [];
  while (ready.length) {
    ready.sort((a, b) => index.get(a)! - index.get(b)!);
    const u = ready.shift()!;
    out.push(u);
    for (const v of adj.get(u)!) {
      indeg.set(v, indeg.get(v)! - 1);
      if (indeg.get(v) === 0) ready.push(v);
    }
  }
  if (out.length !== nodes.length) throw new TaxonomyError(['prerequisite graph contains a cycle']);
  return out;
}

/** All transitive prerequisites of `slug`, nearest first. */
export function prerequisitesOf(
  slug: string,
  edges: Pick<SkillEdge, 'from' | 'to' | 'kind'>[],
): string[] {
  const parents = new Map<string, string[]>();
  for (const e of edges) {
    if (e.kind !== 'prereq') continue;
    const list = parents.get(e.to) ?? [];
    list.push(e.from);
    parents.set(e.to, list);
  }
  const out: string[] = [];
  const seen = new Set<string>([slug]);
  const queue = [slug];
  while (queue.length) {
    const u = queue.shift()!;
    for (const p of parents.get(u) ?? []) {
      if (seen.has(p)) continue;
      seen.add(p);
      out.push(p);
      queue.push(p);
    }
  }
  return out;
}
