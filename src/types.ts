import type {
  AccountTransfer as DBAccountTransfer,
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
  Task as DBTask,
  TaskList as DBTaskList,
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
  category: Pick<DBCategory, 'id' | 'name'> | null
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

export type AccountTransfer = Pick<
  DBAccountTransfer,
  | 'id'
  | 'amount'
  | 'description'
  | 'fromAccountId'
  | 'toAccountId'
  | 'transferredAt'
  | 'paidAt'
  | 'createdAt'
  | 'createdBy'
> & {
  kind: 'transfer'
  fromAccount: Pick<CurrentAccount, 'id' | 'name'>
  toAccount: Pick<CurrentAccount, 'id' | 'name'>
  createdByUser: { id: string; name: string }
}

export type TransactionFeedItem = Invoice | AccountTransfer

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

export type PendingBlockSummary = {
  contractId: string
  contractName: string
  clientName: string | null
  vmNames: string[]
  willSuspendAt: string
}

export type ClientProxmoxResource = {
  id: string
  vmid: number
  vmType: 'qemu' | 'lxc'
  name: string
  contractId: string
  contractName: string
  counterpartyName: string
  nodeName: string
  isPausedBySystem: boolean
  pausedUntil: string | null
  hasOverdueInvoices: boolean
  willSuspendAt: string | null
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
    allowNotifications: boolean
    businessLine: {
      id: string
      name: string
      allowServerBindings: boolean
    } | null
    counterparty: { id: string; name: string }
    company: { id: string; name: string } | null
    companyId: string | null
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
    counterpartyName: string
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
  proxmoxResources: ClientProxmoxResource[]
}

export type Company = Pick<DBCompany, 'id' | 'name' | 'createdBy'> & {
  accounts: Pick<CurrentAccount, 'id' | 'name'>[]
  members: { userId: string; name: string; email: string; role: string }[]
}

export type BusinessLine = Pick<
  DBBusinessLine,
  | 'id'
  | 'name'
  | 'createdBy'
  | 'allowServerBindings'
  | 'allowNotifications'
  | 'reminderDaysBefore'
  | 'reminderFrequencyDays'
  | 'notificationStyle'
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
  | 'allowNotifications'
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
  | 'id'
  | 'name'
  | 'businessLineId'
  | 'companyId'
  | 'createdAt'
  | 'startedAt'
  | 'completedAt'
> & {
  businessLine: { id: string; name: string }
  itemCount: number
}

export type PriceRevisionDetail = Pick<
  DBRevision,
  | 'id'
  | 'name'
  | 'businessLineId'
  | 'companyId'
  | 'createdAt'
  | 'startedAt'
  | 'completedAt'
> & {
  businessLine: { id: string; name: string }
  items: PriceRevisionItemRow[]
  bulkSnapshot: { actionLabel: string } | null
}

export type AvailableContractForRevision = {
  id: string
  name: string
  number: string | null
  counterpartyName: string
  recentlyChanged: boolean
}

export type PriceRevisionItemRow = Pick<
  DBRevisionItem,
  | 'id'
  | 'revisionId'
  | 'contractId'
  | 'currentAmounts'
  | 'proposedAmounts'
  | 'notes'
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

export type InvoiceFormCategory = Pick<
  DBCategory,
  'id' | 'name' | 'useForExpenses' | 'useForIncome' | 'isShared'
>

export type TagsMap = Partial<Record<string, TagItem[]>>

export type IncomeStatus = 'partial' | 'overdue' | 'soon' | 'ontime' | 'nodate'

export type IncomeRow = {
  id: string
  amount: string
  description: string
  categoryId: string | null
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
export type PayablesGroupMode = 'none' | 'counterparty' | 'category'

export type ExpenseRow = {
  id: string
  periodGroup: PayablesPeriodGroup
  amount: string
  description: string
  categoryId: string | null
  currentAccountId: string
  createdAt: string
  dueDate: string | null
  paidAt: string | null
  archivedAt: string | null
  createdBy: string
  linkedInvoiceId: string | null
  contractId: string | null
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
  formCategories: InvoiceFormCategory[]
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
      id: 'unallocated-transactions'
      kind: 'unallocated-transactions'
      title: string
      description: string
      count: number
      amount: number
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
  projectedPayablesAmount: number
  projectedPayablesCount: number
  expensesWithDebt: number
  expensesWithDebtCount: number
  netWithoutPreviousPeriodDebt: number
  netWithPreviousPeriodDebt: number
}

export type DashboardLoaderData = {
  accounts: DashboardAccountBalance[]
  pendingBlockedServices: PendingBlockSummary[]
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
  | 'contractId'
  | 'currentAccountId'
  | 'cronExpression'
  | 'dueDaysFromCreation'
  | 'selectedAmountIndex'
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
  contract: { id: string; name: string; number: string | null } | null
}

export type RecurringMonthTotals = {
  income: number
  incomeCount: number
  expenses: number
  expensesCount: number
}

/** Recurring occurrences that have already been created (real invoices), keyed by rule id. */
export type CreatedOccurrence = { occurrenceAt: string; amount: string }

export type RecurringLoaderData = {
  rules: RuleWithRelations[]
  categories: NamedEntity[]
  accounts: NamedEntity[]
  counterparties: NamedEntity[]
  createdOccurrencesByRule: Record<string, CreatedOccurrence[]>
}

// ── Profitability report (retrospective) ─────────────────────────────────────

/** A single month data point in the profitability report (anchored on the 1st). */
export type ProfitabilityMonthPoint = {
  month: string // 'YYYY-MM'
  label: string // 'Янв 2026'
  // Realized (actual) figures.
  // Accrual basis — by invoice.createdAt
  incomeAccrual: number
  expenseAccrual: number
  netAccrual: number
  // Cash basis — by actual payment date (settledAt / manual paidAt)
  incomeCash: number
  expenseCash: number
  netCash: number
  // Outstanding payable obligations as of the 1st of the month (carried debt),
  // reconstructed historically from settlement / payment dates.
  debt: number
  // Forecast portion — populated only for the current (incomplete) month, 0 otherwise.
  // Accrual: recurring occurrences still to be created this month.
  // Cash: outstanding amounts expected by their due date this month
  //       (existing unpaid invoices + projected recurring occurrences).
  isForecast: boolean
  plannedIncomeAccrual: number
  plannedExpenseAccrual: number
  plannedIncomeCash: number
  plannedExpenseCash: number
}

export type ProfitabilityReportData = {
  points: ProfitabilityMonthPoint[]
  hasAccounts: boolean
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

export type TaskItem = Pick<
  DBTask,
  | 'id'
  | 'description'
  | 'listId'
  | 'finishedAt'
  | 'dayList'
  | 'favourite'
  | 'position'
>

export type TaskListItem = Pick<
  DBTaskList,
  'id' | 'name' | 'position' | 'icon' | 'color'
>

export type TasksData = {
  lists: TaskListItem[]
  tasks: TaskItem[]
}
