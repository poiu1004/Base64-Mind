export type BrainNodeViewModel = {
  id: string;
  label: string;
  nodeType: string;
  strength: number;
  confidence: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

export type BrainEdgeViewModel = {
  id: string;
  source: string | BrainNodeViewModel; // d3-force replaces strings with object refs
  target: string | BrainNodeViewModel;
  edgeType: string;
  strength: number;
  confidence: number;
};

export function toNodeViewModels(nodes: any[]): BrainNodeViewModel[] {
  return nodes.map(n => ({
    id: n.id,
    label: n.label,
    nodeType: n.nodeType,
    strength: n.strength,
    confidence: n.confidence,
    x: Math.random() * 10 - 5,
    y: Math.random() * 10 - 5,
    z: Math.random() * 10 - 5,
    vx: 0, vy: 0, vz: 0
  }));
}

export function toEdgeViewModels(edges: any[]): BrainEdgeViewModel[] {
  return edges.map(e => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    edgeType: e.edgeType,
    strength: e.strength,
    confidence: e.confidence
  }));
}

export function resolveBrainNode(nodeRef: string | BrainNodeViewModel, nodes: BrainNodeViewModel[]): BrainNodeViewModel | undefined {
  if (typeof nodeRef === 'string') {
    return nodes.find(n => n.id === nodeRef);
  }
  return nodeRef;
}