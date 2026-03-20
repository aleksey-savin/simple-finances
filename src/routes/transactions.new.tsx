import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { ResponsiveDialog } from '#/components/ui/responsive-dialog'
import { ExpenseForm } from '#/components/expenses'
import { IncomeForm } from '#/components/income'

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

  const [type, setType] = useState<'expense' | 'income'>('expense')

  const handleClose = () => router.navigate({ to: '/transactions' })

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && handleClose()}
      title="Новая транзакция"
    >
      {/* Type toggle */}
      <div className="flex border overflow-hidden divide-x text-sm mb-4 shrink-0">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 px-4 py-2 transition-colors ${
              type === t
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {t === 'expense' ? 'Расход' : 'Доход'}
          </button>
        ))}
      </div>

      {type === 'expense' ? (
        <ExpenseForm
          onDone={handleClose}
          categories={categories}
          accounts={accounts}
          counterparties={counterparties}
          asDialog
        />
      ) : (
        <IncomeForm
          onDone={handleClose}
          categories={categories}
          accounts={accounts}
          counterparties={counterparties}
          asDialog
        />
      )}
    </ResponsiveDialog>
  )
}
