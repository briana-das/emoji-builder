import { useState, useRef } from 'react';
import { Trash2, GripVertical, ChevronUp, ChevronDown, ChevronRight, AlignCenterHorizontal, AlignCenterVertical, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ─── Individual layer row ─────────────────────────────────────────────────────
function LayerRow({
  layer,
  component,
  isSelected,
  isFirst,
  isLast,
  onSelect,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAlignH,
  onAlignV,
  onSnapToDefault,
  dragHandleProps,
  isDragging,
  isDropTarget,
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-md cursor-pointer transition-colors',
        'border border-transparent',
        isSelected && 'bg-primary/10 border-primary/30',
        !isSelected && 'hover:bg-muted/60',
        isDragging && 'opacity-40',
        isDropTarget && 'border-primary border-dashed'
      )}
      onClick={() => onSelect(layer.id)}
    >
    {/* Main row */}
    <div className="flex items-center gap-2 px-2 py-1.5">
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="size-4" />
      </div>

      {/* Thumbnail */}
      <div className="w-8 h-8 rounded border bg-muted/50 shrink-0 overflow-hidden flex items-center justify-center">
        {component ? (
          <img
            src={`/components/${component.filename}`}
            alt={component.displayName}
            className="w-7 h-7 object-contain"
            draggable={false}
          />
        ) : (
          <span className="text-xs text-muted-foreground">?</span>
        )}
      </div>

      {/* Name */}
      <span className="flex-1 text-xs truncate min-w-0">
        {component?.displayName ?? layer.componentId}
      </span>

      {/* Up/down arrows — mobile fallback */}
      <div className="flex flex-col gap-0.5 md:hidden shrink-0" onClick={(e) => e.stopPropagation()}>
        <button disabled={isFirst} onClick={onMoveUp} className="disabled:opacity-30 hover:text-primary" aria-label="Move layer up">
          <ChevronUp className="size-3" />
        </button>
        <button disabled={isLast} onClick={onMoveDown} className="disabled:opacity-30 hover:text-primary" aria-label="Move layer down">
          <ChevronDown className="size-3" />
        </button>
      </div>

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon"
        className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onRemove(layer.id); }}
        aria-label="Remove layer"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>

    {/* Alignment sub-row — only visible when selected */}
    {isSelected && (
      <div
        className="flex items-center gap-1 px-2 pb-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] text-muted-foreground mr-0.5">Align</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
              onClick={() => onAlignH()}
              aria-label="Center horizontally"
            >
              <AlignCenterVertical className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Center horizontally</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
              onClick={() => onAlignV()}
              aria-label="Center vertically"
            >
              <AlignCenterHorizontal className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Center vertically</TooltipContent>
        </Tooltip>
        {(() => {
          if (!component?.snapDefault) return null;
          const defaultScale = component.snapDefault.width / (component.nativeSize ?? 128);
          const movedFromDefault =
            Math.abs(layer.x - component.snapDefault.x) > 1 ||
            Math.abs(layer.y - component.snapDefault.y) > 1 ||
            Math.abs(layer.scale - defaultScale) > 0.01;
          if (!movedFromDefault) return null;
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-foreground"
                  onClick={() => onSnapToDefault()}
                  aria-label="Snap to default position"
                >
                  <LocateFixed className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Snap to default</TooltipContent>
            </Tooltip>
          );
        })()}
      </div>
    )}
    </div>
  );
}

// ─── Layer panel ─────────────────────────────────────────────────────────────
export default function LayerPanel({
  layers,
  components,
  selectedLayerId,
  onSelectLayer,
  onRemoveLayer,
  onReorderLayers,
  onClearAll,
  onAlignH,
  onAlignV,
  onSnapToDefault,
  isCollapsed,
  onToggleCollapse,
}) {
  const [dragIdx, setDragIdx] = useState(null);
  const [dropIdx, setDropIdx] = useState(null);
  const dragNodeRef = useRef(null);

  // Display top-layer first
  const displayLayers = [...layers].reverse();
  const compMap = Object.fromEntries(components.map((c) => [c.id, c]));

  // ── Drag-and-drop handlers ─────────────────────────────────────────────────
  const handleDragStart = (di) => (e) => {
    e.dataTransfer.effectAllowed = 'move';
    dragNodeRef.current = di;
    setDragIdx(di);
  };

  const handleDragOver = (di) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (di !== dragIdx) setDropIdx(di);
  };

  const handleDrop = (di) => (e) => {
    e.preventDefault();
    const from = dragIdx;
    if (from === null || from === di) return;
    const reversed = [...layers].reverse();
    const [item] = reversed.splice(from, 1);
    reversed.splice(di, 0, item);
    onReorderLayers(reversed.reverse());
    setDragIdx(null);
    setDropIdx(null);
  };

  const handleDragEnd = () => { setDragIdx(null); setDropIdx(null); };

  // ── Up/down helpers ────────────────────────────────────────────────────────
  const moveUp = (di) => {
    if (di === 0) return;
    const r = [...layers].reverse();
    [r[di - 1], r[di]] = [r[di], r[di - 1]];
    onReorderLayers(r.reverse());
  };

  const moveDown = (di) => {
    if (di === displayLayers.length - 1) return;
    const r = [...layers].reverse();
    [r[di], r[di + 1]] = [r[di + 1], r[di]];
    onReorderLayers(r.reverse());
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold shrink-0">
            Layers
            {layers.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                ({layers.length})
              </span>
            )}
          </h2>
          {layers.length > 0 && onClearAll && (
            <button
              onClick={onClearAll}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors shrink-0"
              aria-label="Clear all layers"
            >
              Clear all
            </button>
          )}
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand layers' : 'Collapse layers'}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ChevronRight
              className={cn(
                'size-4 transition-transform duration-200',
                isCollapsed && 'rotate-180'
              )}
            />
          </button>
        )}
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {displayLayers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-10 px-2">
            Add a component to start building.
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {displayLayers.map((layer, di) => (
              <div
                key={layer.id}
                draggable
                onDragStart={handleDragStart(di)}
                onDragOver={handleDragOver(di)}
                onDrop={handleDrop(di)}
                onDragEnd={handleDragEnd}
              >
                <LayerRow
                  layer={layer}
                  component={compMap[layer.componentId]}
                  isSelected={selectedLayerId === layer.id}
                  isFirst={di === 0}
                  isLast={di === displayLayers.length - 1}
                  onSelect={onSelectLayer}
                  onRemove={onRemoveLayer}
                  onMoveUp={() => moveUp(di)}
                  onMoveDown={() => moveDown(di)}
                  onAlignH={onAlignH}
                  onAlignV={onAlignV}
                  onSnapToDefault={onSnapToDefault}
                  dragHandleProps={{}}
                  isDragging={dragIdx === di}
                  isDropTarget={dropIdx === di && dragIdx !== di}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
