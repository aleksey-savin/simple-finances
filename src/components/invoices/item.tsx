import { authClient } from 'utils/auth-client'

import type { Invoice } from '#/types'

import { addInvoice, archiveInvoice } from './actions'
import { DeleteInvoice } from './delete'
import { buildDuplicateInvoiceDates } from './duplicate'
import { EditInvoice } from './edit'
import { InvoiceListItem } from './list-item'

export function InvoiceItem({
  item,
  sharedAccountIds,
  togglePaid,
  categories,
  accounts,
  counterparties = [],
}: {
  item: Invoice
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
  counterparties?: { id: string; name: string; linkedUserId?: string | null }[]
}) {
  const { data: session } = authClient.useSession()
  const canEditDelete =
    item.kind === 'payable' || item.createdBy === session?.user?.id

  return (
    <InvoiceListItem
      item={item}
      sharedAccountIds={sharedAccountIds}
      togglePaid={togglePaid}
      archiveFn={archiveInvoice}
      duplicateFn={() =>
        addInvoice({
          data: {
            kind: item.kind,
            amount: Number(item.amount),
            description: item.description,
            categoryId: item.category.id,
            currentAccountId: item.currentAccount.id,
            counterpartyId: item.counterparty?.id ?? undefined,
            ...buildDuplicateInvoiceDates(item),
          },
        })
      }
      canEditDelete={canEditDelete}
      renderEdit={(open, onOpenChange) => (
        <EditInvoice
          item={item}
          categories={categories}
          accounts={accounts}
          counterparties={counterparties}
          open={open}
          onOpenChange={onOpenChange}
        />
      )}
      renderDelete={(open, onOpenChange) => (
        <DeleteInvoice
          entityId={item.id}
          kind={item.kind}
          open={open}
          onOpenChange={onOpenChange}
        />
      )}
    />
  )
}
