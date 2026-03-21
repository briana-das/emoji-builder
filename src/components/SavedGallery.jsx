import { Trash2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function formatDate(ts) {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SavedGallery({ savedEmojis, onLoad, onDelete }) {
  if (savedEmojis.length === 0) {
    return (
      <div className="px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
        <FolderOpen className="size-3.5 shrink-0" />
        <span>No saved emojis — hit <strong>Save</strong> in the toolbar to add one.</span>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Saved Library ({savedEmojis.length})
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
        {savedEmojis.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <div className="relative group flex-shrink-0">
                <button
                  onClick={() => onLoad(item.layers)}
                  className="block w-14 h-14 rounded-lg border-2 border-transparent hover:border-primary overflow-hidden bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Load saved emoji from ${formatDate(item.createdAt)}`}
                >
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="saved emoji" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xl flex items-center justify-center h-full">🎨</span>
                  )}
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-destructive-foreground items-center justify-center hidden group-hover:flex transition-all shadow-sm"
                  aria-label="Delete saved emoji"
                >
                  <Trash2 className="size-2.5" />
                </button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              Saved {formatDate(item.createdAt)}
              <br />
              <span className="text-xs opacity-70">Click to reload</span>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
