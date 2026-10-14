'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export type GraphSkill = {
  id: string;
  name: string;
  layer: number;
  row: number;
  mastery: number | null;
  target: number;
  tier: string;
};

const W = 170;
const H = 52;

function tone(s: GraphSkill) {
  if (s.mastery === null)
    return { bg: 'var(--surface)', border: 'var(--border-strong)', text: 'not measured' };
  if (s.mastery >= s.target)
    return { bg: 'var(--tone-found-soft)', border: 'var(--tone-found)', text: 'at target' };
  if (s.mastery >= s.target * 0.7)
    return { bg: 'var(--tone-candidate-soft)', border: 'var(--tone-candidate)', text: 'close' };
  return { bg: 'var(--tone-active-soft)', border: 'var(--tone-active)', text: 'gap' };
}

/**
 * The role's skills laid out by prerequisite depth (React Flow for the roadmap — ADR-012).
 * Left to right is "learn this first". Colour = status against the role target.
 */
export function SkillGraph({
  skills,
  edges,
}: {
  skills: GraphSkill[];
  edges: { from: string; to: string }[];
}) {
  const router = useRouter();
  const { nodes, flowEdges } = useMemo(() => {
    const nodes: Node[] = skills.map((s) => {
      const t = tone(s);
      return {
        id: s.id,
        position: { x: s.layer * (W + 70), y: s.row * (H + 22) },
        data: {
          label: (
            <div className="flex flex-col items-start gap-0.5 text-left">
              <span className="text-[12px] leading-tight font-semibold text-fg">{s.name}</span>
              <span className="text-[10px] text-fg-muted">
                {s.mastery === null ? t.text : `${Math.round(s.mastery * 100)}% · ${t.text}`}
              </span>
            </div>
          ),
        },
        style: {
          width: W,
          height: H,
          background: t.bg,
          border: `1.5px solid ${t.border}`,
          borderRadius: 10,
          padding: '6px 10px',
          cursor: 'pointer',
        },
        sourcePosition: 'right' as Node['sourcePosition'],
        targetPosition: 'left' as Node['targetPosition'],
      };
    });
    const flowEdges: Edge[] = edges.map((e) => ({
      id: `${e.from}-${e.to}`,
      source: e.from,
      target: e.to,
      style: { stroke: 'var(--border-strong)', strokeWidth: 1.25 },
    }));
    return { nodes, flowEdges };
  }, [skills, edges]);

  return (
    <div
      className="h-[34rem] overflow-hidden rounded-[var(--radius)] border border-border bg-surface"
      aria-label="Skill prerequisite graph"
    >
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        fitView
        minZoom={0.3}
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_, n) => router.push(`/explain/skill/${n.id}`)}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border)" gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
