import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';

const CANVAS_SIZE = 512;
const HANDLE_RADIUS = 8;
const MIN_SCALE = 0.05;
const MAX_SCALE = 8;

function getCanvasCoords(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_SIZE / rect.width;
  const scaleY = CANVAS_SIZE / rect.height;
  const src = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left) * scaleX,
    y: (src.clientY - rect.top) * scaleY,
  };
}

function layerBounds(layer, img) {
  const w = img.naturalWidth * layer.scale;
  const h = img.naturalHeight * layer.scale;
  return { left: layer.x - w / 2, top: layer.y - h / 2, right: layer.x + w / 2, bottom: layer.y + h / 2, w, h };
}

function cornerHandles(bounds) {
  return [
    { x: bounds.left,  y: bounds.top,    name: 'tl' },
    { x: bounds.right, y: bounds.top,    name: 'tr' },
    { x: bounds.left,  y: bounds.bottom, name: 'bl' },
    { x: bounds.right, y: bounds.bottom, name: 'br' },
  ];
}

const EmojiCanvas = forwardRef(function EmojiCanvas(
  { layers, selectedLayerId, components, onSelectLayer, onUpdateLayer },
  ref
) {
  const canvasRef = useRef(null);
  const [images, setImages] = useState({});
  const imagesRef = useRef({});
  const layersRef = useRef(layers);
  const dragRef = useRef(null);

  // Keep refs in sync
  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { imagesRef.current = images; }, [images]);

  // Expose download / getThumbnail via ref
  useImperativeHandle(ref, () => ({
    download(filename = 'emoji') {
      const off = document.createElement('canvas');
      off.width = CANVAS_SIZE;
      off.height = CANVAS_SIZE;
      const ctx = off.getContext('2d');
      for (const layer of layersRef.current) {
        const img = imagesRef.current[layer.componentId];
        if (!img) continue;
        const w = img.naturalWidth * layer.scale;
        const h = img.naturalHeight * layer.scale;
        ctx.drawImage(img, layer.x - w / 2, layer.y - h / 2, w, h);
      }
      off.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    },
    getThumbnail(size = 64) {
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const ctx = off.getContext('2d');
      const s = size / CANVAS_SIZE;
      for (const layer of layersRef.current) {
        const img = imagesRef.current[layer.componentId];
        if (!img) continue;
        const w = img.naturalWidth * layer.scale * s;
        const h = img.naturalHeight * layer.scale * s;
        ctx.drawImage(img, layer.x * s - w / 2, layer.y * s - h / 2, w, h);
      }
      return off.toDataURL('image/png');
    },
  }));

  // Load images for all components
  useEffect(() => {
    if (!components.length) return;
    const needed = components.filter((c) => !imagesRef.current[c.id]);
    if (!needed.length) return;
    Promise.all(
      needed.map(
        (c) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ id: c.id, img });
            img.onerror = () => resolve({ id: c.id, img: null });
            img.src = `/components/${c.filename}`;
          })
      )
    ).then((results) => {
      setImages((prev) => {
        const next = { ...prev };
        results.forEach(({ id, img }) => { if (img) next[id] = img; });
        return next;
      });
    });
  }, [components]);

  // ─── Draw ─────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw layers
    for (const layer of layers) {
      const img = images[layer.componentId];
      if (!img) continue;
      const { left, top, w, h } = layerBounds(layer, img);
      ctx.drawImage(img, left, top, w, h);
    }

    // Draw selection overlay
    if (selectedLayerId) {
      const layer = layers.find((l) => l.id === selectedLayerId);
      if (layer) {
        const img = images[layer.componentId];
        if (img) {
          const bounds = layerBounds(layer, img);

          // Dashed border
          ctx.save();
          ctx.strokeStyle = 'rgba(124, 58, 237, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 3]);
          ctx.strokeRect(bounds.left, bounds.top, bounds.w, bounds.h);
          ctx.restore();

          // Corner handles
          for (const { x, y } of cornerHandles(bounds)) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, HANDLE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.shadowColor = 'rgba(0,0,0,0.25)';
            ctx.shadowBlur = 4;
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, HANDLE_RADIUS, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(124, 58, 237, 0.9)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }
  }, [layers, selectedLayerId, images]);

  useEffect(() => { draw(); }, [draw]);

  // ─── Hit testing ──────────────────────────────────────────────────────────
  const hitTestHandle = useCallback((x, y) => {
    if (!selectedLayerId) return null;
    const layer = layers.find((l) => l.id === selectedLayerId);
    if (!layer) return null;
    const img = images[layer.componentId];
    if (!img) return null;
    const bounds = layerBounds(layer, img);
    for (const { x: hx, y: hy, name } of cornerHandles(bounds)) {
      if (Math.hypot(x - hx, y - hy) <= HANDLE_RADIUS + 4) return name;
    }
    return null;
  }, [selectedLayerId, layers, images]);

  const hitTestLayer = useCallback((x, y) => {
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const img = images[layer.componentId];
      if (!img) continue;
      const { left, top, right, bottom } = layerBounds(layer, img);
      if (x >= left && x <= right && y >= top && y <= bottom) return layer;
    }
    return null;
  }, [layers, images]);

  // ─── Pointer events ───────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getCanvasCoords(canvas, e);

    const handle = hitTestHandle(x, y);
    if (handle) {
      const layer = layers.find((l) => l.id === selectedLayerId);
      const img = images[layer.componentId];
      dragRef.current = {
        type: 'resize',
        layerId: layer.id,
        startScale: layer.scale,
        centerX: layer.x,
        centerY: layer.y,
        startDist: Math.max(1, Math.hypot(x - layer.x, y - layer.y)),
        // Keep aspect ratio by locking to corner opposite direction
        startImgW: img.naturalWidth,
        startImgH: img.naturalHeight,
      };
      return;
    }

    const hit = hitTestLayer(x, y);
    if (hit) {
      onSelectLayer(hit.id);
      dragRef.current = {
        type: 'move',
        layerId: hit.id,
        offsetX: x - hit.x,
        offsetY: y - hit.y,
      };
    } else {
      onSelectLayer(null);
    }
  }, [hitTestHandle, hitTestLayer, layers, images, selectedLayerId, onSelectLayer]);

  const handlePointerMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(canvasRef.current, e);

    if (d.type === 'move') {
      onUpdateLayer(d.layerId, {
        x: Math.max(0, Math.min(CANVAS_SIZE, x - d.offsetX)),
        y: Math.max(0, Math.min(CANVAS_SIZE, y - d.offsetY)),
      }, false);
    } else if (d.type === 'resize') {
      const dist = Math.max(1, Math.hypot(x - d.centerX, y - d.centerY));
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, d.startScale * (dist / d.startDist)));
      onUpdateLayer(d.layerId, { scale: newScale }, false);
    }
  }, [onUpdateLayer]);

  const handlePointerUp = useCallback(() => {
    if (dragRef.current) {
      onUpdateLayer(dragRef.current.layerId, {}, true); // commit to history
    }
    dragRef.current = null;
  }, [onUpdateLayer]);

  // Keyboard: Delete/Backspace removes selected layer
  useEffect(() => {
    const handler = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerId) {
        // Avoid interfering with text input
        if (document.activeElement?.tagName === 'INPUT') return;
        onUpdateLayer(selectedLayerId, null, true); // null signals delete
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedLayerId, onUpdateLayer]);

  return (
    <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
      {/* Checkerboard background (not exported) */}
      <div className="absolute inset-0 rounded-lg checkerboard" />
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="absolute inset-0 w-full h-full rounded-lg"
        style={{ touchAction: 'none', cursor: dragRef.current ? 'grabbing' : 'default' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
});

export default EmojiCanvas;
