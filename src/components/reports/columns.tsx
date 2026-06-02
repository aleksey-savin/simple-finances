import type { ColumnDef } from '@tanstack/react-table'

import { DataTableColumnHeader } from '#/components/ui/data-table'
import { formatMoney } from '#/lib/format'
import { cn } from '#/lib/utils'
import type { ProfitabilityMonthPoint } from '#/types'

function Money({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)}>
      {formatMoney(value)}
    </span>
  )
}

type Variant = 'income' | 'expense' | 'net' | 'plain'

function variantClass(variant: Variant, value: number) {
  if (variant === 'income') return 'text-success'
  if (variant === 'expense') return 'text-warning'
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

function moneyColumn(
  id: string,
  title: string,
  accessor: (p: ProfitabilityMonthPoint) => number,
  variant: Variant = 'plain',
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
      return (
        <div className="text-right">
          <Money value={value} className={variantClass(variant, value)} />
        </div>
      )
    },
  }
}

export function buildProfitabilityColumns(): ColumnDef<
  ProfitabilityMonthPoint,
  unknown
>[] {
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
    moneyColumn('incomeCash', 'Доход (факт)', cash.income, 'income'),
    moneyColumn('expenseCash', 'Расход (факт)', cash.expense, 'expense'),
    moneyColumn('netCash', 'Нетто (факт)', cash.net, 'net'),
    moneyColumn('incomeAccrual', 'Доход (начисл.)', accrual.income, 'income'),
    moneyColumn(
      'expenseAccrual',
      'Расход (начисл.)',
      accrual.expense,
      'expense',
    ),
    moneyColumn('netAccrual', 'Нетто (начисл.)', accrual.net, 'net'),
    moneyColumn('balanceAtStart', 'Остаток на 1-е', (p) => p.balanceAtStart),
  ]
}
