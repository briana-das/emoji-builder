import { cn } from '@/lib/utils';
import { CATEGORIES } from '@/components/CategorySidebar';

// ─── Single component card ────────────────────────────────────────────────────
function ComponentCard({ component, onAdd }) {
  return (
    <button
      onClick={() => onAdd(component)}
      title={component.displayName}
      className={cn(
        'group rounded-xl border border-transparent overflow-hidden transition-all',
        'hover:border-primary/30 hover:shadow-sm hover:bg-primary/5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'aspect-square'
      )}
    >
      <div className="w-full h-full bg-muted/40 flex items-center justify-center overflow-hidden rounded-xl">
        <img
          src={`/components/${component.filename}`}
          alt={component.displayName}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>
    </button>
  );
}

// ─── Mobile horizontal category bar ──────────────────────────────────────────
function MobileCategoryBar({ activeCategory, onSelect }) {
  return (
    <div className="flex gap-1 overflow-x-auto px-2 py-2 shrink-0 no-scrollbar">
      {CATEGORIES.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap shrink-0 transition-colors',
            'border border-border text-muted-foreground hover:text-foreground hover:bg-muted',
            activeCategory === id && 'bg-foreground text-background border-foreground'
          )}
        >
          <Icon className="size-3.5" />
          <span className="capitalize">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Main picker ─────────────────────────────────────────────────────────────
export default function ComponentPicker({
  components,
  activeCategory,
  onCategoryChange,  // used only on mobile
  onAddComponent,
  showMobileCategories = false,
}) {
  const filtered =
    activeCategory === 'all'
      ? components
      : components.filter((c) => c.category === activeCategory);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Mobile-only category bar */}
      {showMobileCategories && onCategoryChange && (
        <MobileCategoryBar activeCategory={activeCategory} onSelect={onCategoryChange} />
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-10">
            No components in this category yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((comp) => (
              <ComponentCard key={comp.id} component={comp} onAdd={onAddComponent} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
