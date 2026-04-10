import { FileUp, Loader2 } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'

export function BankImport({
  accounts,
  selectedAccountId,
  isImporting,
  onFileChange,
  onImport,
}: {
  accounts: { id: string; name: string }[]
  selectedAccountId: string
  isImporting: boolean
  onFileChange: (value: File | null) => void
  onImport: () => void
}) {
  return (
    <Card className="flex flex-col gap-4 p-4 w-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Импорт</h1>
      </div>

      <div className="flex items-center gap-2">
        <Field>
          <Input
            id="bank-import-file"
            className="w-auto"
            placeholder="Загрузите файл выгрузки"
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
