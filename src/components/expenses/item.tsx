import { archiveExpense } from './actions'
import { DeleteExpense } from './delete'
import { EditExpense } from './edit'
import { TransactionItem } from '#/components/transactions/item'
import type { Expense } from '#/types'

export const ExpenseItem = ({
  item,
  sharedAccountIds,
  togglePaid,
  categories,
  accounts,
  counterparties = [],
}: {
  item: Expense
  sharedAccountIds: Set<string>
  togglePaid: any
  categories: { id: string; name: string; useForExpenses: boolean }[]
  accounts: { id: string; name: string }[]
  counterparties?: { id: string; name: string }[]
}) => (
  <TransactionItem
    item={item}
    sharedAccountIds={sharedAccountIds}
    togglePaid={togglePaid}
    archiveFn={archiveExpense}
    renderEdit={(open, onOpenChange) => (
      <EditExpense
        item={item}
        categories={categories}
        accounts={accounts}
        counterparties={counterparties}
        open={open}
        onOpenChange={onOpenChange}
      />
    )}
    renderDelete={(open, onOpenChange) => (
      <DeleteExpense
        expenseId={item.id}
        open={open}
        onOpenChange={onOpenChange}
      />
    )}
  />
)
