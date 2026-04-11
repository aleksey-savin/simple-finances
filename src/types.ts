import type {
  Category as DBCategory,
  Client as DBClient,
  Company as DBCompany,
  Contract as DBContract,
  Invoice as DBInvoice,
  Counterparty as DBCounterparty,
  BusinessLine as DBBusinessLine,
  ContractPriceRevision as DBRevision,
  ContractPriceRevisionItem as DBRevisionItem,
  CurrentAccount,
  CurrentAccountUser,
  User,
  RecurringRule,
} from '@/db/types'
import type { TagItem } from '#/components/ui/tag-picker'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type Invoice = Pick<
  DBInvoice,
  | 'id'
  | 'kind'
  | 'description'
  | 'amount'
  | 'dueDate'
  | 'paidAt'
  | 'createdAt'
  | 'createdBy'
  | 'linkedInvoiceId'
  | 'archivedAt'
> & {
  manualPaid: boolean
  settledAmount: number
  outstandingAmount: number
  paymentStatus: 'unpaid' | 'partial' | 'paid'
  settlements?: Array<{
    id: string
    amount: string
    settledAt: Date
    bankTransaction?: {
      id: string
      amount: string
      direction: 'credit' | 'debit'
      bookedAt: Date
      description: string | null
      counterpartyNameRaw: string | null
      currentAccountId: string
      currentAccount: {
        id: string
        name: string
      }
    }
  }>
  category: Pick<DBCategory, 'id' | 'name'>
  currentAccount: Pick<CurrentAccount, 'id' | 'name'>
  counterparty: Pick<DBCounterparty, 'id' | 'name'> | null
  createdByUser: { id: string; name: string }
}

export type Expense = Invoice
export type Income = Invoice

export type Member = Pick<CurrentAccountUser, 'id' | 'role'> & {
  user: Pick<User, 'id' | 'name' | 'email'>
}

export type Account = Pick<
  CurrentAccount,
  | 'id'
  | 'name'
  | 'bankName'
  | 'bankNameInitials'
  | 'bankBik'
  | 'bankKs'
  | 'accountNumber'
  | 'balance'
  | 'createdBy'
  | 'acceptPayments'
> & {
  role: string
  members: Member[]
}

export type Category = Pick<
  DBCategory,
  'id' | 'name' | 'companyId' | 'useForExpenses' | 'useForIncome' | 'isShared'
> & {
  company: Pick<DBCompany, 'id' | 'name'> | null
}

export type Counterparty = Pick<
  DBCounterparty,
  'id' | 'name' | 'fullName' | 'type' | 'tin' | 'linkedUserId'
> & {
  linkedUser: Pick<User, 'id' | 'name' | 'email'> | null
}

export type Client = Pick<DBClient, 'id' | 'name' | 'createdBy' | 'companyId'> & {
  counterparties: Pick<DBCounterparty, 'id' | 'name'>[]
}

export type Company = Pick<DBCompany, 'id' | 'name' | 'createdBy'> & {
  accounts: Pick<CurrentAccount, 'id' | 'name'>[]
  members: { userId: string; name: string; email: string; role: string }[]
}

export type BusinessLine = Pick<DBBusinessLine, 'id' | 'name' | 'createdBy'> & {
  contracts: Pick<DBContract, 'id' | 'name'>[]
}

export type Contract = Pick<
  DBContract,
  | 'id'
  | 'name'
  | 'number'
  | 'signedAt'
  | 'contractType'
  | 'fileUrl'
  | 'amount'
  | 'businessLineId'
  | 'counterpartyId'
  | 'companyId'
  | 'createdBy'
> & {
  businessLine: Pick<DBBusinessLine, 'id' | 'name'>
  counterparty: Pick<DBCounterparty, 'id' | 'name'>
}

// ─── Price Revision ───────────────────────────────────────────────────────────

export type { PriceRevisionItemStatus } from '@/db/types'

export type PriceRevision = Pick<
  DBRevision,
  'id' | 'name' | 'businessLineId' | 'companyId' | 'createdAt' | 'completedAt'
> & {
  businessLine: { id: string; name: string }
  itemCount: number
}

export type PriceRevisionDetail = Pick<
  DBRevision,
  'id' | 'name' | 'businessLineId' | 'companyId' | 'createdAt' | 'completedAt'
> & {
  businessLine: { id: string; name: string }
  items: PriceRevisionItemRow[]
}

export type PriceRevisionItemRow = Pick<
  DBRevisionItem,
  | 'id'
  | 'revisionId'
  | 'contractId'
  | 'currentAmounts'
  | 'proposedAmounts'
  | 'included'
  | 'status'
  | 'notifiedAt'
  | 'agreedAt'
  | 'signedAt'
  | 'completedAt'
> & {
  contract: {
    id: string
    name: string
    number: string | null
    counterparty: { id: string; name: string }
  }
}

// ─── Named Entity ─────────────────────────────────────────────────────────────

export type NamedEntity = {
  id: string
  name: string
}

export type TagsMap = Partial<Record<string, TagItem[]>>

export type IncomeStatus = 'partial' | 'overdue' | 'soon' | 'ontime' | 'nodate'

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

export type ExpenseStatus =
  | 'paid'
  | 'partial'
  | 'projected'
  | 'overdue'
  | 'soon'
  | 'ontime'
  | 'nodate'

export type PayablesPeriodGroup = 'current-month' | 'previous-periods'

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

export type DashboardAccountBalance = {
  id: string
  name: string
  bankNameInitials: string | null
  balance: number
  lastImportedAt: string | null
}

export type DashboardScope = {
  id: string
  name: string
  kind: 'personal' | 'company'
  accountCount: number
  totalBalance: number
}

export type DashboardBankSummary = {
  totalCount: number
  totalRemaining: number
  incomingRemaining: number
  outgoingRemaining: number
}

export type DashboardMonthlyOutlook = {
  receivablesAmount: number
  receivablesCount: number
  unissuedInvoicesAmount: number
  unissuedInvoicesCount: number
  currentMonthIncoming: number
  previousPeriodDebt: number
  previousPeriodDebtCount: number
  plannedExpenses: number
  plannedExpensesCount: number
  expensesWithDebt: number
  expensesWithDebtCount: number
  netWithoutPreviousPeriodDebt: number
  netWithPreviousPeriodDebt: number
}

export type DashboardLoaderData = {
  accounts: DashboardAccountBalance[]
  totalBalance: number
  bankSummary: DashboardBankSummary
  monthlyOutlook: DashboardMonthlyOutlook
}

// ─── Recurring Rule ───────────────────────────────────────────────────────────

export type RuleWithRelations = Pick<
  RecurringRule,
  | 'id'
  | 'type'
  | 'amount'
  | 'description'
  | 'categoryId'
  | 'counterpartyId'
  | 'currentAccountId'
  | 'cronExpression'
  | 'dueDaysFromCreation'
  | 'isActive'
  | 'lastRunAt'
  | 'nextRunAt'
  | 'createdBy'
  | 'updatedBy'
  | 'createdAt'
  | 'updatedAt'
  | 'paymentAccountId'
  | 'paymentCategoryId'
> & {
  category: { id: string; name: string }
  currentAccount: { id: string; name: string }
  counterparty: { id: string; name: string } | null
}

export type RecurringMonthTotals = {
  income: number
  incomeCount: number
  expenses: number
  expensesCount: number
}

export type RecurringLoaderData = {
  rules: RuleWithRelations[]
  categories: NamedEntity[]
  accounts: NamedEntity[]
  counterparties: NamedEntity[]
  currentMonthTotals: RecurringMonthTotals
}
