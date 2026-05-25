import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { AddInvoiceForm } from '#/components/invoices'
import { TransferForm } from '#/components/transactions/transfer-form'
import { ResponsiveDialog } from '#/components/ui/responsive-dialog'

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

  const handleClose = () =>
    router.navigate({ to: '/transactions', search: transactionsSearch })

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && handleClose()}
      title="Новая операция"
    >
      {/* Type toggle */}
      <div className="flex border overflow-hidden divide-x text-sm mb-4 shrink-0">
        {(['payable', 'receivable', 'transfer'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={`flex-1 px-4 py-2 transition-colors ${
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

      <div className={kind === 'transfer' ? 'hidden' : 'contents'}>
        <AddInvoiceForm
          defaultKind={kind === 'transfer' ? 'payable' : kind}
          onDone={handleClose}
          categories={categories}
          accounts={accounts}
          counterparties={counterparties}
          asDialog
        />
      </div>
      <div className={kind === 'transfer' ? 'contents' : 'hidden'}>
        <TransferForm accounts={accounts} onDone={handleClose} />
      </div>
    </ResponsiveDialog>
  )
}
