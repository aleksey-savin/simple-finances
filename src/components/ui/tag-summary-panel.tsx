import { useState } from 'react'
import { Tag, ChevronDown, ChevronUp, X } from 'lucide-react'
import { cn } from '#/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type TagTotal = {
  tag: {
    id: string
    name: string
    color: string
  }
  expenseTotal: number
  incomeTotal: number
  net: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// ─── TagSummaryPanel ───────────────────────────────────────────────────────────

interface TagSummaryPanelProps {
  totals: TagTotal[]
  className?: string
}

export function TagSummaryPanel({ totals, className }: TagSummaryPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [hidden, setHidden] = useState(false)

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'flex items-center gap-2 rounded-full shadow-lg border',
          'bg-background/95 backdrop-blur-sm px-4 py-2 text-sm font-medium',
          'hover:bg-muted transition-colors',
          className,
        )}
      >
        <Tag className="size-4 text-primary" />
        Теги ({totals.length})
      </button>
    )
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'w-72 rounded-xl shadow-xl border',
        'bg-background/95 backdrop-blur-sm',
        'overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/40">
        <Tag className="size-4 text-primary shrink-0" />
        <span className="text-sm font-semibold flex-1">Итоги по тегам</span>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
          title={collapsed ? 'Развернуть' : 'Свернуть'}
        >
          {collapsed ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setHidden(true)}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
          title="Скрыть"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="max-h-80 overflow-y-auto">
          {totals.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6 px-4">
              Нет тегов с активными платежами
            </p>
          ) : (
            <ul className="divide-y">
              {totals.map(({ tag, expenseTotal, incomeTotal, net }) => (
                <li key={tag.id} className="px-4 py-2.5">
                  {/* Tag name */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm font-medium truncate flex-1">
                      {tag.name}
                    </span>
                    {/* Net badge */}
                    <span
                      className={cn(
                        'text-xs font-semibold tabular-nums',
                        net >= 0 ? 'text-green-600' : 'text-red-500',
                      )}
                    >
                      {net >= 0 ? '+' : ''}
                      {formatCurrency(net)} ₽
                    </span>
                  </div>

                  {/* Breakdown */}
                  <div className="grid grid-cols-2 gap-x-2 text-xs text-muted-foreground pl-4">
                    {incomeTotal > 0 && (
                      <span className="text-green-600">
                        ↑ {formatCurrency(incomeTotal)} ₽
                      </span>
                    )}
                    {expenseTotal > 0 && (
                      <span className="text-red-500">
                        ↓ {formatCurrency(expenseTotal)} ₽
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Footer total */}
      {!collapsed && totals.length > 0 && (
        <div className="border-t px-4 py-2 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {totals.length}{' '}
            {totals.length === 1
              ? 'тег'
              : totals.length <= 4
                ? 'тега'
                : 'тегов'}
          </span>
          <span
            className={cn(
              'font-semibold tabular-nums',
              totals.reduce((s, t) => s + t.net, 0) >= 0
                ? 'text-green-600'
                : 'text-red-500',
            )}
          >
            Итого:{' '}
            {(() => {
              const total = totals.reduce((s, t) => s + t.net, 0)
              return `${total >= 0 ? '+' : ''}${formatCurrency(total)} ₽`
            })()}
          </span>
        </div>
      )}
    </div>
  )
}
