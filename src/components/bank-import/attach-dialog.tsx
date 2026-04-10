import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Field, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  Combobox,
  type ComboboxOption,
} from '#/components/ui/combobox'
import type { ImportedBankTransactionView } from '#/components/bank-import/actions'
import { getBankImportEntityLabel } from '#/components/bank-import/labels'
import { Link2, Loader2 } from 'lucide-react'

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
        candidate.counterpartyName ?? 'Без контрагента',
        `Остаток ${formatMoney(candidate.outstandingAmount)} ₽`,
        candidate.reasons.length > 0 ? candidate.reasons.join(', ') : '',
      ]
        .filter(Boolean)
        .join(' · '),
      keywords: [candidate.score],
    })) ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Привязка банковской транзакции</DialogTitle>
          <DialogDescription>
            Разнесите сумму {formatMoney(target?.remainingAmount ?? 0)} ₽.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
          {allocationDrafts.map((draft, index) => (
            <div
              key={index}
              className="grid gap-3 border p-3 md:grid-cols-[1.6fr,0.7fr,auto]"
            >
              <Field>
                <FieldLabel>Наименование</FieldLabel>
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
                  placeholder={`Выберите ${
                    target ? getBankImportEntityLabel(target.direction) : 'запись'
                  }`}
                  emptyText={`Подходящие ${
                    target
                      ? getBankImportEntityLabel(target.direction, 'plural')
                      : 'записи'
                  } для рекомендации не найдены.`}
                />
              </Field>

              <Field>
                <FieldLabel>Сумма</FieldLabel>
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

              <div className="flex items-end">
                <Button
                  variant="ghost"
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
                  Удалить
                </Button>
              </div>
            </div>
          ))}

          <Button
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
            Добавить ещё{' '}
            {target ? getBankImportEntityLabel(target.direction) : 'запись'}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button className="gap-2" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Сохранить распределение
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
