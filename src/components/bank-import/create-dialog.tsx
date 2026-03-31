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
import { Loader2 } from 'lucide-react'

export type BankImportCreateDraft = {
  amount: string
  description: string
  categoryId: string
  counterpartyId: string
}

export function BankImportCreateDialog({
  open,
  target,
  draft,
  categories,
  counterparties,
  isSubmitting,
  onOpenChange,
  onDraftChange,
  onSubmit,
}: {
  open: boolean
  target: ImportedBankTransactionView | null
  draft: BankImportCreateDraft
  categories: {
    id: string
    name: string
    useForIncome: boolean
    useForExpenses: boolean
  }[]
  counterparties: { id: string; name: string; tin: string | null }[]
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onDraftChange: (value: BankImportCreateDraft) => void
  onSubmit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Создать {target ? getBankImportEntityLabel(target.direction) : 'запись'}{' '}
            из банковской транзакции
          </DialogTitle>
          <DialogDescription>
            Новый {target ? getBankImportEntityLabel(target.direction) : 'запись'}{' '}
            будет создан на выбранную сумму и сразу привязан к транзакции.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Field>
            <FieldLabel>Сумма</FieldLabel>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={draft.amount}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  amount: event.target.value,
                })
              }
            />
          </Field>

          <Field>
            <FieldLabel>Описание</FieldLabel>
            <Input
              value={draft.description}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  description: event.target.value,
                })
              }
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Категория</FieldLabel>
              <Select
                value={draft.categoryId}
                onValueChange={(value) =>
                  onDraftChange({
                    ...draft,
                    categoryId: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((category) =>
                      target?.direction === 'credit'
                        ? category.useForIncome
                        : category.useForExpenses,
                    )
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Контрагент</FieldLabel>
              <Select
                value={draft.counterpartyId || '__none__'}
                onValueChange={(value) =>
                  onDraftChange({
                    ...draft,
                    counterpartyId: value === '__none__' ? '' : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Не выбран" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Без контрагента</SelectItem>
                  {counterparties.map((counterparty) => (
                    <SelectItem key={counterparty.id} value={counterparty.id}>
                      {counterparty.name}
                      {counterparty.tin ? ` · ${counterparty.tin}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button className="gap-2" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Создать {target ? getBankImportEntityLabel(target.direction) : 'запись'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
