import { Card } from '#/components/ui/card'
import { Field } from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

export function AccountSelection({
  accounts,
  selectedAccountId,
  onAccountChange,
}: {
  accounts: { id: string; name: string }[]
  selectedAccountId: string
  onAccountChange: (value: string) => void
}) {
  return (
    <Card className="flex flex-col gap-6 p-6 w-full">
      <h1 className="text-xl font-semibold">Выбор расчётного счёта</h1>
      <div className="flex">
        <Field>
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
      </div>
    </Card>
  )
}
