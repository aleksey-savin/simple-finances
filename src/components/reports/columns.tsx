import type { ColumnDef } from '@tanstack/react-table'

import { DataTableColumnHeader } from '#/components/ui/data-table'
import { formatMoney } from '#/lib/format'
import { cn } from '#/lib/utils'
import type { ProfitabilityMonthPoint } from '#/types'

import type { ReportBreakdownSelection } from './breakdown-sheet'

function Money({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)}>
      {formatMoney(value)}
    </span>
  )
}

type Variant = 'income' | 'expense' | 'net' | 'debt' | 'plain'

function variantClass(variant: Variant, value: number) {
  if (variant === 'income') return 'text-success'
  if (variant === 'expense') return 'text-warning'
  if (variant === 'debt') return value > 0 ? 'text-destructive' : undefined
  if (variant === 'net') {
    return value > 0 ? 'text-success' : value < 0 ? 'text-warning' : undefined
  }
  return undefined
}

// Displayed value folds the current-month forecast into the realized totals.
const cash = {
  income: (p: ProfitabilityMonthPoint) => p.incomeCash + p.plannedIncomeCash,
  expense: (p: ProfitabilityMonthPoint) => p.expenseCash + p.plannedExpenseCash,
  net: (p: ProfitabilityMonthPoint) =>
    p.incomeCash + p.plannedIncomeCash - (p.expenseCash + p.plannedExpenseCash),
}
const accrual = {
  income: (p: ProfitabilityMonthPoint) =>
    p.incomeAccrual + p.plannedIncomeAccrual,
  expense: (p: ProfitabilityMonthPoint) =>
    p.expenseAccrual + p.plannedExpenseAccrual,
  net: (p: ProfitabilityMonthPoint) =>
    p.incomeAccrual +
    p.plannedIncomeAccrual -
    (p.expenseAccrual + p.plannedExpenseAccrual),
}

type Figure = {
  basis: ReportBreakdownSelection['basis']
  kind: ReportBreakdownSelection['kind']
}

export type ProfitabilityColumnsOptions = {
  months: ReportBreakdownSelection['months']
  onSelect?: (selection: ReportBreakdownSelection) => void
}

export function buildProfitabilityColumns({
  months,
  onSelect,
}: ProfitabilityColumnsOptions): ColumnDef<ProfitabilityMonthPoint, unknown>[] {
  function moneyColumn(
    id: string,
    title: string,
    accessor: (p: ProfitabilityMonthPoint) => number,
    variant: Variant,
    figure?: Figure,
  ): ColumnDef<ProfitabilityMonthPoint, unknown> {
    return {
      id,
      accessorFn: accessor,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={title}
          className="w-full justify-end"
        />
      ),
      cell: ({ row }) => {
        const value = accessor(row.original)
        const money = (
          <Money value={value} className={variantClass(variant, value)} />
        )
        if (!figure || !onSelect) {
          return <div className="text-right">{money}</div>
        }
        return (
          <div className="text-right">
            <button
              type="button"
              className="cursor-pointer underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
              onClick={() =>
                onSelect({
                  basis: figure.basis,
                  kind: figure.kind,
                  month: row.original.month,
                  months,
                  label: `${title} · ${row.original.label}`,
                  expectedTotal: value,
                })
              }
            >
              {money}
            </button>
          </div>
        )
      },
    }
  }

  return [
    {
      id: 'month',
      accessorFn: (row) => row.month,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Месяц" />
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-medium">
          {row.original.label}
          {row.original.isForecast ? (
            <span className="text-muted-foreground"> · прогноз</span>
          ) : null}
        </span>
      ),
    },
    moneyColumn('incomeCash', 'Доход (факт)', cash.income, 'income', {
      basis: 'cash',
      kind: 'income',
    }),
    moneyColumn('expenseCash', 'Расход (факт)', cash.expense, 'expense', {
      basis: 'cash',
      kind: 'expense',
    }),
    moneyColumn('netCash', 'Сальдо (факт)', cash.net, 'net', {
      basis: 'cash',
      kind: 'net',
    }),
    moneyColumn('incomeAccrual', 'Доход (начисл.)', accrual.income, 'income', {
      basis: 'accrual',
      kind: 'income',
    }),
    moneyColumn(
      'expenseAccrual',
      'Расход (начисл.)',
      accrual.expense,
      'expense',
      { basis: 'accrual', kind: 'expense' },
    ),
    moneyColumn('netAccrual', 'Сальдо (начисл.)', accrual.net, 'net', {
      basis: 'accrual',
      kind: 'net',
    }),
    moneyColumn('debt', 'Долг на 1-е', (p) => p.debt, 'debt'),
    moneyColumn('balanceStart', 'Баланс на 1-е', (p) => p.balanceStart, 'net'),
  ]
}
