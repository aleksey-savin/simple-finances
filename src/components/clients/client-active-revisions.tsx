import { Link } from '@tanstack/react-router'

import type { ClientDetail } from '@/types'
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

const statusLabel: Record<string, string> = {
  draft: 'Черновик',
  notified: 'Уведомлён',
  agreed: 'Согласован',
  signed: 'Подписан',
  success: 'Завершён',
}

const statusVariant: Record<
  string,
  'secondary' | 'outline' | 'success' | 'destructive'
> = {
  draft: 'secondary',
  notified: 'outline',
  agreed: 'outline',
  signed: 'outline',
  success: 'success',
}

function formatAmount(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return value
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(
    parsed,
  )
}

export function ClientActiveRevisions({
  activeRevisions,
}: {
  activeRevisions: ClientDetail['activeRevisions']
}) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">Текущие ревизии цен</h3>
      {activeRevisions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет активных ревизий</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Ревизия</TableHead>
              <TableHead className="font-bold">Договор</TableHead>
              <TableHead className="font-bold">Статус</TableHead>
              <TableHead className="font-bold">Текущая</TableHead>
              <TableHead className="font-bold">Новая</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeRevisions.map((r) => (
              <TableRow
                key={r.itemId}
                className={r.included ? '' : 'opacity-50'}
              >
                <TableCell>
                  <Link
                    to="/price-revisions/$id"
                    params={{ id: r.revisionId }}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {r.revisionName}
                  </Link>
                </TableCell>
                <TableCell className="text-sm">{r.contractName}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[r.status] ?? 'secondary'}>
                    {statusLabel[r.status] ?? r.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    {r.currentAmounts.map((amt, i) => (
                      <span key={i} className="font-mono text-sm tabular-nums">
                        {formatAmount(amt)} ₽
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    {r.proposedAmounts.map((amt, i) => {
                      const diff =
                        Number(amt) - Number(r.currentAmounts[i] ?? '0')
                      const colorClass =
                        diff > 0
                          ? 'text-success'
                          : diff < 0
                            ? 'text-destructive'
                            : ''
                      return (
                        <span
                          key={i}
                          className={`font-mono text-sm tabular-nums ${colorClass}`}
                        >
                          {formatAmount(amt)} ₽
                        </span>
                      )
                    })}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
