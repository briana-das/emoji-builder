import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function SavePresetModal({ open, onClose, onSave, previewUrl }) {
  const [name, setName] = useState('');

  // Reset name each time modal opens
  useEffect(() => {
    if (open) setName('');
  }, [open]);

  const handleSave = () => {
    onSave(name.trim() || 'My Preset');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Save to library</DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="flex justify-center">
          <div className="w-40 h-40 rounded-xl border overflow-hidden bg-muted/30 checkerboard flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">No layers</span>
            )}
          </div>
        </div>

        {/* Name input */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="My Preset"
          className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Preset name"
          autoFocus
        />

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
