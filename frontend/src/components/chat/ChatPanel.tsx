import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function ChatPanel() {
  return (
    <div className="h-full flex flex-col min-h-0 bg-slate-900/20">
      {/* Scrollable Messages Area */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="text-sm text-slate-500 text-center py-16">
            Ask a question about your data
          </div>
        </div>
      </ScrollArea>

      {/* Fixed Prompt Input Box — shrink-0 */}
      <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900/30">
        <div className="flex gap-2">
          <Textarea 
            placeholder="Type analytical prompt..." 
            className="flex-1 min-h-[60px] resize-none bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
            disabled // Inert for 4.1
          />
          <Button 
            variant="default" 
            className="self-end bg-blue-600 hover:bg-blue-700"
            disabled // Inert for 4.1
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}