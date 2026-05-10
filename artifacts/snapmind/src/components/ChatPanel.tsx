import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSnapMindStore } from '../state/useSnapMindStore';
import { chatRepo, profileRepo, cardRepo, nodeRepo, edgeRepo, feedbackRepo } from '../db/repositories';
import { getAdapter } from '../ai/agentAdapter';
import { Send } from 'lucide-react';

export function ChatPanel() {
  const [text, setText] = useState('');
  const { messages, refreshFromDb } = useSnapMindStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshFromDb();
  }, [refreshFromDb]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;

    const userMsgText = text.trim();
    setText('');

    const userMsg = {
      id: uuidv4(),
      role: 'user' as const,
      content: userMsgText,
      createdAt: new Date().toISOString()
    };
    await chatRepo.create(userMsg);
    await refreshFromDb();

    // Load fresh data for adapter
    const profile = await profileRepo.get() || { id: "local-agent", formationStage: "empty", dominantSignals: [], summaryForAgent: "", itemCount: 0, cardCount: 0, feedbackCount: 0 };
    const cards = await cardRepo.getAll();
    const nodes = await nodeRepo.getAll();
    const edges = await edgeRepo.getAll();
    const feedback = await feedbackRepo.getAll();

    const replyText = await getAdapter().generateReply(userMsgText, profile as any, cards, nodes, edges, feedback);

    const agentMsg = {
      id: uuidv4(),
      role: 'agent' as const,
      content: replyText,
      createdAt: new Date().toISOString()
    };
    await chatRepo.create(agentMsg);
    await refreshFromDb();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative max-w-2xl mx-auto w-full px-4 mb-24">
      <div className="flex-1 overflow-y-auto space-y-4 py-4 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground mt-10">
            <p>안녕해. 뭔가 저장하면 내가 형성돼. 지금 바로 넣어봐.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} message-appear`}>
              <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                m.role === 'user' 
                  ? 'bg-primary/20 text-foreground rounded-br-none border border-primary/30' 
                  : 'bg-secondary text-secondary-foreground rounded-bl-none border border-border'
              }`}>
                {m.content}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-1">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      
      <div className="relative mt-2">
        <input 
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="에이전트에게 말 걸기..."
          className="w-full bg-secondary border border-border rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button 
          onClick={handleSend}
          disabled={!text.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:text-primary-foreground hover:bg-primary rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-primary"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}