import type { ColumnDef } from '@tanstack/react-table'
import type { PriceRevisionItemRow } from '@/types'
import { Switch } from '#/components/ui/switch'
import { formatCurrency } from './utils'
import { ProposedAmountsCell } from './proposed-amount-cell'
import { RevisionItemStatusActionButton } from './status-action-button'
import { updateRevisionItem, priceRevisionQueryKey } from './actions'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(new Date(date))
}

function IncludedSwitch({
  itemId,
  revisionId,
  included,
}: {
  itemId: string
  revisionId: string
  included: boolean
}) {
  const queryClient = useQueryClient()

  async function handleChange(checked: boolean) {
    try {
      await updateRevisionItem({ data: { id: itemId, included: checked } })
      queryClient.invalidateQueries({
        queryKey: priceRevisionQueryKey(revisionId),
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  return <Switch checked={included} onCheckedChange={handleChange} />
}

export function buildRevisionColumns(
  revisionId: string,
  isCompleted = false,
): ColumnDef<PriceRevisionItemRow>[] {
  return [
    ...(!isCompleted
      ? [
          {
            accessorKey: 'included',
            header: '',
            cell: ({ row }: any) => (
              <IncludedSwitch
                itemId={row.original.id}
                revisionId={revisionId}
                included={row.original.included}
              />
            ),
          } satisfies ColumnDef<PriceRevisionItemRow>,
        ]
      : []),
    {
      accessorKey: 'contract.name',
      header: 'Договор',
      cell: ({ row }) => (
        <div className={row.original.included ? '' : 'opacity-40'}>
          <div className="font-medium">{row.original.contract.name}</div>
          {row.original.contract.number && (
            <div className="text-xs text-muted-foreground">
              №{row.original.contract.number}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'contract.counterparty.name',
      header: 'Контрагент',
      cell: ({ row }) => (
        <span className={row.original.included ? '' : 'opacity-40'}>
          {row.original.contract.counterparty.name}
        </span>
      ),
    },
    {
      accessorKey: 'currentAmounts',
      header: 'Текущие суммы',
      cell: ({ row }) => (
        <div
          className={`flex flex-col items-start gap-0.5 ${row.original.included ? '' : 'opacity-40'}`}
        >
          {row.original.currentAmounts.map((amt, i) => (
            <span key={i} className="font-mono text-sm tabular-nums">
              {formatCurrency(Number(amt))}
            </span>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'proposedAmounts',
      header: 'Предложенные суммы',
      cell: ({ row }) => {
        const { currentAmounts, proposedAmounts } = row.original
        const readOnly = isCompleted || !row.original.included
        if (readOnly) {
          return (
            <div
              className={`flex flex-col gap-0.5 ${!row.original.included ? 'opacity-40' : ''}`}
            >
              {proposedAmounts.map((amt, i) => {
                const diff = Number(amt) - Number(currentAmounts[i] ?? '0')
                const colorClass =
                  diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : ''
                return (
                  <span
                    key={i}
                    className={`font-mono text-sm tabular-nums ${colorClass}`}
                  >
                    {formatCurrency(Number(amt))}
                  </span>
                )
              })}
            </div>
          )
        }
        return (
          <ProposedAmountsCell
            itemId={row.original.id}
            revisionId={revisionId}
            currentAmounts={currentAmounts}
            proposedAmounts={proposedAmounts}
          />
        )
      },
    },
    {
      accessorKey: 'timestamps',
      header: 'Хронология',
      cell: ({ row }) => (
        <div className="flex flex-col">
          {row.original.notifiedAt && (
            <span className="text-xs text-muted-foreground tabular-nums">
              Уведомлён: {formatDate(row.original.notifiedAt)}
            </span>
          )}
          {row.original.signedAt && (
            <span className="text-xs text-muted-foreground tabular-nums">
              Подписан: {formatDate(row.original.signedAt)}
            </span>
          )}
          {row.original.agreedAt && (
            <span className="text-xs text-muted-foreground tabular-nums">
              Подписан: {formatDate(row.original.signedAt)}
            </span>
          )}
          {row.original.completedAt && (
            <span className="text-xs text-muted-foreground tabular-nums">
              Завершён: {formatDate(row.original.completedAt)}
            </span>
          )}
        </div>
      ),
    },
    ...(!isCompleted
      ? [
          {
            id: 'action',
            header: '',
            cell: ({ row }: any) =>
              row.original.included ? (
                <RevisionItemStatusActionButton
                  itemId={row.original.id}
                  status={row.original.status}
                  revisionId={revisionId}
                />
              ) : null,
          } satisfies ColumnDef<PriceRevisionItemRow>,
        ]
      : []),
  ]
}
