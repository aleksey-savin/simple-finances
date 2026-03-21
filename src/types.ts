import type {
  Category as DBCategory,
  Expense as DBExpense,
  Income as DBIncome,
  Counterparty as DBCounterparty,
  CurrentAccount,
  CurrentAccountUser,
  User,
  RecurringRule,
} from '@/db/types'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type Expense = Pick<
  DBExpense,
  'id' | 'description' | 'amount' | 'dueDate' | 'paidAt' | 'createdAt'
> & {
  category: Pick<DBCategory, 'id' | 'name'>
  currentAccount: Pick<CurrentAccount, 'id' | 'name'>
  counterparty: Pick<DBCounterparty, 'id' | 'name'> | null
  createdByUser: { id: string; name: string }
  type: string
}

export type Income = Pick<
  DBIncome,
  | 'id'
  | 'description'
  | 'amount'
  | 'dueDate'
  | 'paidAt'
  | 'createdAt'
  | 'createdBy'
  | 'linkedExpenseId'
> & {
  category: Pick<DBCategory, 'id' | 'name'>
  currentAccount: Pick<CurrentAccount, 'id' | 'name'>
  counterparty: Pick<DBCounterparty, 'id' | 'name'> | null
  createdByUser: { id: string; name: string }
  type: string
}

export type Member = Pick<CurrentAccountUser, 'id' | 'role'> & {
  user: Pick<User, 'id' | 'name' | 'email'>
}

export type Account = Pick<
  CurrentAccount,
  'id' | 'name' | 'createdBy' | 'acceptPayments'
> & {
  role: string
  members: Member[]
}

export type Category = Pick<
  DBCategory,
  'id' | 'name' | 'useForExpenses' | 'useForIncome'
>

export type Counterparty = Pick<
  DBCounterparty,
  'id' | 'name' | 'fullName' | 'type' | 'tin' | 'linkedUserId'
> & {
  linkedUser: Pick<User, 'id' | 'name' | 'email'> | null
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
