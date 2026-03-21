import { useState } from 'react';
import { Download, Plus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const CANVAS_SIZE = 512;

function renderAndDownload(preset, allComponents) {
  const comps = preset.componentIds
    .map((id) => allComponents.find((c) => c.id === id))
    .filter(Boolean);
  if (comps.length === 0) return;

  const off = document.createElement('canvas');
  off.width = CANVAS_SIZE;
  off.height = CANVAS_SIZE;
  const ctx = off.getContext('2d');

  let pending = comps.length;
  const images = {};

  const drawAndSave = () => {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    comps.forEach((comp) => {
      const img = images[comp.id];
      if (!img) return;
      const snap = comp.snapDefault;
      const native = comp.nativeSize ?? 128;
      const scale = snap.width / native;
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, snap.x - w / 2, snap.y - h / 2, w, h);
    });
    off.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${preset.displayName.toLowerCase().replace(/\s+/g, '-')}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  comps.forEach((comp) => {
    const img = new Image();
    img.onload = () => { images[comp.id] = img; pending--; if (pending === 0) drawAndSave(); };
    img.onerror = () => { pending--; if (pending === 0) drawAndSave(); };
    img.src = `/components/${comp.filename}`;
  });
}

function PresetCard({ preset, allComponents, onLoad, onDelete }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative aspect-square rounded-xl border overflow-hidden bg-muted/30 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {preset.thumbnail ? (
        <img src={preset.thumbnail} alt={preset.displayName} className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs text-muted-foreground px-2 text-center">{preset.displayName}</span>
        </div>
      )}

      {/* Name bar */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
        <p className="text-[11px] text-white truncate">{preset.displayName}</p>
      </div>

      {/* Hover actions */}
      {hovered && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
          <button
            onClick={onLoad}
            className="size-10 rounded-full bg-white text-foreground flex items-center justify-center hover:bg-primary hover:text-white transition-colors shadow-md"
            aria-label="Load preset"
            title="Add to canvas"
          >
            <Plus className="size-4" />
          </button>
          <button
            onClick={() => renderAndDownload(preset, allComponents)}
            className="size-10 rounded-full bg-white text-foreground flex items-center justify-center hover:bg-primary hover:text-white transition-colors shadow-md"
            aria-label="Download emoji"
            title="Download"
          >
            <Download className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function LibraryModal({ open, onClose, savedPresets, allComponents, onLoadPreset }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl w-full max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>My Library</DialogTitle>
        </DialogHeader>

        {savedPresets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">
            No saved presets yet. Use Save → Save to library to save your compositions.
          </p>
        ) : (
          <div className="overflow-y-auto flex-1">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-1">
              {savedPresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  allComponents={allComponents}
                  onLoad={() => { onLoadPreset(preset); onClose(); }}
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
