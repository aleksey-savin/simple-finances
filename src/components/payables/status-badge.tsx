import { AlertTriangle, Clock } from 'lucide-react'

import { Badge } from '#/components/ui/badge'

import type { ExpenseRow } from './types'
import { getDueMeta } from './utils'

export function PayablesStatusBadge({ row }: { row: ExpenseRow }) {
  if (row.isProjected) {
    return (
      <Badge variant="outline" className="gap-1 whitespace-nowrap text-xs">
        <Clock className="size-3" />
        Запланировано
      </Badge>
    )
  }

  if (row.paymentStatus === 'paid') {
    return (
      <Badge variant="success" className="text-xs">
        Оплачено
      </Badge>
    )
  }

  if (row.paymentStatus === 'partial') {
    return (
      <Badge className="border-transparent bg-warning text-xs text-white whitespace-nowrap">
        Частично оплачено
      </Badge>
    )
  }

  if (!row.dueDate) {
    return (
      <Badge variant="outline" className="whitespace-nowrap text-xs">
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
      <Badge
        variant="warning"
        className="border-transparent whitespace-nowrap text-xs"
      >
        Скоро
      </Badge>
    )
  }

  return (
    <Badge variant="default" className="text-xs">
      В срок
    </Badge>
  )
}
