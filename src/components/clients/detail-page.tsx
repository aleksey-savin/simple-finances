import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import type { ClientDetail } from '@/types'
import { BlockedServicesCard } from '@/components/contracts/blocked-services-card'

import { clientDetailQueryKey, clientsQueryKey } from './actions'
import { ClientContracts } from './client-contracts'
import { ClientCounterparties } from './client-counterparties'
import { ClientHistoryLog } from './client-history-log'
import { ClientInfoCard } from './client-info-card'
import { ClientPendingActivities } from './client-pending-activities'
import { ClientPendingPayments } from './client-pending-payments'
import { ClientProxmoxResources } from './client-proxmox-resources'
import type { HistoryEntry } from './client-history-log'
import type { PendingActivity } from './client-pending-activities'

const revisionStatusLabel: Record<string, string> = {
  draft: 'Черновик',
  agreed: 'Согласовано',
  notified: 'Документы отправлены',
  signed: 'Документы подписаны',
  success: 'Завершён',
}

const revisionStatusVariant: Record<
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

function AmountChange({
  previousAmounts,
  newAmounts,
}: {
  previousAmounts: string[]
  newAmounts: string[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
      <div className="flex flex-col gap-0.5">
        {previousAmounts.map((amt, i) => (
          <span
            key={i}
            className="font-mono text-muted-foreground line-through"
          >
            {formatAmount(amt)} ₽
          </span>
        ))}
      </div>
      <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
      <div className="flex flex-col gap-0.5">
        {newAmounts.map((amt, i) => {
          const diff = Number(amt) - Number(previousAmounts[i] ?? '0')
          const colorClass =
            diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : ''
          return (
            <span key={i} className={`font-mono font-medium ${colorClass}`}>
              {formatAmount(amt)} ₽
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function ClientDetailPage({ client }: { client: ClientDetail }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const revisionGroups = new Map<
    string,
    (typeof client.activeRevisions)[number][]
  >()
  for (const r of client.activeRevisions) {
    const list = revisionGroups.get(r.revisionId) ?? []
    list.push(r)
    revisionGroups.set(r.revisionId, list)
  }

  const activities: PendingActivity[] = [...revisionGroups.values()].map(
    (items) => {
      const first = items[0]
      const counterpartyNames = [
        ...new Set(items.map((i) => i.counterpartyName)),
      ].join(', ')
      return {
        id: first.revisionId,
        type: 'price_revision',
        typeLabel: 'Ревизия цен',
        title: first.revisionName,
        subtitle: counterpartyNames,
        status: first.status,
        statusLabel: revisionStatusLabel[first.status] ?? first.status,
        statusVariant: revisionStatusVariant[first.status] ?? 'secondary',
        link: { to: '/price-revisions/$id', params: { id: first.revisionId } },
      }
    },
  )

  const historyEntries: HistoryEntry[] = client.amountHistory.map((h) => ({
    id: h.id,
    title: h.contractName,
    actor: h.changedByName,
    date: h.changedAt,
    description: (
      <AmountChange
        previousAmounts={h.previousAmounts}
        newAmounts={h.newAmounts}
      />
    ),
  }))

  const handleBlockedServicesUpdated = async () => {
    await queryClient.invalidateQueries({
      queryKey: clientDetailQueryKey(client.id),
    })
    await queryClient.invalidateQueries({ queryKey: clientsQueryKey })
    await router.invalidate()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ClientInfoCard client={client} />
        <ClientCounterparties counterparties={client.counterparties} />
      </div>

      {client.blockedServices.length > 0 && (
        <BlockedServicesCard
          services={client.blockedServices}
          title="Заблокированные услуги"
          showVmList
          onUpdated={handleBlockedServicesUpdated}
        />
      )}

      <ClientProxmoxResources resources={client.proxmoxResources} />
      <ClientPendingPayments payments={client.pendingPayments} />
      <ClientContracts
        clientId={client.id}
        counterparties={client.counterparties}
        contracts={client.contracts}
      />
      <ClientPendingActivities activities={activities} />
      <ClientHistoryLog entries={historyEntries} />
    </div>
  )
}
