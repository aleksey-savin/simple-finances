import { authClient } from 'utils/auth-client'

import type { Invoice } from '#/types'
import type { TagItem } from '../ui/tag-picker'

import { addInvoice, archiveInvoice } from './actions'
import { DeleteInvoice } from './delete'
import { buildDuplicateInvoiceDates } from './duplicate'
import { EditInvoice } from './edit'
import { InvoiceListItem } from './list-item'

export function InvoiceItem({
  item,
  layout = 'mobile',
  sharedAccountIds,
  togglePaid,
  categories,
  accounts,
  counterparties = [],
  assignedTags = [],
  allTags = [],
  onTagAdd,
  onTagRemove,
  onTagCreate,
}: {
  item: Invoice
  layout?: 'mobile' | 'desktop'
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
  assignedTags?: TagItem[]
  allTags?: TagItem[]
  onTagAdd?: (tag: TagItem) => Promise<void>
  onTagRemove?: (tag: TagItem) => Promise<void>
  onTagCreate?: (name: string, color: string) => Promise<TagItem>
}) {
  const { data: session } = authClient.useSession()
  const canEditDelete =
    item.kind === 'payable' || item.createdBy === session?.user?.id

  return (
    <InvoiceListItem
      item={item}
      layout={layout}
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
      assignedTags={assignedTags}
      allTags={allTags}
      onTagAdd={onTagAdd}
      onTagRemove={onTagRemove}
      onTagCreate={onTagCreate}
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
