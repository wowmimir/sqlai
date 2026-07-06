import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button'; // shadcn button

export function ProjectSidebar() {
  return (
    <div className="h-full flex flex-col min-h-0 bg-slate-900/30">
      {/* Fixed Header: + New Project button */}
      <div className="shrink-0 p-4 border-b border-slate-800">
        <Button 
          variant="outline" 
          className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
          disabled // Inert for 4.1
        >
          + New Project
        </Button>
      </div>

      {/* Scrollable Project List — empty state for now */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="text-sm text-slate-500 text-center py-8">
            No projects yet
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}