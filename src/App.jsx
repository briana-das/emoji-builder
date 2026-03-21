import { useReducer, useEffect, useRef, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import Toolbar from '@/components/Toolbar';
import CategorySidebar from '@/components/CategorySidebar';
import ComponentPicker from '@/components/ComponentPicker';
import EmojiCanvas from '@/components/EmojiCanvas';
import LayerPanel from '@/components/LayerPanel';
import PresetPanel from '@/components/PresetPanel';
import LibraryModal from '@/components/LibraryModal';
import SavePresetModal from '@/components/SavePresetModal';
import { cn } from '@/lib/utils';

// ─── Unique ID helper ──────────────────────────────────────────────────────────
let _uid = 0;
const uid = () => `layer-${Date.now()}-${_uid++}`;

// ─── Reducer ───────────────────────────────────────────────────────────────────
const MAX_HISTORY = 20;

function pushHistory(state, newLayers) {
  const trimmed = state.history.slice(0, state.historyIndex + 1);
  const next = [...trimmed, newLayers];
  const capped = next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
  return { history: capped, historyIndex: capped.length - 1 };
}

const initialState = {
  layers: [],
  selectedLayerId: null,
  freeMode: false,
  history: [[]],
  historyIndex: 0,
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_LAYER': {
      const newLayers = [...state.layers, action.layer];
      return { ...state, layers: newLayers, selectedLayerId: action.layer.id, ...pushHistory(state, newLayers) };
    }
    case 'APPEND_LAYERS': {
      const newLayers = [...state.layers, ...action.layers];
      return { ...state, layers: newLayers, selectedLayerId: null, ...pushHistory(state, newLayers) };
    }
    case 'UPDATE_LAYER': {
      if (action.updates === null) {
        const newLayers = state.layers.filter((l) => l.id !== action.layerId);
        return {
          ...state,
          layers: newLayers,
          selectedLayerId: state.selectedLayerId === action.layerId ? null : state.selectedLayerId,
          ...(action.commit ? pushHistory(state, newLayers) : {}),
        };
      }
      const newLayers = state.layers.map((l) =>
        l.id === action.layerId ? { ...l, ...action.updates } : l
      );
      return { ...state, layers: newLayers, ...(action.commit ? pushHistory(state, newLayers) : {}) };
    }
    case 'REMOVE_LAYER': {
      const newLayers = state.layers.filter((l) => l.id !== action.layerId);
      return {
        ...state,
        layers: newLayers,
        selectedLayerId: state.selectedLayerId === action.layerId ? null : state.selectedLayerId,
        ...pushHistory(state, newLayers),
      };
    }
    case 'REORDER_LAYERS':
      return { ...state, layers: action.layers, ...pushHistory(state, action.layers) };
    case 'SET_SELECTED':
      return { ...state, selectedLayerId: action.id };
    case 'TOGGLE_FREE_MODE':
      return { ...state, freeMode: !state.freeMode };
    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const idx = state.historyIndex - 1;
      return { ...state, layers: state.history[idx], historyIndex: idx, selectedLayerId: null };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const idx = state.historyIndex + 1;
      return { ...state, layers: state.history[idx], historyIndex: idx, selectedLayerId: null };
    }
    case 'CLEAR':
      return { ...state, layers: [], selectedLayerId: null, ...pushHistory(state, []) };
    case 'LOAD_COMPOSITION':
      return { ...state, layers: action.layers, selectedLayerId: null, ...pushHistory(state, action.layers) };
    default:
      return state;
  }
}

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [components, setComponents] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [layersCollapsed, setLayersCollapsed] = useState(false);
  const [builtInPresets, setBuiltInPresets] = useState([]);
  const [savedPresets, setSavedPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('emoji-builder-presets') || '[]'); }
    catch { return []; }
  });
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savePreviewUrl, setSavePreviewUrl] = useState(null);
  const emojiCanvasRef = useRef(null);

  // Load manifest
  useEffect(() => {
    fetch('/components-manifest.json').then((r) => r.json()).then(setComponents).catch(console.error);
  }, []);

  // Load built-in presets
  useEffect(() => {
    fetch('/presets.json').then((r) => r.json()).then(setBuiltInPresets).catch(console.error);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); dispatch({ type: 'UNDO' }); }
      else if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); dispatch({ type: 'REDO' }); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const addComponent = (component) => {
    const snap = component.snapDefault;
    const native = component.nativeSize ?? 128;
    const x = state.freeMode ? 256 : snap.x;
    const y = state.freeMode ? 256 : snap.y;
    const scale = state.freeMode ? 1.0 : snap.width / native;
    dispatch({ type: 'ADD_LAYER', layer: { id: uid(), componentId: component.id, x, y, scale } });
  };

  const handleUpdateLayer = (layerId, updates, commit) => {
    dispatch({ type: 'UPDATE_LAYER', layerId, updates, commit });
  };

  // Align selected layer to canvas centre (512×512)
  const handleAlignH = () => {
    if (!state.selectedLayerId) return;
    dispatch({ type: 'UPDATE_LAYER', layerId: state.selectedLayerId, updates: { x: 256 }, commit: true });
  };
  const handleAlignV = () => {
    if (!state.selectedLayerId) return;
    dispatch({ type: 'UPDATE_LAYER', layerId: state.selectedLayerId, updates: { y: 256 }, commit: true });
  };
  const handleSnapToDefault = () => {
    if (!state.selectedLayerId) return;
    const layer = state.layers.find((l) => l.id === state.selectedLayerId);
    if (!layer) return;
    const component = components.find((c) => c.id === layer.componentId);
    if (!component) return;
    const snap = component.snapDefault;
    const native = component.nativeSize ?? 128;
    dispatch({
      type: 'UPDATE_LAYER',
      layerId: state.selectedLayerId,
      updates: { x: snap.x, y: snap.y, scale: snap.width / native },
      commit: true,
    });
  };

  // Preset: open save modal with preview
  const handleSavePreset = () => {
    if (state.layers.length === 0) return;
    const previewUrl = emojiCanvasRef.current?.getThumbnail(512) ?? null;
    setSavePreviewUrl(previewUrl);
    setShowSaveModal(true);
  };

  // Preset: confirm save with name from modal
  const handleConfirmSavePreset = (name) => {
    const thumbnail = emojiCanvasRef.current?.getThumbnail(512) ?? null;
    const preset = {
      id: `preset-${Date.now()}`,
      displayName: name,
      thumbnail,
      componentIds: state.layers.map((l) => l.componentId),
    };
    const next = [...savedPresets, preset];
    setSavedPresets(next);
    try { localStorage.setItem('emoji-builder-presets', JSON.stringify(next)); } catch { /* full */ }
  };

  // Preset: load a preset by appending its layers
  const handleLoadPreset = (preset) => {
    const newLayers = preset.componentIds
      .map((componentId) => {
        const component = components.find((c) => c.id === componentId);
        if (!component) return null;
        const snap = component.snapDefault;
        const native = component.nativeSize ?? 128;
        return { id: uid(), componentId, x: snap.x, y: snap.y, scale: snap.width / native };
      })
      .filter(Boolean);
    if (newLayers.length > 0) {
      dispatch({ type: 'APPEND_LAYERS', layers: newLayers });
    }
  };

  // Preset: delete a user-saved preset
  const handleDeleteSavedPreset = (id) => {
    const next = savedPresets.filter((p) => p.id !== id);
    setSavedPresets(next);
    try { localStorage.setItem('emoji-builder-presets', JSON.stringify(next)); } catch { /* */ }
  };

  // Download: trigger directly without modal
  const handleOpenDownload = () => {
    emojiCanvasRef.current?.download('emoji');
  };

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  // ─── Shared sub-components ─────────────────────────────────────────────────
  const canvas = (
    <EmojiCanvas
      ref={emojiCanvasRef}
      layers={state.layers}
      selectedLayerId={state.selectedLayerId}
      freeMode={state.freeMode}
      components={components}
      onSelectLayer={(id) => dispatch({ type: 'SET_SELECTED', id })}
      onUpdateLayer={handleUpdateLayer}
    />
  );

  const layerPanel = (
    <LayerPanel
      layers={state.layers}
      components={components}
      selectedLayerId={state.selectedLayerId}
      onSelectLayer={(id) => dispatch({ type: 'SET_SELECTED', id })}
      onRemoveLayer={(id) => dispatch({ type: 'REMOVE_LAYER', layerId: id })}
      onReorderLayers={(layers) => dispatch({ type: 'REORDER_LAYERS', layers })}
      onClearAll={() => dispatch({ type: 'CLEAR' })}
      onAlignH={handleAlignH}
      onAlignV={handleAlignV}
      onSnapToDefault={handleSnapToDefault}
      isCollapsed={layersCollapsed}
      onToggleCollapse={() => setLayersCollapsed((v) => !v)}
    />
  );

  const presetPanel = (
    <PresetPanel
      builtInPresets={builtInPresets}
      savedPresets={savedPresets}
      allComponents={components}
      onLoadPreset={handleLoadPreset}
      onDeleteSavedPreset={handleDeleteSavedPreset}
    />
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-screen overflow-hidden bg-background">

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <Toolbar
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onRedo={() => dispatch({ type: 'REDO' })}
          onViewLibrary={() => setShowLibraryModal(true)}
          onSavePreset={handleSavePreset}
          onOpenDownload={handleOpenDownload}
        />

        {/* ── Main area ────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Desktop: icon category sidebar ── */}
          <CategorySidebar
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
            className="hidden md:flex"
          />

          {/* ── Desktop: component/preset grid panel ── */}
          <aside className="hidden md:flex flex-col w-[260px] border-r overflow-hidden shrink-0">
            {activeCategory === 'presets' ? presetPanel : (
              <ComponentPicker
                components={components}
                activeCategory={activeCategory}
                onAddComponent={addComponent}
              />
            )}
          </aside>

          {/* ── Centre: canvas ── */}
          <main className="flex flex-col flex-1 overflow-hidden min-w-0">
            <div className="flex-1 flex items-center justify-center p-6 min-h-0">
              <div className="w-full max-w-[512px] rounded-2xl overflow-hidden border shadow-sm">
                {canvas}
              </div>
            </div>
          </main>

          {/* ── Desktop: layers panel (collapsible) ── */}
          <aside
            className={cn(
              'hidden md:flex flex-col border-l overflow-hidden shrink-0 transition-all duration-200',
              layersCollapsed ? 'w-[44px]' : 'w-[220px]'
            )}
          >
            {layersCollapsed ? (
              <div className="flex flex-col items-center pt-3">
                <button
                  onClick={() => setLayersCollapsed(false)}
                  aria-label="Expand layers"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="rotate-180">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ) : (
              layerPanel
            )}
          </aside>
        </div>

        {/* ── Mobile: bottom panel ─────────────────────────────────────────── */}
        <div className="md:hidden border-t bg-background shrink-0" style={{ height: '40vh' }}>
          <MobileTabBar
            layerCount={state.layers.length}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            components={components}
            onAddComponent={addComponent}
            layers={state.layers}
            layerComponents={components}
            selectedLayerId={state.selectedLayerId}
            onSelectLayer={(id) => dispatch({ type: 'SET_SELECTED', id })}
            onRemoveLayer={(id) => dispatch({ type: 'REMOVE_LAYER', layerId: id })}
            onReorderLayers={(layers) => dispatch({ type: 'REORDER_LAYERS', layers })}
            onClearAll={() => dispatch({ type: 'CLEAR' })}
            onAlignH={handleAlignH}
            onAlignV={handleAlignV}
            onSnapToDefault={handleSnapToDefault}
            builtInPresets={builtInPresets}
            savedPresets={savedPresets}
            allComponents={components}
            onLoadPreset={handleLoadPreset}
            onDeleteSavedPreset={handleDeleteSavedPreset}
          />
        </div>

        {/* ── Save preset modal ─────────────────────────────────────────────── */}
        <SavePresetModal
          open={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={handleConfirmSavePreset}
          previewUrl={savePreviewUrl}
        />

        {/* ── Library modal ─────────────────────────────────────────────────── */}
        <LibraryModal
          open={showLibraryModal}
          onClose={() => setShowLibraryModal(false)}
          savedPresets={savedPresets}
          allComponents={components}
          onLoadPreset={handleLoadPreset}
        />

      </div>
    </TooltipProvider>
  );
}

