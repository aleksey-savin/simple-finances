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

function NetCell({ value }: { value: number }) {
  return (
    <Money
      value={value}
      className={
        value > 0 ? 'text-success' : value < 0 ? 'text-warning' : undefined
      }
    />
  )
}

function moneyColumn(
  id: keyof ProfitabilityMonthPoint,
  title: string,
  variant: 'income' | 'expense' | 'net' | 'plain' = 'plain',
): ColumnDef<ProfitabilityMonthPoint, unknown> {
  return {
    id,
    accessorFn: (row) => row[id],
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={title}
        className="justify-end"
      />
    ),
    cell: ({ row }) => {
      const value = row.original[id] as number
      if (variant === 'net')
        return (
          <div className="text-right">
            <NetCell value={value} />
          </div>
        )
      return (
        <div className="text-right">
          <Money
            value={value}
            className={
              variant === 'income'
                ? 'text-success'
                : variant === 'expense'
                  ? 'text-warning'
                  : undefined
            }
          />
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
        <span className="font-medium whitespace-nowrap">
          {row.original.label}
        </span>
      ),
    },
    moneyColumn('incomeCash', 'Доход (факт)', 'income'),
    moneyColumn('expenseCash', 'Расход (факт)', 'expense'),
    moneyColumn('netCash', 'Нетто (факт)', 'net'),
    moneyColumn('incomeAccrual', 'Доход (начисл.)', 'income'),
    moneyColumn('expenseAccrual', 'Расход (начисл.)', 'expense'),
    moneyColumn('netAccrual', 'Нетто (начисл.)', 'net'),
    moneyColumn('balanceAtStart', 'Остаток на 1-е'),
  ]
}
