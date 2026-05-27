import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import type { ClientProxmoxResource } from '@/types'
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

type StatusBadge = {
  label: string
  variant: 'secondary' | 'outline' | 'success' | 'destructive'
}

function formatDate(value: string) {
  return format(new Date(value), 'd MMM yyyy', { locale: ru })
}

function deriveStatus(resource: ClientProxmoxResource): StatusBadge {
  if (resource.isPausedBySystem) {
    return { label: 'Заблокирована', variant: 'destructive' }
  }

  if (resource.willSuspendAt) {
    return {
      label: `Будет заблокирована ${formatDate(resource.willSuspendAt)}`,
      variant: 'outline',
    }
  }

  if (resource.hasOverdueInvoices) {
    return {
      label: 'Блокировка при ближайшем запуске',
      variant: 'destructive',
    }
  }

  return { label: 'Активна', variant: 'success' }
}

export function ClientProxmoxResources({
  resources,
}: {
  resources: ClientProxmoxResource[]
}) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">Серверные ресурсы</h3>
      {resources.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Нет привязанных ресурсов
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">ВМ</TableHead>
              <TableHead className="font-bold">Узел</TableHead>
              <TableHead className="font-bold">Контракт</TableHead>
              <TableHead className="font-bold">Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.map((r) => {
              const status = deriveStatus(r)
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.vmType.toUpperCase()} · VMID {r.vmid}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.nodeName}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{r.counterpartyName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.contractName}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
