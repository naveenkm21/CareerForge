import type { ReactNode } from 'react';
import type { Mark, StructureDecl, StructureState } from '@careerforge/viz';
import { ArrayView } from './ArrayView';
import { FlowView } from './FlowView';
import { GraphView } from './GraphView';
import { MatrixView } from './MatrixView';
import { QueueView, StackView } from './StackQueueView';
import { TableView } from './TableView';
import { TreeView } from './TreeView';

/**
 * Renderers are keyed by structure KIND, never by algorithm (ADR-007). A new algorithm reuses
 * these without any UI work.
 */
export function StructureView({
  decl,
  state,
  marks,
}: {
  decl: StructureDecl;
  state: StructureState | undefined;
  marks: Mark[];
}) {
  const label = decl.label ?? decl.id;
  let body: ReactNode = null;
  if (!state) body = <p className="text-xs text-fg-subtle">not initialised</p>;
  else if (decl.kind === 'array' && state.kind === 'array')
    body = <ArrayView id={decl.id} state={state} marks={marks} label={label} />;
  else if (decl.kind === 'matrix' && state.kind === 'matrix')
    body = <MatrixView id={decl.id} state={state} marks={marks} label={label} />;
  else if (decl.kind === 'tree' && state.kind === 'tree')
    body = <TreeView id={decl.id} state={state} marks={marks} label={label} />;
  else if (decl.kind === 'graph' && state.kind === 'graph')
    body = (
      <GraphView
        id={decl.id}
        state={state}
        marks={marks}
        label={label}
        directed={decl.directed}
        weighted={decl.weighted}
        layout={decl.layout}
      />
    );
  else if (decl.kind === 'stack' && state.kind === 'stack')
    body = <StackView id={decl.id} state={state} marks={marks} label={label} />;
  else if (decl.kind === 'queue' && state.kind === 'queue')
    body = <QueueView id={decl.id} state={state} marks={marks} label={label} />;
  else if (decl.kind === 'flow' && state.kind === 'flow')
    body = <FlowView id={decl.id} state={state} marks={marks} label={label} />;
  else if (decl.kind === 'table' && state.kind === 'table')
    body = <TableView id={decl.id} state={state} marks={marks} label={label} />;

  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="text-[12px] text-fg-subtle">{label}</figcaption>
      <div className={decl.kind === 'stack' ? 'pl-9' : undefined}>{body}</div>
    </figure>
  );
}
