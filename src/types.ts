import type {
  Category as DBCategory,
  Client as DBClient,
  Company as DBCompany,
  Contract as DBContract,
  Document as DBDocument,
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
  | 'contractId'
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
  contract: {
    id: string
    name: string
    number: string | null
    signedAt: string | null
    contractDocuments: { document: { id: string; name: string } }[]
  } | null
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

export type Client = Pick<
  DBClient,
  'id' | 'name' | 'createdBy' | 'companyId'
> & {
  counterparties: Pick<DBCounterparty, 'id' | 'name'>[]
  managers: { userId: string; name: string }[]
  contacts: {
    id: string
    name: string
    position: string | null
    phone: string | null
    email: string | null
  }[]
  blockedServicesCount: number
}

export type BlockedServiceSummary = {
  contractId: string
  contractName: string
  clientName: string | null
  contractVmId: string
  blockedVmNames: string[]
  totalVmCount: number
  blockedVmCount: number
  pausedUntil: string | null
  paymentTermDueDate: string | null
}

export type ClientDetail = {
  id: string
  name: string
  companyId: string | null
  createdBy: string
  createdAt: Date
  company: { id: string; name: string } | null
  counterparties: {
    id: string
    name: string
    fullName: string | null
    type: string
    tin: string | null
  }[]
  managers: { userId: string; name: string }[]
  contracts: {
    id: string
    name: string
    number: string | null
    signedAt: string | null
    contractType: 'customer' | 'supplier'
    amount: string[]
    businessLine: {
      id: string
      name: string
      allowServerBindings: boolean
    } | null
    counterparty: { id: string; name: string }
    documents: { id: string; name: string; url: string }[]
  }[]
  pendingPayments: {
    id: string
    amount: string
    description: string
    dueDate: Date | null
    counterpartyName: string | null
  }[]
  activeRevisions: {
    revisionId: string
    revisionName: string
    itemId: string
    contractId: string
    contractName: string
    status: string
    included: boolean
    currentAmounts: string[]
    proposedAmounts: string[]
  }[]
  amountHistory: {
    id: string
    contractId: string
    contractName: string
    previousAmounts: string[]
    newAmounts: string[]
    changedAt: Date
    changedByName: string
  }[]
  contacts: {
    id: string
    name: string
    position: string | null
    phone: string | null
    email: string | null
  }[]
  blockedServices: BlockedServiceSummary[]
}

export type Company = Pick<DBCompany, 'id' | 'name' | 'createdBy'> & {
  accounts: Pick<CurrentAccount, 'id' | 'name'>[]
  members: { userId: string; name: string; email: string; role: string }[]
}

export type BusinessLine = Pick<
  DBBusinessLine,
  'id' | 'name' | 'createdBy' | 'allowServerBindings' | 'allowNotifications'
> & {
  contracts: Pick<DBContract, 'id' | 'name'>[]
}

export type Contract = Pick<
  DBContract,
  | 'id'
  | 'name'
  | 'number'
  | 'signedAt'
  | 'contractType'
  | 'amount'
  | 'businessLineId'
  | 'counterpartyId'
  | 'companyId'
  | 'createdBy'
> & {
  company: Pick<DBCompany, 'id' | 'name'> | null
  businessLine: Pick<
    DBBusinessLine,
    'id' | 'name' | 'allowServerBindings'
  > | null
  counterparty: Pick<DBCounterparty, 'id' | 'name'>
  documents: Pick<DBDocument, 'id' | 'name' | 'url'>[]
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
    signedAt: string | null
    counterparty: {
      id: string
      name: string
      client: { id: string; name: string } | null
      contacts: {
        id: string
        name: string
        position: string | null
        phone: string | null
        email: string | null
      }[]
    }
    documents: { id: string; name: string; url: string }[]
  }
  managers: { userId: string; name: string }[]
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

export type DashboardTask =
  | {
      id: 'bank-import'
      kind: 'bank-import'
      title: string
      description: string
      count: number
      amount: number
      incomingAmount: number
      outgoingAmount: number
    }
  | {
      id: string
      kind: 'price-revision'
      title: string
      description: string
      itemCount: number
      createdAt: string
      revisionId: string
      businessLineName: string
    }

export type DashboardMonthlyOutlook = {
  receivablesAmount: number
  receivablesCount: number
  overdueReceivablesAmount: number
  overdueReceivablesCount: number
  currentReceivablesAmount: number
  currentReceivablesCount: number
  unissuedInvoicesAmount: number
  unissuedInvoicesCount: number
  currentMonthIncoming: number
  previousPeriodDebt: number
  previousPeriodDebtCount: number
  overduePreviousPeriodDebt: number
  overduePreviousPeriodDebtCount: number
  plannedPreviousPeriodRepayment: number
  plannedPreviousPeriodRepaymentCount: number
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
  tasks: DashboardTask[]
  monthlyOutlook: DashboardMonthlyOutlook
  blockedServices: BlockedServiceSummary[]
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
