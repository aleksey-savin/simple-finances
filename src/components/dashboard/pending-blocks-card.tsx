import { Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import type { PendingBlockSummary } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function formatDate(value: string) {
  return format(new Date(value), 'd MMM yyyy', { locale: ru })
}

export function PendingBlocksCard({
  services,
  title = 'Ожидаемые блокировки',
}: {
  services: PendingBlockSummary[]
  title?: string
}) {
  if (services.length === 0) return null

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4 text-warning" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {services.map((service) => (
          <div
            key={service.contractId}
            className="border bg-muted/20 p-3 space-y-1"
          >
            <p className="text-sm font-medium">
              {service.clientName ?? 'Клиент не указан'}
            </p>
            <p className="text-xs text-muted-foreground">
              {service.contractName}
            </p>
            {service.vmNames.length > 0 && (
              <p className="text-xs text-muted-foreground">
                ВМ: {service.vmNames.join(', ')}
              </p>
            )}
            <p className="text-xs text-warning">
              Будет заблокирована: {formatDate(service.willSuspendAt)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
