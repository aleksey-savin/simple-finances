import { CheckCircle2 } from 'lucide-react'

import { Card } from '#/components/ui/card'
import { decodeHtmlEntities } from '#/lib/html-entities'
import { cn } from '#/lib/utils'

type AccountSelectionAccount = {
  id: string
  name: string
  bankNameInitials: string | null
  balance: string
  lastImportedAt: Date | string | null
}

export function AccountSelection({
  accounts,
  selectedAccountId,
  onAccountChange,
}: {
  accounts: AccountSelectionAccount[]
  selectedAccountId: string
  onAccountChange: (value: string) => void
}) {
  return (
    <Card className="w-full p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Выбор расчётного счёта</h1>
          <p className="text-sm text-muted-foreground">
            Выберите счёт, для которого нужно загрузить и просмотреть импорт.
          </p>
        </div>

        <div className="flex flex-wrap gap-6">
          {accounts.map((account) => {
            const isSelected = account.id === selectedAccountId

            return (
              <button
                key={account.id}
                type="button"
                onClick={() => onAccountChange(account.id)}
                className={cn(
                  'border bg-background p-4 text-left transition-colors outline-none min-w-3xs',
                  'hover:border-primary/50 hover:bg-accent/30',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isSelected &&
                    'border-primary bg-primary/5 ring-2 ring-primary/20',
                )}
                aria-pressed={isSelected}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold leading-5">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {decodeHtmlEntities(account.bankNameInitials) ?? '-'}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="mt-0.5 size-5 text-primary" />
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatMoney(account.balance)} ₽
                    </p>
                  </div>
                  <div className="bg-muted/40 text-sm">
                    <span className="text-muted-foreground">
                      Последний импорт:{' '}
                    </span>
                    <span className="font-medium text-foreground">
                      {formatLastImportedAt(account.lastImportedAt)}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function formatMoney(value: string) {
  return Number(value).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatLastImportedAt(value: Date | string | null) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
