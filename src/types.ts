import type {
  Category as DBCategory,
  Counterparty as DBCounterparty,
  CurrentAccount,
  CurrentAccountUser,
  User,
  RecurringRule,
} from '@/db/types'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type Member = Pick<CurrentAccountUser, 'id' | 'role'> & {
  user: Pick<User, 'id' | 'name' | 'email'>
}

export type Account = Pick<CurrentAccount, 'id' | 'name' | 'createdBy'> & {
  role: string
  members: Member[]
}

export type Category = Pick<
  DBCategory,
  'id' | 'name' | 'useForExpenses' | 'useForIncome'
>

export type Counterparty = Pick<
  DBCounterparty,
  'id' | 'name' | 'fullName' | 'type' | 'tin'
>

// ─── Recurring Rule ───────────────────────────────────────────────────────────

export type RuleWithRelations = Pick<
  RecurringRule,
  | 'id'
  | 'type'
  | 'amount'
  | 'description'
  | 'categoryId'
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
> & {
  category: { id: string; name: string }
  currentAccount: { id: string; name: string }
}
