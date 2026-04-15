import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Field, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Combobox, type ComboboxOption } from '#/components/ui/combobox'
import type { ImportedBankTransactionView } from '#/components/bank-import/actions'
import { getBankImportEntityLabel } from '#/components/bank-import/labels'
import { Link2, Loader2, Minus } from 'lucide-react'

export type BankImportAllocationDraft = {
  invoiceId: string
  amount: string
}

export function BankImportAttachDialog({
  open,
  target,
  allocationDrafts,
  isSubmitting,
  onOpenChange,
  onAllocationDraftsChange,
  onSubmit,
}: {
  open: boolean
  target: ImportedBankTransactionView | null
  allocationDrafts: BankImportAllocationDraft[]
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onAllocationDraftsChange: (value: BankImportAllocationDraft[]) => void
  onSubmit: () => void
}) {
  const candidateOptions: ComboboxOption[] =
    target?.suggestedInvoices.map((candidate) => ({
      value: candidate.id,
      label: candidate.description,
      description: [
        [
          candidate.counterpartyName ?? 'Без контрагента',
          `Остаток ${formatMoney(candidate.outstandingAmount)} ₽`,
        ].join(' · '),
        candidate.reasons.length > 0 ? candidate.reasons.join(', ') : '',
      ]
        .filter(Boolean)
        .join('\n'),
      badge: candidate.score > 0 ? String(candidate.score) : undefined,
      keywords: [String(candidate.score)],
    })) ?? []

  const allocated = allocationDrafts.reduce(
    (sum, d) => sum + (parseFloat(d.amount) || 0),
    0,
  )
  const remaining = (target?.remainingAmount ?? 0) - allocated
  const isOverAllocated = remaining < -0.001

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Привязка банковской транзакции</DialogTitle>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            {target?.counterpartyName && (
              <span
                className="max-w-xs truncate font-medium"
                title={target.counterpartyName}
              >
                {target.counterpartyName}
              </span>
            )}
            <span className="text-muted-foreground">
              Сумма:{' '}
              <span className="font-medium text-foreground">
                {formatMoney(target?.amount ?? 0)} ₽
              </span>
            </span>
            <span
              className={`font-medium ${
                isOverAllocated
                  ? 'text-destructive'
                  : remaining > 0.001
                    ? 'text-warning'
                    : 'text-success'
              }`}
            >
              {remaining > 0.001
                ? `Осталось: ${formatMoney(remaining)} ₽`
                : isOverAllocated
                  ? `Превышение: ${formatMoney(Math.abs(remaining))} ₽`
                  : 'Полностью распределено'}
            </span>
          </div>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
          {allocationDrafts.map((draft, index) => {
            const selected = target?.suggestedInvoices.find(
              (inv) => inv.id === draft.invoiceId,
            )

            return (
              <div key={index} className="border bg-muted/30 p-3">
                <div className="grid items-end gap-3 md:grid-cols-[1fr,8rem,2rem]">
                  <Field className="min-w-0">
                    <FieldLabel>
                      {getBankImportEntityLabel(target?.direction ?? 'credit')}
                    </FieldLabel>
                    <Combobox
                      options={candidateOptions}
                      value={draft.invoiceId}
                      onValueChange={(value) => {
                        const candidate = target?.suggestedInvoices.find(
                          (item) => item.id === value,
                        )
                        onAllocationDraftsChange(
                          allocationDrafts.map((item, itemIndex) => {
                            if (itemIndex !== index) return item
                            return {
                              ...item,
                              invoiceId: value,
                              amount: candidate
                                ? Math.min(
                                    candidate.outstandingAmount,
                                    target?.remainingAmount ?? 0,
                                  ).toFixed(2)
                                : item.amount,
                            }
                          }),
                        )
                      }}
                      placeholder={`Выберите ${getBankImportEntityLabel(target?.direction ?? 'credit')}`}
                      emptyText={`Подходящие ${getBankImportEntityLabel(target?.direction ?? 'credit', 'plural')} не найдены.`}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Сумма, ₽</FieldLabel>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={draft.amount}
                      onChange={(event) =>
                        onAllocationDraftsChange(
                          allocationDrafts.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, amount: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 self-end text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      onAllocationDraftsChange(
                        allocationDrafts.length === 1
                          ? allocationDrafts
                          : allocationDrafts.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                      )
                    }
                    disabled={allocationDrafts.length === 1}
                  >
                    <Minus className="size-4" />
                  </Button>
                </div>

                {selected && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 border-t pt-2 text-xs text-muted-foreground">
                    {selected.counterpartyName && (
                      <span>{selected.counterpartyName}</span>
                    )}
                    <span>Сумма: {formatMoney(selected.amount)} ₽</span>
                    {selected.settledAmount > 0 && (
                      <span>
                        Оплачено: {formatMoney(selected.settledAmount)} ₽
                      </span>
                    )}
                    <span>
                      Остаток: {formatMoney(selected.outstandingAmount)} ₽
                    </span>
                    {selected.categoryName && (
                      <span>{selected.categoryName}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <Button
            type="button"
            variant="outline"
            className="w-fit gap-2"
            onClick={() =>
              onAllocationDraftsChange([
                ...allocationDrafts,
                { invoiceId: '', amount: '' },
              ])
            }
          >
            <Link2 className="size-4" />
            Добавить{' '}
            {target ? getBankImportEntityLabel(target.direction) : 'запись'}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button className="gap-2" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatMoney(value: number) {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
