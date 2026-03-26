import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { AddInvoiceForm } from '#/components/invoices'
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

  const [kind, setKind] = useState<'payable' | 'receivable'>('payable')

  const handleClose = () => router.navigate({ to: '/transactions' })

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && handleClose()}
      title="Новая транзакция"
    >
      {/* Type toggle */}
      <div className="flex border overflow-hidden divide-x text-sm mb-4 shrink-0">
        {(['payable', 'receivable'] as const).map((value) => (
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
            {value === 'payable' ? 'Расход' : 'Доход'}
          </button>
        ))}
      </div>

      <AddInvoiceForm
        key={kind}
        defaultKind={kind}
        onDone={handleClose}
        categories={categories}
        accounts={accounts}
        counterparties={counterparties}
        asDialog
      />
    </ResponsiveDialog>
  )
}
