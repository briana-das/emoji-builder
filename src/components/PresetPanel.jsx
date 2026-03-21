import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Single preset card ───────────────────────────────────────────────────────
function PresetCard({ preset, onLoad, onDelete }) {
  return (
    <div className="group relative">
      <button
        onClick={() => onLoad(preset)}
        className={cn(
          'w-full aspect-square rounded-xl border overflow-hidden transition-all',
          'hover:border-primary/40 hover:shadow-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
        title={preset.displayName}
      >
        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
          {preset.thumbnail ? (
            <img
              src={preset.thumbnail}
              alt={preset.displayName}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-xs text-muted-foreground px-2 text-center">{preset.displayName}</span>
          )}
        </div>
      </button>

      {/* Name */}
      {preset.displayName && (
        <p className="mt-1 text-[10px] text-muted-foreground text-center truncate px-1">
          {preset.displayName}
        </p>
      )}

      {/* Delete button (user-saved only) */}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(preset.id); }}
          className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-destructive-foreground items-center justify-center hidden group-hover:flex shadow-sm"
          aria-label="Delete preset"
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </div>
  );
}

// ─── Preset panel ─────────────────────────────────────────────────────────────
export default function PresetPanel({ builtInPresets, savedPresets, onLoadPreset, onDeleteSavedPreset }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-2 space-y-4">

        {/* Built-in presets */}
        <section>
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Built-in
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {builtInPresets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                
                onLoad={onLoadPreset}
              />
            ))}
          </div>
        </section>

        {/* User-saved presets */}
        {savedPresets.length > 0 && (
          <section>
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
              Saved
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {savedPresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  
                  onLoad={onLoadPreset}
                  onDelete={onDeleteSavedPreset}
                />
              ))}
            </div>
          </section>
        )}

        {savedPresets.length === 0 && (
          <p className="text-[11px] text-muted-foreground text-center py-2 px-2">
            Save your compositions as presets using the Save menu.
          </p>
        )}
      </div>
    </div>
  );
}
