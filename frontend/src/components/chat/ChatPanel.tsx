import { useRef, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/lib/store';
import type { ChatMessage } from '@/lib/types';
import { useShallow } from 'zustand/shallow';

export function ChatPanel() {
  const [input, setInput] = useState('');
const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const messages = useWorkspaceStore(useShallow((s) => 
    s.activeProjectId ? s.conversationThreads[s.activeProjectId] ?? [] : []
  ));
  const isQueryLoading = useWorkspaceStore((s) => s.isQueryLoading);
  const dispatchTextPrompt = useWorkspaceStore((s) => s.dispatchTextPrompt);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isQueryLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !activeProjectId || isQueryLoading) return;
    setInput('');
    dispatchTextPrompt(text, activeProjectId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = !activeProjectId || isQueryLoading;

  return (
    <div className="h-full flex flex-col min-h-0 bg-slate-900/20">
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-3">
          {!activeProjectId ? (
            <div className="text-sm text-slate-500 text-center py-16">
              Select a project to start chatting
            </div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-16">
              No messages yet. Ask a question.
            </div>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
          )}
          
          {isQueryLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm px-4 py-2">
              <span className="animate-pulse">•</span>
              <span className="animate-pulse delay-100">•</span>
              <span className="animate-pulse delay-200">•</span>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900/30">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isDisabled ? 'Waiting for response...' : 'Type analytical prompt...'}
            className="flex-1 min-h-[60px] resize-none bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
            disabled={isDisabled}
          />
          <Button
            onClick={handleSend}
            disabled={isDisabled || !input.trim()}
            variant="default"
            className="self-end bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const hydrateGridFromCache = useWorkspaceStore((s) => s.hydrateGridFromCache);
  const isGridLoading = useWorkspaceStore((s) => s.isGridLoading);
  
  const styles = {
    user: 'bg-blue-600/30 border-blue-500/50 text-slate-200 ml-12',
    assistant: 'bg-slate-800/50 border-slate-700 text-slate-200 mr-12',
    error: 'bg-red-900/30 border-red-700/50 text-red-300 mr-12',
  };

  const isRestorable = msg.role === 'assistant' && msg.redis_cache_key;
  
  const handleClick = () => {
    if (isRestorable && !isGridLoading) {
      hydrateGridFromCache(msg.redis_cache_key!);
    }
  };

  return (
    <div 
      className={`border rounded-lg px-4 py-2.5 text-sm ${styles[msg.role]} ${
        isRestorable ? 'cursor-pointer hover:bg-slate-700/30 transition-colors' : ''
      }`}
      onClick={handleClick}
      title={isRestorable ? 'Click to restore this result' : undefined}
    >
      {isRestorable && <span className="mr-2">📊</span>}
      {msg.content}
    </div>
  );
}