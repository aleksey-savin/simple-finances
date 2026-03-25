import { authClient } from 'utils/auth-client'

import { addIncome, archiveIncome } from './actions'
import { DeleteIncome } from './delete'
import { EditIncome } from './edit'
import { TransactionItem } from '#/components/transactions/item'
import { buildDuplicateTransactionDates } from '#/components/transactions/duplicate'
import type { Income } from '#/types'

export const IncomeItem = ({
  item,
  sharedAccountIds,
  togglePaid,
  categories,
  accounts,
  counterparties = [],
}: {
  item: Income
  sharedAccountIds: Set<string>
  togglePaid: any
  categories: { id: string; name: string; useForIncome: boolean }[]
  accounts: { id: string; name: string }[]
  counterparties?: { id: string; name: string }[]
}) => {
  const { data: session } = authClient.useSession()
  const canEditDelete = item.createdBy === session?.user?.id

  return (
    <TransactionItem
      item={item}
      sharedAccountIds={sharedAccountIds}
      togglePaid={togglePaid}
      archiveFn={archiveIncome}
      duplicateFn={() =>
        addIncome({
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
      canEditDelete={canEditDelete}
      renderEdit={(open, onOpenChange) => (
        <EditIncome
          item={item}
          categories={categories}
          accounts={accounts}
          counterparties={counterparties}
          open={open}
          onOpenChange={onOpenChange}
        />
      )}
      renderDelete={(open, onOpenChange) => (
        <DeleteIncome
          incomeId={item.id}
          open={open}
          onOpenChange={onOpenChange}
        />
      )}
    />
  )
}
