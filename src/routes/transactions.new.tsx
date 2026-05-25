import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { AddInvoiceForm } from '#/components/invoices'
import { TransferForm } from '#/components/transactions/transfer-form'
import { ResponsiveDialog } from '#/components/ui/responsive-dialog'
import { Field, FieldLabel } from '#/components/ui/field'
import { Switch } from '#/components/ui/switch'

const transactionsRoute = getRouteApi('/transactions')

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/transactions/new')({
  component: NewTransactionPage,
})

// ─── Component ────────────────────────────────────────────────────────────────

function NewTransactionPage() {
  const router = useRouter()
  const { categories, accounts, counterparties } =
    transactionsRoute.useLoaderData()
  const transactionsSearch = transactionsRoute.useSearch()

  const [kind, setKind] = useState<'payable' | 'receivable' | 'transfer'>(
    'payable',
  )
  const [entryMode, setEntryMode] = useState<'full' | 'quick'>('full')

  const handleClose = () =>
    router.navigate({ to: '/transactions', search: transactionsSearch })

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && handleClose()}
      title="Новая операция"
      mobileFullHeight
    >
      <div className="flex flex-col-reverse gap-4 mb-4 shrink-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex border overflow-hidden divide-x text-sm w-fit">
          {(['payable', 'receivable', 'transfer'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`px-4 py-2 transition-colors ${
                kind === value
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {value === 'payable'
                ? 'Расход'
                : value === 'receivable'
                  ? 'Доход'
                  : 'Перевод'}
            </button>
          ))}
        </div>

        <Field orientation="horizontal" className="w-fit">
          <FieldLabel htmlFor="entry-mode-quick">Быстрый ввод</FieldLabel>
          <Switch
            id="entry-mode-quick"
            checked={entryMode === 'quick'}
            onCheckedChange={(checked) =>
              setEntryMode(checked ? 'quick' : 'full')
            }
          />
        </Field>
      </div>

      <div className={kind === 'transfer' ? 'hidden' : 'contents'}>
        <AddInvoiceForm
          defaultKind={kind === 'transfer' ? 'payable' : kind}
          onDone={handleClose}
          categories={categories}
          accounts={accounts}
          counterparties={counterparties}
          entryMode={entryMode}
          asDialog
        />
      </div>
      <div className={kind === 'transfer' ? 'contents' : 'hidden'}>
        <TransferForm accounts={accounts} onDone={handleClose} />
      </div>
    </ResponsiveDialog>
  )
}
