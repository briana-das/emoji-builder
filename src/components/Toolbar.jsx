import { Undo2, Redo2, Download, ChevronDown, BookMarked, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function TipBtn({ label, onClick, disabled, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className="size-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

export default function Toolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onViewLibrary,
  onSavePreset,
  onOpenDownload,
}) {
  return (
    <header className="flex items-center gap-1 px-4 h-12 border-b bg-background shrink-0">
      {/* Brand */}
      <span className="text-sm font-semibold select-none tracking-tight mr-1">
        emojimix
      </span>

      {/* Undo / Redo */}
      <TipBtn label="Undo (⌘Z)" onClick={onUndo} disabled={!canUndo}>
        <Undo2 className="size-4" />
      </TipBtn>
      <TipBtn label="Redo (⌘⇧Z)" onClick={onRedo} disabled={!canRedo}>
        <Redo2 className="size-4" />
      </TipBtn>

      <div className="flex-1" />

      {/* View library */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onViewLibrary}
        className="text-sm font-normal gap-1.5"
      >
        <BookMarked className="size-4" />
        View library
      </Button>

      {/* Save split button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className="bg-foreground text-background hover:bg-foreground/90 text-sm font-medium gap-1"
          >
            <Save className="size-3.5" />
            Save
            <ChevronDown className="size-3.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={onSavePreset} className="gap-2 cursor-pointer">
            <BookMarked className="size-4" />
            Save to library
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenDownload} className="gap-2 cursor-pointer">
            <Download className="size-4" />
            Download image
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
