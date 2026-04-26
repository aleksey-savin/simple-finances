import { Link } from '@tanstack/react-router'
import { Banknote, ClipboardList } from 'lucide-react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { DashboardLoaderData } from '#/types'
import { formatMoney, formatShortDate } from '@/lib/format'

export function TasksSection({
  tasks,
}: {
  tasks: DashboardLoaderData['tasks']
}) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>Задачи</CardTitle>
        <p className="text-sm text-muted-foreground">
          Операции, которые требуют ручного действия.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <div className="border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">
            Активных задач нет
          </div>
        ) : (
          tasks.map((task) => <TaskRow key={task.id} task={task} />)
        )}
      </CardContent>
    </Card>
  )
}

function TaskRow({ task }: { task: DashboardLoaderData['tasks'][number] }) {
  if (task.kind === 'bank-import') {
    return (
      <div className="flex flex-col gap-3 border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Banknote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{task.title}</p>
            <p className="text-sm text-muted-foreground">{task.description}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{task.count} строк</span>
              <span>{formatMoney(task.amount)} ₽</span>
              <span>Входящие: {formatMoney(task.incomingAmount)} ₽</span>
              <span>Исходящие: {formatMoney(task.outgoingAmount)} ₽</span>
            </div>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="md:ml-auto">
          <Link
            to="/bank-import"
            search={{
              page: 1,
              pageSize: 25,
              search: '',
              direction: 'all',
              status: 'all',
            }}
          >
            К выпискам
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <ClipboardList className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{task.title}</p>
            <Badge variant="secondary">{task.businessLineName}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{task.description}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{task.itemCount} договоров</span>
            <span>Создана: {formatShortDate(task.createdAt)}</span>
          </div>
        </div>
      </div>
      <Button asChild variant="outline" size="sm" className="md:ml-auto">
        <Link to="/price-revisions/$id" params={{ id: task.revisionId }}>
          Открыть
        </Link>
      </Button>
    </div>
  )
}
