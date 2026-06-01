import { Cron } from 'croner'
import { CRON_PRESETS } from '@/components/recurring/constants'
import type { RecurringMonthTotals } from '@/types'

type RuleForMonthCalc = {
  type: string
  amount: string
  cronExpression: string
  isActive: boolean
  nextRunAt?: Date | string | null
}

/**
 * Exclusive lower-bound cursor for `Cron.nextRun()` when projecting a rule's
 * occurrences, honoring skips. A skip advances the rule's `nextRunAt` past the
 * skipped occurrence, so occurrences before `nextRunAt` were already created or
 * skipped and must not be projected. Returns the later of `base` and
 * `nextRunAt - 1ms` (so an occurrence landing exactly on `nextRunAt` is kept).
 */
export function recurringProjectionCursor(
  base: Date,
  nextRunAt: Date | string | null | undefined,
): Date {
  if (!nextRunAt) return base
  const threshold = new Date(nextRunAt).getTime() - 1
  return threshold > base.getTime() ? new Date(threshold) : base
}

export function computeMonthTotals(
  rules: RuleForMonthCalc[],
  monthStart: Date,
): RecurringMonthTotals {
  const monthEnd = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  )

  let income = 0
  let incomeCount = 0
  let expenses = 0
  let expensesCount = 0

  for (const rule of rules) {
    if (!rule.isActive) continue

    try {
      const schedule = new Cron(rule.cronExpression, { paused: true })
      let cursor = recurringProjectionCursor(
        new Date(monthStart.getTime() - 1),
        rule.nextRunAt,
      )

      for (let guard = 0; guard < 500; guard++) {
        const next = schedule.nextRun(cursor)
        if (!next || next > monthEnd) break

        if (rule.type === 'receivable') {
          income += Number(rule.amount)
          incomeCount += 1
        } else if (rule.type === 'payable') {
          expenses += Number(rule.amount)
          expensesCount += 1
        }

        cursor = new Date(next.getTime() + 1)
      }
    } catch {
      // Skip rules with invalid cron expressions.
    }
  }

  return { income, incomeCount, expenses, expensesCount }
}

export function ruleHasOccurrenceInMonth(
  rule: {
    cronExpression: string
    isActive: boolean
    nextRunAt?: Date | string | null
  },
  monthStart: Date,
): boolean {
  if (!rule.isActive) return false

  const monthEnd = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  )

  try {
    const schedule = new Cron(rule.cronExpression, { paused: true })
    const next = schedule.nextRun(
      recurringProjectionCursor(
        new Date(monthStart.getTime() - 1),
        rule.nextRunAt,
      ),
    )
    return Boolean(next && next <= monthEnd)
  } catch {
    return false
  }
}

export function formatMonthLabel(date: Date): string {
  const label = date.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function getCronLabel(expr: string): string {
  const found = CRON_PRESETS.find(
    (preset) => preset.value === expr && preset.value !== 'custom',
  )
  return found ? found.label : expr
}

export function formatRuleDate(date: Date | string | null | undefined): string {
  if (!date) return '—'

  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function pluralDays(days: number): string {
  const mod10 = days % 10
  const mod100 = days % 100

  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return 'дня'
  }

  return 'дней'
}

export function formatRuleAmount(amount: string | number) {
  return Number(amount).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
