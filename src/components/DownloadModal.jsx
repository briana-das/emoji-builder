import { useState } from 'react';
import { Download } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function DownloadModal({ open, onClose, onDownload, previewUrl }) {
  const [filename, setFilename] = useState('emoji');

  const handleDownload = () => {
    onDownload(filename.trim() || 'emoji');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Download Image</DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="flex justify-center">
          <div className="w-48 h-48 rounded-lg border overflow-hidden bg-muted/30 checkerboard flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
            ) : (
              <span className="text-sm text-muted-foreground">No layers</span>
            )}
          </div>
        </div>

        {/* Filename */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
            placeholder="emoji"
            className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Filename"
          />
          <span className="text-sm text-muted-foreground shrink-0">.png</span>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleDownload} className="gap-1.5">
            <Download className="size-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
