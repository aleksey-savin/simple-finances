import { Badge } from '#/components/ui/badge'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
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
                <Select
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
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={`Выберите ${
                        target
                          ? getBankImportEntityLabel(target.direction)
                          : 'запись'
                      }`}
                    >
                      {draft.invoiceId
                        ? (target?.suggestedInvoices.find(
                            (item) => item.id === draft.invoiceId,
                          )?.description ?? '')
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {target?.suggestedInvoices.length === 0 && (
                      <div className="px-2 py-3 text-sm text-muted-foreground">
                        Подходящие{' '}
                        {target
                          ? getBankImportEntityLabel(target.direction, 'plural')
                          : 'записи'}{' '}
                        для рекомендации не найдены.
                      </div>
                    )}
                    {target?.suggestedInvoices.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        <div className="flex min-w-0 flex-col gap-1 py-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">
                              {candidate.description}
                            </span>
                            <Badge variant="outline" className="shrink-0">
                              {candidate.score}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {candidate.counterpartyName ?? 'Без контрагента'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Остаток {formatMoney(candidate.outstandingAmount)} ₽
                          </span>
                          {candidate.reasons.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {candidate.reasons.join(', ')}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
