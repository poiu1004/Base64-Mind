import { useRef, useEffect } from 'react';
import { useSnapMindStore } from '../state/useSnapMindStore';

export function AgentCore() {
  const { agentProfile, openBrainMap } = useSnapMindStore();
  const stage = agentProfile?.formationStage ?? 'empty';
  const longPressRef = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = () => {
    longPressRef.current = setTimeout(() => {
      openBrainMap();
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
    }
  };

  const getSize = () => {
    switch (stage) {
      case 'empty': return 'w-16 h-16 opacity-30';
      case 'seed': return 'w-20 h-20 opacity-50';
      case 'emerging': return 'w-28 h-28 opacity-75';
      case 'personal_worldview': return 'w-36 h-36 opacity-100';
      default: return 'w-16 h-16 opacity-30';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div 
        className={`relative rounded-full bg-blue-400 blur-xl transition-all duration-1000 ease-in-out cursor-pointer ${getSize()} agent-core-pulse agent-core-glow`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => {
          e.preventDefault();
          openBrainMap();
        }}
      />
      <button 
        onClick={openBrainMap}
        className="mt-6 text-xs text-blue-400 opacity-60 hover:opacity-100 transition-opacity uppercase tracking-widest"
      >
        Brain Map
      </button>
    </div>
  );
}