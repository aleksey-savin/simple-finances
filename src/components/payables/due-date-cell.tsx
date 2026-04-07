import type { ExpenseRow } from './types'
import { formatDate, getDueMeta } from './utils'

export function PayablesDueDateCell({ row }: { row: ExpenseRow }) {
  if (!row.dueDate) {
    return <span className="text-muted-foreground text-sm">—</span>
  }

  const { isOverdue, daysLeft } = getDueMeta(row.dueDate)

  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={`text-sm font-medium ${
          !row.isProjected && isOverdue ? 'text-destructive' : ''
        }`}
      >
        {formatDate(row.dueDate)}
      </span>

      {!row.isProjected && isOverdue && (
        <span className="text-xs text-red-400">
          просрочен {Math.abs(daysLeft ?? 0)} дн.
        </span>
      )}

      {!row.isProjected && !isOverdue && daysLeft !== null && daysLeft <= 7 && (
        <span className="text-xs text-warning">осталось {daysLeft} дн.</span>
      )}

      {row.isProjected && (
        <span className="text-xs text-muted-foreground">по расписанию</span>
      )}
    </div>
  )
}
