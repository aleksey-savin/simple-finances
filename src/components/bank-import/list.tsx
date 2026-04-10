import { Fragment, useMemo } from 'react'
import { CheckCircle2, Plus, Split, Trash2 } from 'lucide-react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { useIsMobile } from '#/hooks/use-mobile'

import type { ImportedBankTransactionView } from '#/components/bank-import/actions'
import { getBankImportEntityLabel } from '#/components/bank-import/labels'
import { BankTransactionSettlementsDetails } from '#/components/bank-import/settlements-details'

export function BankImportList({
  rows,
  onAttach,
  onCreate,
  onDelete,
}: {
  rows: ImportedBankTransactionView[]
  onAttach: (row: ImportedBankTransactionView) => void
  onCreate: (row: ImportedBankTransactionView) => void
  onDelete: (row: ImportedBankTransactionView) => void
}) {
  const isMobile = useIsMobile()
  const desktopGroups = useMemo(() => {
    const groups = new Map<string, ImportedBankTransactionView[]>()

    for (const row of rows) {
      const key = row.bookedAt.slice(0, 10)
      const items = groups.get(key)

      if (items) {
        items.push(row)
      } else {
        groups.set(key, [row])
      }
    }

    return Array.from(groups.entries()).map(([dateKey, items]) => ({
      dateKey,
      label: formatGroupDateLabel(dateKey),
      items,
    }))
  }, [rows])

  if (isMobile) {
    return (
      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <Card key={row.id} className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={row.status} />
                  <Badge variant="secondary">{formatDate(row.bookedAt)}</Badge>
                  <Badge variant="secondary">{row.currentAccount.name}</Badge>
                  {row.documentNumber && (
                    <Badge variant="outline">№ {row.documentNumber}</Badge>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-base font-medium leading-6">
                    {row.description ?? 'Без назначения платежа'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {row.counterpartyName ?? 'Контрагент не определён'}
                    {row.counterpartyTin ? ` · ИНН ${row.counterpartyTin}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-1 lg:items-end">
                <div
                  className={`text-xl font-semibold tabular-nums ${
                    row.direction === 'credit' ? 'text-success' : ''
                  }`}
                >
                  {row.direction === 'credit' ? '+' : '−'}
                  {formatMoney(row.amount)} ₽
                </div>
                <p className="text-sm text-muted-foreground">
                  Разнесено {formatMoney(row.matchedAmount)} ₽ из{' '}
                  {formatMoney(row.amount)} ₽
                </p>
                <p className="text-sm text-muted-foreground">
                  Остаток {formatMoney(row.remainingAmount)} ₽
                </p>
              </div>
            </div>

            {row.settlements.length > 0 && (
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3">
                <p className="text-sm font-medium">Текущие привязки</p>
                <div className="flex flex-col gap-2">
                  {row.settlements.map((settlement) => (
                    <div
                      key={settlement.id}
                      className="flex flex-col gap-1 rounded-md bg-background p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {settlement.invoiceDescription}
                        </p>
                        <p className="text-muted-foreground">
                          {settlement.counterpartyName ?? 'Без контрагента'} ·{' '}
                          {settlement.invoiceStatus}
                        </p>
                      </div>
                      <div className="tabular-nums font-medium">
                        {formatMoney(settlement.amount)} ₽
                      </div>
                    </div>
                  ))}
                </div>
                <BankTransactionSettlementsDetails row={row} trigger="button" />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => onAttach(row)}
                disabled={
                  row.remainingAmount <= 0 || row.suggestedInvoices.length === 0
                }
              >
                <Split className="size-4" />
                Привязать к {getBankImportEntityLabel(row.direction)}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => onCreate(row)}
                disabled={row.remainingAmount <= 0}
              >
                <Plus className="size-4" />
                Создать {getBankImportEntityLabel(row.direction)}
              </Button>
              {row.settlements.length === 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(row)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <Card className="hidden sm:block p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold">Операция</TableHead>
            <TableHead className="w-72 font-bold">Контрагент</TableHead>
            <TableHead className="w-72 font-bold">Статус</TableHead>
            <TableHead className="w-44 text-right font-bold">Сумма</TableHead>
            <TableHead className="w-44 text-right font-bold"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {desktopGroups.map((group) => (
            <Fragment key={group.dateKey}>
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="bg-muted/30 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase text-center"
                >
                  {group.label}
                </TableCell>
              </TableRow>
              {group.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="min-w-xs whitespace-normal">
                    <div className="flex flex-col gap-1">
                      <span>{row.description ?? 'Без назначения платежа'}</span>
                      <BankTransactionSettlementsDetails row={row} />
                    </div>
                  </TableCell>

                  <TableCell className="max-w-0">
                    <div className="flex flex-col gap-1">
                      <span className="whitespace-normal wrap-break-word">
                        {row.counterpartyName ?? 'Контрагент не определён'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.counterpartyTin
                          ? `ИНН ${row.counterpartyTin}`
                          : 'ИНН не найден'}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="max-w-0 flex flex-col items-start gap-2">
                    <div className="flex flex-col items-start gap-2">
                      <StatusBadge status={row.status} />
                      {row.status !== 'matched' && (
                        <div className="text-xs text-muted-foreground">
                          <div>
                            Разнесено {formatMoney(row.matchedAmount)} ₽ из{' '}
                            {formatMoney(row.amount)} ₽
                          </div>
                          <div>
                            Остаток {formatMoney(row.remainingAmount)} ₽
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="max-w-0 text-right">
                    <div
                      className={`font-semibold tabular-nums ${
                        row.direction === 'credit' && 'text-success'
                      }`}
                    >
                      {row.direction === 'credit' ? '+' : '−'}
                      {formatMoney(row.amount)} ₽
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAttach(row)}
                        disabled={
                          row.remainingAmount <= 0 ||
                          row.suggestedInvoices.length === 0
                        }
                      >
                        <Split className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCreate(row)}
                        disabled={row.remainingAmount <= 0}
                      >
                        <Plus className="size-4" />
                      </Button>
                      {row.settlements.length === 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function StatusBadge({
  status,
}: {
  status: ImportedBankTransactionView['status']
}) {
  if (status === 'matched') {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="size-3.5" />
        Полностью разнесено
      </Badge>
    )
  }

  if (status === 'partial') {
    return <Badge className="bg-warning text-white">Частично разнесено</Badge>
  }

  return <Badge variant="outline">Без привязки</Badge>
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatGroupDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${dateKey}T00:00:00`))
}

function formatMoney(value: number) {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
