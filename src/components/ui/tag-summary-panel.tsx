import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
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

const STORAGE_KEY = 'tag-summary-expanded'

function formatCurrency(n: number) {
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatSigned(n: number) {
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${formatCurrency(Math.abs(n))}`
}

const columnsClass =
  'grid grid-cols-[minmax(10rem,1fr)_repeat(3,9rem)] gap-3 sm:grid-cols-[minmax(0,1fr)_repeat(3,10rem)]'

// ─── TagSummaryPanel ───────────────────────────────────────────────────────────

interface TagSummaryPanelProps {
  totals: TagTotal[]
  className?: string
}

export function TagSummaryPanel({ totals, className }: TagSummaryPanelProps) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    try {
      setExpanded(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      // storage unavailable — stay collapsed
    }
  }, [])

  const toggle = () => {
    setExpanded((value) => {
      const next = !value
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        // storage unavailable — keep in-memory state only
      }
      return next
    })
  }

  const rows = totals.filter((t) => t.incomeTotal !== 0 || t.expenseTotal !== 0)
  if (rows.length === 0) return null

  const totalIncome = rows.reduce((s, t) => s + t.incomeTotal, 0)
  const totalExpense = rows.reduce((s, t) => s + t.expenseTotal, 0)
  const totalNet = rows.reduce((s, t) => s + t.net, 0)

  return (
    <section
      aria-label="Итоги по тегам"
      className={cn('border bg-card', className)}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className="flex min-h-14 w-full flex-wrap items-center gap-x-7 gap-y-2 px-5 py-2 text-left tabular-nums hover:bg-muted/40"
      >
        <span className="mr-auto flex items-center gap-2">
          <ChevronRight
            className={cn(
              'size-4 text-muted-foreground transition-transform',
              expanded && 'rotate-90',
            )}
          />
          <span className="text-base font-semibold">Итоги по тегам</span>
          <span className="font-medium text-faint">{rows.length}</span>
        </span>
        <span className="flex items-baseline gap-2">
          <span className="text-sm text-muted-foreground">Доходы</span>
          <span className="text-base font-semibold text-accent-text">
            {formatSigned(totalIncome)}
          </span>
        </span>
        <span className="flex items-baseline gap-2">
          <span className="text-sm text-muted-foreground">Расходы</span>
          <span className="text-base font-semibold">
            {formatCurrency(totalExpense)}
          </span>
        </span>
        <span className="flex items-baseline gap-2">
          <span className="text-sm text-muted-foreground">Сальдо</span>
          <span
            className={cn(
              'text-base font-semibold',
              totalNet > 0 && 'text-accent-text',
            )}
          >
            {formatSigned(totalNet)}
          </span>
        </span>
      </button>

      {expanded && (
        <div className="overflow-x-auto border-t border-border-soft">
          <div className="min-w-max sm:min-w-0">
            <div
              className={cn(
                columnsClass,
                'px-5 pt-2.5 pb-1.5 text-xs font-bold tracking-wider text-faint uppercase',
              )}
            >
              <span>Тег</span>
              <span className="text-right">Доходы</span>
              <span className="text-right">Расходы</span>
              <span className="text-right">Сальдо</span>
            </div>
            <ul>
              {rows.map(({ tag, incomeTotal, expenseTotal, net }) => (
                <li
                  key={tag.id}
                  className={cn(
                    columnsClass,
                    'min-h-11 items-center border-t border-border-soft px-5 text-sm tabular-nums',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="truncate font-medium">{tag.name}</span>
                  </span>
                  <span
                    className={cn(
                      'text-right',
                      incomeTotal > 0 ? 'text-accent-text' : 'text-faint',
                    )}
                  >
                    {incomeTotal > 0 ? formatSigned(incomeTotal) : '—'}
                  </span>
                  <span
                    className={cn(
                      'text-right',
                      expenseTotal === 0 && 'text-faint',
                    )}
                  >
                    {expenseTotal > 0 ? formatCurrency(expenseTotal) : '—'}
                  </span>
                  <span
                    className={cn(
                      'text-right font-semibold',
                      net > 0 && 'text-accent-text',
                    )}
                  >
                    {formatSigned(net)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
