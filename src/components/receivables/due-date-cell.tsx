import type { IncomeRow } from './types'
import { formatDate, getDueMeta } from './utils'

export function ReceivablesDueDateCell({ row }: { row: IncomeRow }) {
  if (!row.dueDate) {
    return <span className="text-muted-foreground text-sm">—</span>
  }

  const { isOverdue, daysLeft } = getDueMeta(row.dueDate)

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-sm font-medium ${isOverdue ? 'text-destructive' : ''}`}>
        {formatDate(row.dueDate)}
      </span>
      {isOverdue && (
        <span className="text-xs text-red-400">
          просрочен {Math.abs(daysLeft ?? 0)} дн.
        </span>
      )}
      {!isOverdue && daysLeft !== null && daysLeft <= 7 && (
        <span className="text-xs text-warning">осталось {daysLeft} дн.</span>
      )}
    </div>
  )
}
