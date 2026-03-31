import { FileUp, Loader2 } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Field, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

export function BankImportHeader({
  accounts,
  selectedAccountId,
  isImporting,
  onAccountChange,
  onFileChange,
  onImport,
}: {
  accounts: { id: string; name: string }[]
  selectedAccountId: string
  isImporting: boolean
  onAccountChange: (value: string) => void
  onFileChange: (value: File | null) => void
  onImport: () => void
}) {
  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Импорт банковской выписки</h1>
        <p className="text-sm text-muted-foreground">
          Поддерживается формат 1С Client Bank Exchange. После загрузки можно
          разнести строки по существующим доходам и расходам или создать новые.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-end">
        <Field>
          <FieldLabel htmlFor="bank-import-account">Расчётный счёт</FieldLabel>
          <Select
            value={selectedAccountId || undefined}
            onValueChange={onAccountChange}
          >
            <SelectTrigger id="bank-import-account">
              <SelectValue placeholder="Выберите счёт" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="bank-import-file">Файл выписки</FieldLabel>
          <Input
            id="bank-import-file"
            type="file"
            accept=".txt"
            disabled={!selectedAccountId}
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
        </Field>

        <Button
          className="gap-2"
          onClick={onImport}
          disabled={isImporting || accounts.length === 0 || !selectedAccountId}
        >
          {isImporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileUp className="size-4" />
          )}
          Загрузить
        </Button>
      </div>
    </Card>
  )
}
