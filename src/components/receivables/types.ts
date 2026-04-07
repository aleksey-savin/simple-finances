import type { TagItem } from '#/components/ui/tag-picker'

export type NamedEntity = {
  id: string
  name: string
}

export type IncomeRow = {
  id: string
  amount: string
  description: string
  categoryId: string
  currentAccountId: string
  createdAt: string
  dueDate: string | null
  paidAt: string | null
  archivedAt: string | null
  manualPaid: boolean
  settledAmount: number
  outstandingAmount: number
  paymentStatus: 'unpaid' | 'partial' | 'paid'
  category: NamedEntity
  currentAccount: NamedEntity
  counterpartyId: string | null
  counterparty: NamedEntity | null
  client: NamedEntity | null
}

export type TagsMap = Partial<Record<string, TagItem[]>>

export type IncomeStatus = 'partial' | 'overdue' | 'soon' | 'ontime' | 'nodate'

export type ReceivablesTagTotal = {
  tag: TagItem
  expenseTotal: number
  incomeTotal: number
  net: number
}

export type ReceivablesLoaderData = {
  rows: IncomeRow[]
  accounts: NamedEntity[]
  categories: NamedEntity[]
  counterparties: NamedEntity[]
  tagsMap: TagsMap
  allTags: TagItem[]
  tagTotals: ReceivablesTagTotal[]
}
