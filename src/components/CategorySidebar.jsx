import { Circle, Eye, Smile, Hand, GraduationCap, Sparkles, Minus, LayoutGrid } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const CATEGORIES = [
  { id: 'all',         label: 'All',         Icon: Sparkles      },
  { id: 'base',        label: 'Base',        Icon: Circle        },
  { id: 'brows',       label: 'Brows',       Icon: Minus         },
  { id: 'eyes',        label: 'Eyes',        Icon: Eye           },
  { id: 'mouth',       label: 'Mouth',       Icon: Smile         },
  { id: 'hands',       label: 'Hands',       Icon: Hand          },
  { id: 'accessories', label: 'Accessories', Icon: GraduationCap },
  { id: 'presets',     label: 'Presets',     Icon: LayoutGrid    },
];

export default function CategorySidebar({ activeCategory, onSelect, className }) {
  return (
    <nav className={cn('flex flex-col items-center pt-3 pb-2 gap-0.5 w-[52px] border-r shrink-0 bg-background', className)}>
      {CATEGORIES.map(({ id, label, Icon }) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onSelect(id)}
              aria-label={label}
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-muted/70',
                activeCategory === id && 'bg-muted text-foreground'
              )}
            >
              <Icon className="size-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {label}
          </TooltipContent>
        </Tooltip>
      ))}
    </nav>
  );
}
