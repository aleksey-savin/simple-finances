import { Cron } from 'croner'
import { CRON_PRESETS } from '@/components/recurring/constants'
import type { CreatedOccurrence, RecurringMonthTotals } from '@/types'

type RuleForMonthCalc = {
  id: string
  type: string
  amount: string
  cronExpression: string
  isActive: boolean
  nextRunAt?: Date | string | null
}

/**
 * Occurrences of a recurring rule that fall within [monthStart, monthEnd],
 * honoring skips.
 *
 * We ANCHOR on `nextRunAt` (the authoritative next firing — already advanced
 * past any created or skipped occurrence) and only STEP forward with croner.
 * We never ask croner to *reproduce* `nextRunAt`, so this is robust to the
 * timezone offset between the stored `nextRunAt` and croner's cron evaluation
 * (the stored value need not align with `new Cron(expr).nextRun()`).
 *
 * Occurrences before `nextRunAt` (already created or skipped) are never emitted.
 * When `nextRunAt` is null or earlier than this month, we fall back to
 * projecting from `monthStart` (the old behavior — there is no skip within this
 * month to honor).
 */
export function ruleOccurrencesInMonth(
  cronExpression: string,
  nextRunAt: Date | string | null | undefined,
  monthStart: Date,
  monthEnd: Date,
): Date[] {
  const occurrences: Date[] = []

  try {
    const job = new Cron(cronExpression, { paused: true })
    const anchor = nextRunAt != null ? new Date(nextRunAt) : null
    let occ: Date | null =
      anchor && anchor >= monthStart
        ? anchor
        : job.nextRun(new Date(monthStart.getTime() - 1))

    for (let guard = 0; guard < 500 && occ; guard++) {
      if (occ > monthEnd) break
      if (occ >= monthStart) occurrences.push(occ)
      occ = job.nextRun(occ)
    }
  } catch {
    // Invalid cron expression → no occurrences.
  }

  return occurrences
}

export function computeMonthTotals(
  rules: RuleForMonthCalc[],
  monthStart: Date,
  createdOccurrencesByRule: Record<string, CreatedOccurrence[]> = {},
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
    let amount = 0
    let count = 0

    // Occurrences already created this month (real invoices, actual amounts).
    // Counted regardless of the rule's active state — the payment happened.
    for (const created of createdOccurrencesByRule[rule.id] ?? []) {
      const occurrenceAt = new Date(created.occurrenceAt)
      if (occurrenceAt >= monthStart && occurrenceAt <= monthEnd) {
        amount += Number(created.amount)
        count += 1
      }
    }

    // Occurrences still pending this month (only active rules will fire).
    if (rule.isActive) {
      const projected = ruleOccurrencesInMonth(
        rule.cronExpression,
        rule.nextRunAt,
        monthStart,
        monthEnd,
      ).length
      amount += Number(rule.amount) * projected
      count += projected
    }

    if (rule.type === 'receivable') {
      income += amount
      incomeCount += count
    } else if (rule.type === 'payable') {
      expenses += amount
      expensesCount += count
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

  return (
    ruleOccurrencesInMonth(
      rule.cronExpression,
      rule.nextRunAt,
      monthStart,
      monthEnd,
    ).length > 0
  )
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
