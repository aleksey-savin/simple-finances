import { AlertTriangle } from 'lucide-react'

import { Badge } from '#/components/ui/badge'

import type { IncomeRow } from './types'
import { getDueMeta } from './utils'

export function ReceivablesStatusBadge({ row }: { row: IncomeRow }) {
  if (row.paymentStatus === 'partial') {
    return (
      <Badge variant="warning" className="text-xs">
        Частично получено
      </Badge>
    )
  }

  if (!row.dueDate) {
    return (
      <Badge variant="outline" className="text-xs">
        Без срока
      </Badge>
    )
  }

  const { isOverdue, daysLeft } = getDueMeta(row.dueDate)

  if (isOverdue) {
    return (
      <Badge
        variant="destructive"
        className="gap-1 whitespace-nowrap text-xs"
      >
        <AlertTriangle className="size-3" />
        Просрочен
      </Badge>
    )
  }

  if (daysLeft !== null && daysLeft <= 7) {
    return (
      <Badge variant="warning" className="text-xs">
        Скоро
      </Badge>
    )
  }

  return (
    <Badge variant="success" className="text-xs">
      В срок
    </Badge>
  )
}
