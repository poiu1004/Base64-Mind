import { useEffect, useState } from 'react';
import { useSnapMindStore } from '../state/useSnapMindStore';
import { rawItemRepo } from '../db/repositories';
import type { RawItem } from '../domain/types';

export function FeedPreview() {
  const { isProcessing } = useSnapMindStore();
  const [items, setItems] = useState<RawItem[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const all = await rawItemRepo.getAll();
      setItems(all);
    };
    fetchAll();
    const interval = setInterval(fetchAll, 2000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  if (items.length === 0) return null;

  const displayItems = expanded ? items : items.slice(0, 3);
  const hasMore = items.length > 3;

  return (
    <div className="flex flex-col items-center gap-1 py-3 fade-in-up px-4">
      <div className="flex justify-center gap-2 overflow-x-auto w-full">
        {displayItems.map(item => (
          <div
            key={item.id}
            className="w-16 h-16 rounded-xl bg-secondary/80 border border-border overflow-hidden relative shrink-0 flex items-center justify-center"
          >
            {item.assetType === 'image' && (
              <div className="text-[10px] text-muted-foreground font-mono truncate px-1">IMG</div>
            )}
            {item.assetType === 'text' && (
              <div className="text-[8px] text-muted-foreground p-1 line-clamp-3 leading-tight">
                {item.textContent}
              </div>
            )}
            {(item.assetType === 'file' || item.assetType === 'pdf') && (
              <div className="text-[10px] text-muted-foreground font-mono truncate px-1">FILE</div>
            )}
            {(item.processingStatus === 'queued' || item.processingStatus === 'processing') && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-[2px]">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-0.5"
        >
          {expanded ? '접기' : `+${items.length - 3}개 더 보기`}
        </button>
      )}
      <div className="text-[10px] text-muted-foreground/40 mt-0.5">
        총 {items.length}개 저장됨
      </div>
    </div>
  );
}