// ─── Mobile bottom panel ───────────────────────────────────────────────────────
function MobileTabBar({
  layerCount,
  activeCategory,
  onCategoryChange,
  components,
  onAddComponent,
  layers,
  layerComponents,
  selectedLayerId,
  onSelectLayer,
  onRemoveLayer,
  onReorderLayers,
  onClearAll,
  onAlignH,
  onAlignV,
  onSnapToDefault,
  builtInPresets,
  savedPresets,
  allComponents,
  onLoadPreset,
  onDeleteSavedPreset,
}) {
  const [tab, setTab] = useState('components');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab headers */}
      <div className="flex border-b shrink-0">
        {[
          { id: 'components', label: 'Components' },
          { id: 'layers', label: `Layers${layerCount > 0 ? ` (${layerCount})` : ''}` },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex-1 py-2 text-xs font-medium transition-colors border-b-2',
              tab === id
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'components' && (
          activeCategory === 'presets' ? (
            <PresetPanel
              builtInPresets={builtInPresets}
              savedPresets={savedPresets}
              allComponents={allComponents}
              onLoadPreset={onLoadPreset}
              onDeleteSavedPreset={onDeleteSavedPreset}
            />
          ) : (
            <ComponentPicker
              components={components}
              activeCategory={activeCategory}
              onCategoryChange={onCategoryChange}
              onAddComponent={onAddComponent}
              showMobileCategories
            />
          )
        )}
        {tab === 'layers' && (
          <LayerPanel
            layers={layers}
            components={layerComponents}
            selectedLayerId={selectedLayerId}
            onSelectLayer={onSelectLayer}
            onRemoveLayer={onRemoveLayer}
            onReorderLayers={onReorderLayers}
            onClearAll={onClearAll}
            onAlignH={onAlignH}
            onAlignV={onAlignV}
            onSnapToDefault={onSnapToDefault}
          />
        )}
      </div>
    </div>
  );
}
