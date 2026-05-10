import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSnapMindStore } from '../state/useSnapMindStore';
import { rawItemRepo, blobRepo } from '../db/repositories';
import { processRawItem } from '../processing/pipeline';
import { Camera, Paperclip, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SnapBar() {
  const [text, setText] = useState('');
  const { refreshFromDb } = useSnapMindStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!text.trim()) return;

    const id = uuidv4();
    await rawItemRepo.create({
      id,
      createdAt: new Date().toISOString(),
      assetType: 'text',
      entryPoint: 'snap_bar',
      textContent: text,
      processingStatus: 'queued'
    });

    setText('');
    processRawItem(id).then(() => {
      refreshFromDb();
      toast({ description: "받았어요. 조금씩 형성되고 있어요." });
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const id = uuidv4();
    const blobId = uuidv4();
    
    await blobRepo.save(blobId, file);
    
    await rawItemRepo.create({
      id,
      createdAt: new Date().toISOString(),
      assetType: isImage ? 'image' : 'file',
      entryPoint: 'snap_bar',
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      blobId,
      processingStatus: 'queued'
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';

    processRawItem(id).then(() => {
      refreshFromDb();
      toast({ description: "받았어요. 조금씩 형성되고 있어요." });
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur border-t border-border">
      <div className="max-w-2xl mx-auto flex items-end gap-2 bg-secondary/50 rounded-2xl p-2 border border-border">
        <button 
          onClick={() => imageInputRef.current?.click()}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Camera size={20} />
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Paperclip size={20} />
        </button>
        
        <input 
          type="file" 
          ref={imageInputRef} 
          accept="image/*" 
          className="hidden" 
          onChange={(e) => handleFileUpload(e, true)} 
        />
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={(e) => handleFileUpload(e, false)} 
        />

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="여기에 적어봐..."
          className="flex-1 bg-transparent resize-none outline-none max-h-32 p-2 text-sm placeholder:text-muted-foreground"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        <button 
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 transition-opacity"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}