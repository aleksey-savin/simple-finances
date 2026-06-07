import { cn } from '@/lib/utils'

import { TASK_LIST_COLORS, TASK_LIST_ICONS } from './list-icons'

type Props = {
  icon: string | null
  color: string | null
  onIconChange: (icon: string) => void
  onColorChange: (color: string) => void
}

// Inline icon grid + colour swatches, reused by the new-list form and the
// per-tab settings popover.
export function ListAppearanceFields({
  icon,
  color,
  onIconChange,
  onColorChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted-foreground">Иконка</p>
        <div className="grid grid-cols-6 gap-1">
          {TASK_LIST_ICONS.map(({ name, Icon }) => {
            const selected = icon === name
            return (
              <button
                key={name}
                type="button"
                title={name}
                className={cn(
                  'flex size-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted',
                  selected && 'bg-muted text-on-surface',
                )}
                style={selected && color ? { color } : undefined}
                onClick={() => onIconChange(name)}
              >
                <Icon className="size-4" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted-foreground">Цвет</p>
        <div className="flex flex-wrap gap-1">
          {TASK_LIST_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={cn(
                'size-6 border-2 transition-transform hover:scale-110',
                color === c
                  ? 'scale-110 border-foreground'
                  : 'border-transparent',
              )}
              style={{ backgroundColor: c }}
              onClick={() => onColorChange(c)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
