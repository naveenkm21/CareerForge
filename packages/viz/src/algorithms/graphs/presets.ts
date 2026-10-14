import type { Point } from '../../types';
import type { GraphInput } from '../shared';

/** Hand-placed coordinates: stable, readable positions matter more than automatic layout. */
export const TRAVERSAL_LAYOUT: Record<string, Point> = {
  A: { x: 220, y: 40 },
  B: { x: 120, y: 140 },
  C: { x: 320, y: 140 },
  D: { x: 50, y: 250 },
  E: { x: 190, y: 250 },
  F: { x: 350, y: 250 },
  G: { x: 120, y: 350 },
  H: { x: 300, y: 350 },
};

export const TRAVERSAL_GRAPH: GraphInput = {
  nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  edges: [
    { from: 'A', to: 'B' },
    { from: 'A', to: 'C' },
    { from: 'B', to: 'D' },
    { from: 'B', to: 'E' },
    { from: 'C', to: 'F' },
    { from: 'E', to: 'F' },
    { from: 'D', to: 'G' },
    { from: 'E', to: 'G' },
  ],
  source: 'A',
};

export const TRAVERSAL_GRAPH_2: GraphInput = {
  nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  edges: [
    { from: 'A', to: 'C' },
    { from: 'A', to: 'B' },
    { from: 'C', to: 'F' },
    { from: 'F', to: 'H' },
    { from: 'B', to: 'E' },
    { from: 'E', to: 'H' },
    { from: 'D', to: 'G' },
  ],
  source: 'A',
};

export const WEIGHTED_LAYOUT: Record<string, Point> = {
  A: { x: 40, y: 180 },
  B: { x: 170, y: 60 },
  C: { x: 170, y: 300 },
  D: { x: 320, y: 60 },
  E: { x: 320, y: 300 },
  F: { x: 450, y: 180 },
};

export const WEIGHTED_GRAPH: GraphInput = {
  nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
  edges: [
    { from: 'A', to: 'B', weight: 4 },
    { from: 'A', to: 'C', weight: 2 },
    { from: 'B', to: 'C', weight: 1 },
    { from: 'B', to: 'D', weight: 5 },
    { from: 'C', to: 'D', weight: 8 },
    { from: 'C', to: 'E', weight: 10 },
    { from: 'D', to: 'E', weight: 2 },
    { from: 'D', to: 'F', weight: 6 },
    { from: 'E', to: 'F', weight: 2 },
  ],
  source: 'A',
};

export const DAG_LAYOUT: Record<string, Point> = {
  A: { x: 40, y: 80 },
  B: { x: 40, y: 280 },
  C: { x: 190, y: 120 },
  D: { x: 190, y: 300 },
  E: { x: 340, y: 120 },
  F: { x: 470, y: 210 },
};

export const DAG: GraphInput = {
  nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
  edges: [
    { from: 'A', to: 'C' },
    { from: 'B', to: 'C' },
    { from: 'B', to: 'D' },
    { from: 'C', to: 'E' },
    { from: 'D', to: 'F' },
    { from: 'E', to: 'F' },
  ],
  source: 'A',
};
