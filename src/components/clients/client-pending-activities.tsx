import { Link } from '@tanstack/react-router'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type PendingActivity = {
  id: string
  type: string
  typeLabel: string
  title: string
  subtitle?: string
  status: string
  statusLabel: string
  statusVariant: 'secondary' | 'outline' | 'success' | 'destructive'
  link?: { to: string; params: Record<string, string> }
}

export function ClientPendingActivities({
  activities,
}: {
  activities: PendingActivity[]
}) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">Текущие активности</h3>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет активных задач</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Тип</TableHead>
              <TableHead className="font-bold">Название</TableHead>
              <TableHead className="font-bold">Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {a.typeLabel}
                </TableCell>
                <TableCell>
                  {a.link ? (
                    <Link
                      to={a.link.to}
                      params={a.link.params}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {a.title}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">{a.title}</span>
                  )}
                  {a.subtitle && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.subtitle}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={a.statusVariant}>{a.statusLabel}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
