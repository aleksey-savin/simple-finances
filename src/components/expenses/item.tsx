import { addExpense, archiveExpense } from './actions'
import { DeleteExpense } from './delete'
import { EditExpense } from './edit'
import { TransactionItem } from '#/components/transactions/item'
import { buildDuplicateTransactionDates } from '#/components/transactions/duplicate'
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
  categories: {
    id: string
    name: string
    useForExpenses: boolean
    useForIncome: boolean
    isShared: boolean
  }[]
  accounts: { id: string; name: string }[]
  counterparties?: { id: string; name: string }[]
}) => (
  <TransactionItem
    item={item}
    sharedAccountIds={sharedAccountIds}
    togglePaid={togglePaid}
    archiveFn={archiveExpense}
    duplicateFn={() =>
      addExpense({
        data: {
          amount: Number(item.amount),
          description: item.description,
          categoryId: item.category.id,
          currentAccountId: item.currentAccount.id,
          counterpartyId: item.counterparty?.id ?? undefined,
          ...buildDuplicateTransactionDates(item),
        },
      })
    }
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
