import Link from 'next/link';
import { Play } from 'lucide-react';
import { DOMAIN_LABELS, TIER_LABELS, type RoleTreeNode } from '@careerforge/core';
import { Badge, Card, CardBody, CardHeader, CardTitle, Meter } from '@careerforge/ui';
import type { RoleTreeData } from '@/lib/role-tree';

/**
 * The role's skill tree. Every node is "not measured" until evidence exists — the UI never
 * fabricates a number (docs/08 R7). Target mastery is shown as a tick on the meter.
 */
export function SkillTree({ data, detailed = false }: { data: RoleTreeData; detailed?: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      {data.domains.map((d) => (
        <Card key={d.domain}>
          <CardHeader>
            <CardTitle>{DOMAIN_LABELS[d.domain]}</CardTitle>
            <span className="text-xs text-fg-muted">
              {d.measuredCount} of {d.requiredCount} measured
            </span>
          </CardHeader>
          <CardBody className="py-2">
            <ul className="flex flex-col">
              {d.nodes.map((n) => (
                <Node key={n.skill.id} node={n} data={data} detailed={detailed} depth={0} />
              ))}
            </ul>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function Node({
  node,
  data,
  detailed,
  depth,
}: {
  node: RoleTreeNode;
  data: RoleTreeData;
  detailed: boolean;
  depth: number;
}) {
  const req = node.requirement;
  const viz = data.visualizations.get(node.skill.id) ?? [];
  const prereqs = (data.directPrereqs.get(node.skill.id) ?? [])
    .map((id) => data.skillById.get(id)?.name)
    .filter(Boolean);
  const isGroup = node.children.length > 0 && !req;

  return (
    <li>
      <div
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-border/60 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_9rem_6.5rem]"
        style={{ paddingLeft: depth * 18 }}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={isGroup ? 'text-sm font-semibold text-fg' : 'text-sm text-fg'}>
              {node.skill.name}
            </span>
            {req && (
              <Badge tone={req.tier === 'core' ? 'accent' : 'neutral'}>
                {TIER_LABELS[req.tier]}
              </Badge>
            )}
            {viz.map((v) => (
              <Link
                key={v.registryId}
                href={`/viz/${v.registryId}`}
                className="inline-flex items-center gap-1 rounded-full px-1.5 text-[11px] text-accent hover:underline"
              >
                <Play size={10} aria-hidden />
                {v.title}
              </Link>
            ))}
          </div>
          {detailed && (node.skill.summary || prereqs.length > 0) && (
            <p className="mt-0.5 text-xs text-fg-muted">
              {node.skill.summary}
              {prereqs.length > 0 && (
                <span className="text-fg-subtle"> · Requires {prereqs.join(', ')}</span>
              )}
            </p>
          )}
        </div>
        {req ? (
          <>
            <Meter
              value={node.state?.mastery ?? null}
              target={req.targetMastery}
              label={`${node.skill.name} mastery`}
              className="hidden sm:block"
            />
            <span className="text-right text-xs text-fg-subtle">
              {node.state ? `${Math.round(node.state.mastery * 100)}%` : 'not measured'}
            </span>
          </>
        ) : (
          <span className="sm:col-span-2" />
        )}
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((c) => (
            <Node key={c.skill.id} node={c} data={data} detailed={detailed} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
