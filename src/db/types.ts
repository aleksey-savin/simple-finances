import type {
  account,
  category,
  counterparty,
  counterpartyTypeEnum,
  currentAccount,
  currentAccountUser,
  expense,
  expenseTag,
  income,
  incomeTag,
  recurringRule,
  session,
  tag,
  user,
  verification,
} from './schema'

// ─── Enum ─────────────────────────────────────────────────────────────────────

export type CounterpartyType = (typeof counterpartyTypeEnum.enumValues)[number]

// ─── Auth (managed by better-auth, no Insert/Update needed) ──────────────────

export type User = typeof user.$inferSelect
export type UserInsert = typeof user.$inferInsert
export type UserUpdate = Partial<UserInsert> & { id: string }

export type Session = typeof session.$inferSelect

export type Account = typeof account.$inferSelect

export type Verification = typeof verification.$inferSelect

// ─── Current Account ──────────────────────────────────────────────────────────

export type CurrentAccount = typeof currentAccount.$inferSelect
export type CurrentAccountInsert = typeof currentAccount.$inferInsert
export type CurrentAccountUpdate = Partial<CurrentAccountInsert> & {
  id: string
}

// ─── Current Account User (membership / access control) ──────────────────────

export type CurrentAccountUser = typeof currentAccountUser.$inferSelect
export type CurrentAccountUserInsert = typeof currentAccountUser.$inferInsert
export type CurrentAccountUserUpdate = Partial<CurrentAccountUserInsert> & {
  id: string
}

// ─── Category ─────────────────────────────────────────────────────────────────

export type Category = typeof category.$inferSelect
export type CategoryInsert = typeof category.$inferInsert
export type CategoryUpdate = Partial<CategoryInsert> & { id: string }

// ─── Tag ──────────────────────────────────────────────────────────────────────

export type Tag = typeof tag.$inferSelect
export type TagInsert = typeof tag.$inferInsert
export type TagUpdate = Partial<TagInsert> & { id: string }

// ─── Counterparty ─────────────────────────────────────────────────────────────

export type Counterparty = typeof counterparty.$inferSelect
export type CounterpartyInsert = typeof counterparty.$inferInsert
export type CounterpartyUpdate = Partial<CounterpartyInsert> & { id: string }

// ─── Expense ──────────────────────────────────────────────────────────────────

export type Expense = typeof expense.$inferSelect
export type ExpenseInsert = typeof expense.$inferInsert
export type ExpenseUpdate = Partial<ExpenseInsert> & { id: string }

// ─── Expense Tag (junction — no Update) ──────────────────────────────────────

export type ExpenseTag = typeof expenseTag.$inferSelect
export type ExpenseTagInsert = typeof expenseTag.$inferInsert

// ─── Income ───────────────────────────────────────────────────────────────────

export type Income = typeof income.$inferSelect
export type IncomeInsert = typeof income.$inferInsert
export type IncomeUpdate = Partial<IncomeInsert> & { id: string }

// ─── Income Tag (junction — no Update) ───────────────────────────────────────

export type IncomeTag = typeof incomeTag.$inferSelect
export type IncomeTagInsert = typeof incomeTag.$inferInsert

// ─── Recurring Rule ───────────────────────────────────────────────────────────

export type RecurringRule = typeof recurringRule.$inferSelect
export type RecurringRuleInsert = typeof recurringRule.$inferInsert
export type RecurringRuleUpdate = Partial<RecurringRuleInsert> & { id: string }
