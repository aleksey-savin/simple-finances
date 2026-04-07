import type { TagItem } from '#/components/ui/tag-picker'

export type NamedEntity = {
  id: string
  name: string
}

export type ExpenseRow = {
  id: string
  periodGroup: PayablesPeriodGroup
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
  isProjected: boolean
}

export type TagsMap = Partial<Record<string, TagItem[]>>

export type ExpenseStatus =
  | 'paid'
  | 'partial'
  | 'projected'
  | 'overdue'
  | 'soon'
  | 'ontime'
  | 'nodate'

export type PayablesPeriodGroup = 'current-month' | 'previous-periods'

export type PayablesTagTotal = {
  tag: TagItem
  expenseTotal: number
  incomeTotal: number
  net: number
}

export type PayablesLoaderData = {
  currentMonth: ExpenseRow[]
  previousUnpaid: ExpenseRow[]
  accounts: NamedEntity[]
  categories: NamedEntity[]
  counterparties: NamedEntity[]
  monthLabel: string
  tagsMap: TagsMap
  allTags: TagItem[]
  tagTotals: PayablesTagTotal[]
}
