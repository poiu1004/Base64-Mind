import { useSnapMindStore } from '../state/useSnapMindStore';
import { applyFeedback } from '../domain/scoring';
import { edgeRepo, feedbackRepo } from '../db/repositories';
import { v4 as uuidv4 } from 'uuid';

export function BrainMapInspector() {
  const { 
    isBrainMapOpen, 
    selectedNodeId, 
    selectedEdgeId, 
    nodes, 
    edges,
    brainMapMode,
    setMode,
    refreshFromDb
  } = useSnapMindStore();

  if (!isBrainMapOpen) return null;

  const node = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
  const edge = selectedEdgeId ? edges.find(e => e.id === selectedEdgeId) : null;
  const edgeSource = edge ? nodes.find(n => n.id === edge.sourceNodeId) : null;
  const edgeTarget = edge ? nodes.find(n => n.id === edge.targetNodeId) : null;

  const handleFeedback = async (action: 'weaken' | 'remove') => {
    if (!edge) return;
    
    const newEdge = applyFeedback(edge, action);
    await edgeRepo.upsert(newEdge);
    
    await feedbackRepo.create({
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      targetType: 'edge',
      targetId: edge.id,
      action,
      reason: 'user_feedback'
    });
    
    await refreshFromDb();
  };

  return (
    <div className="absolute right-6 top-20 w-80 bg-background/80 backdrop-blur-md border border-border rounded-2xl p-5 shadow-2xl z-20">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-sm tracking-widest text-muted-foreground uppercase">
          Inspector
        </h3>
        <div className="flex bg-secondary/50 rounded-lg p-1">
          <button 
            className={`px-3 py-1 text-xs rounded-md transition-colors ${brainMapMode === 'view' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setMode('view')}
          >
            View
          </button>
          <button 
            className={`px-3 py-1 text-xs rounded-md transition-colors ${brainMapMode === 'feedback' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setMode('feedback')}
          >
            Feedback
          </button>
        </div>
      </div>

      {!node && !edge && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          노드나 연결선을 선택하세요
        </div>
      )}

      {node && (
        <div className="space-y-4 fade-in-up">
          <div>
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-widest">{node.nodeType}</div>
            <h2 className="text-2xl font-bold tracking-tight">{node.label}</h2>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">형성 강도</span>
              <span className="font-medium text-primary">
                {node.strength > 0.7 ? '강하게 형성됨' : node.strength > 0.4 ? '보통' : '아직 약한 신호'}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">반복 등장</span>
              <span className="font-medium text-foreground">
                {node.sourceCardIds.length > 2 ? '여러 저장물에서 반복 등장' : '단일 저장물에서 발견'}
              </span>
            </div>
          </div>
        </div>
      )}

      {edge && edgeSource && edgeTarget && (
        <div className="space-y-4 fade-in-up">
          <div>
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-widest">{edge.edgeType}</div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-primary truncate">{edgeSource.label}</span>
              <span className="text-muted-foreground shrink-0">↔</span>
              <span className="text-primary truncate">{edgeTarget.label}</span>
            </h2>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">연결 강도</span>
              <span className="font-medium">
                {edge.strength > 0.5 ? '강한 연결' : '약한 연결'}
              </span>
            </div>
          </div>

          {brainMapMode === 'feedback' && (
            <div className="pt-4 space-y-2">
              <button 
                onClick={() => handleFeedback('weaken')}
                className="w-full py-2 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-colors"
              >
                이 연결 약하게 하기
              </button>
              <button 
                onClick={() => handleFeedback('remove')}
                className="w-full py-2 px-4 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive-foreground text-sm font-medium transition-colors border border-destructive/20"
              >
                이 연결 끊기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}