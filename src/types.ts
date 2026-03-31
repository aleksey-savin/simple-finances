import type {
  Category as DBCategory,
  Client as DBClient,
  Invoice as DBInvoice,
  Counterparty as DBCounterparty,
  CurrentAccount,
  CurrentAccountUser,
  User,
  RecurringRule,
} from '@/db/types'

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
  'id' | 'name' | 'accountNumber' | 'createdBy' | 'acceptPayments'
> & {
  role: string
  members: Member[]
}

export type Category = Pick<
  DBCategory,
  'id' | 'name' | 'useForExpenses' | 'useForIncome' | 'isShared'
>

export type Counterparty = Pick<
  DBCounterparty,
  'id' | 'name' | 'fullName' | 'type' | 'tin' | 'linkedUserId'
> & {
  linkedUser: Pick<User, 'id' | 'name' | 'email'> | null
}

export type Client = Pick<DBClient, 'id' | 'name' | 'createdBy'> & {
  counterparties: Pick<DBCounterparty, 'id' | 'name'>[]
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
