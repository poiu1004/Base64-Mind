import { useEffect, useState } from 'react';
import { useSnapMindStore } from '../state/useSnapMindStore';
import { rawItemRepo } from '../db/repositories';
import type { RawItem } from '../domain/types';

export function FeedPreview() {
  const { isProcessing } = useSnapMindStore();
  const [items, setItems] = useState<RawItem[]>([]);

  useEffect(() => {
    const fetchRecent = async () => {
      const all = await rawItemRepo.getAll();
      setItems(all.slice(0, 3));
    };
    fetchRecent();
    
    // Simple polling for MVP since we don't have events
    const interval = setInterval(fetchRecent, 2000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  if (items.length === 0) return null;

  return (
    <div className="flex justify-center gap-2 py-4 fade-in-up overflow-x-auto px-4">
      {items.map(item => (
        <div key={item.id} className="w-16 h-16 rounded-xl bg-secondary/80 border border-border overflow-hidden relative shrink-0 flex items-center justify-center">
          {item.assetType === 'image' && (
            <div className="text-[10px] text-muted-foreground font-mono truncate px-1">IMG</div>
          )}
          {item.assetType === 'text' && (
            <div className="text-[8px] text-muted-foreground p-1 line-clamp-3 leading-tight">{item.textContent}</div>
          )}
          {item.assetType === 'file' && (
            <div className="text-[10px] text-muted-foreground font-mono truncate px-1">FILE</div>
          )}
          
          {item.processingStatus === 'queued' || item.processingStatus === 'processing' ? (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-[2px]">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}