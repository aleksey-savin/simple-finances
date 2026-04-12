import type {
  account,
  bankTransaction,
  bankTransactionDirectionEnum,
  category,
  client,
  clientCounterparty,
  clientManager,
  contact,
  company,
  companyCurrentAccount,
  contract,
  contractTypeEnum,
  contractDocument,
  contractPriceRevision,
  contractPriceRevisionItem,
  contractAmountHistory,
  document,
  priceRevisionItemStatusEnum,
  counterparty,
  counterpartyTypeEnum,
  currentAccount,
  currentAccountUser,
  businessLine,
  expense,
  expenseTag,
  invoice,
  invoiceKindEnum,
  invoiceTag,
  income,
  incomeTag,
  recurringRule,
  session,
  settlement,
  tag,
  user,
  verification,
} from './schema'

// ─── Enum ─────────────────────────────────────────────────────────────────────

export type CounterpartyType = (typeof counterpartyTypeEnum.enumValues)[number]
export type InvoiceKind = (typeof invoiceKindEnum.enumValues)[number]
export type BankTransactionDirection =
  (typeof bankTransactionDirectionEnum.enumValues)[number]
export type ContractType = (typeof contractTypeEnum.enumValues)[number]

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

// ─── Client ───────────────────────────────────────────────────────────────────

export type Client = typeof client.$inferSelect
export type ClientInsert = typeof client.$inferInsert
export type ClientUpdate = Partial<ClientInsert> & { id: string }

export type ClientCounterparty = typeof clientCounterparty.$inferSelect
export type ClientCounterpartyInsert = typeof clientCounterparty.$inferInsert

export type ClientManager = typeof clientManager.$inferSelect
export type ClientManagerInsert = typeof clientManager.$inferInsert

export type Contact = typeof contact.$inferSelect
export type ContactInsert = typeof contact.$inferInsert
export type ContactUpdate = Partial<ContactInsert> & { id: string }

// ─── Company ──────────────────────────────────────────────────────────────────

export type Company = typeof company.$inferSelect
export type CompanyInsert = typeof company.$inferInsert
export type CompanyUpdate = Partial<CompanyInsert> & { id: string }

export type CompanyCurrentAccount = typeof companyCurrentAccount.$inferSelect
export type CompanyCurrentAccountInsert =
  typeof companyCurrentAccount.$inferInsert

// ─── Business Line ────────────────────────────────────────────────────────────

export type BusinessLine = typeof businessLine.$inferSelect
export type BusinessLineInsert = typeof businessLine.$inferInsert
export type BusinessLineUpdate = Partial<BusinessLineInsert> & { id: string }

// ─── Contract ─────────────────────────────────────────────────────────────────

export type Contract = typeof contract.$inferSelect
export type ContractInsert = typeof contract.$inferInsert
export type ContractUpdate = Partial<ContractInsert> & { id: string }

// ─── Document ─────────────────────────────────────────────────────────────────

export type Document = typeof document.$inferSelect
export type DocumentInsert = typeof document.$inferInsert

export type ContractDocument = typeof contractDocument.$inferSelect
export type ContractDocumentInsert = typeof contractDocument.$inferInsert

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

// ─── Invoice ──────────────────────────────────────────────────────────────────

export type Invoice = typeof invoice.$inferSelect
export type InvoiceInsert = typeof invoice.$inferInsert
export type InvoiceUpdate = Partial<InvoiceInsert> & { id: string }

// ─── Invoice Tag (junction — no Update) ──────────────────────────────────────

export type InvoiceTag = typeof invoiceTag.$inferSelect
export type InvoiceTagInsert = typeof invoiceTag.$inferInsert

// ─── Bank Transaction ─────────────────────────────────────────────────────────

export type BankTransaction = typeof bankTransaction.$inferSelect
export type BankTransactionInsert = typeof bankTransaction.$inferInsert
export type BankTransactionUpdate = Partial<BankTransactionInsert> & {
  id: string
}

// ─── Settlement ───────────────────────────────────────────────────────────────

export type Settlement = typeof settlement.$inferSelect
export type SettlementInsert = typeof settlement.$inferInsert
export type SettlementUpdate = Partial<SettlementInsert> & { id: string }

// ─── Recurring Rule ───────────────────────────────────────────────────────────

export type RecurringRule = typeof recurringRule.$inferSelect
export type RecurringRuleInsert = typeof recurringRule.$inferInsert
export type RecurringRuleUpdate = Partial<RecurringRuleInsert> & { id: string }

// ─── Contract Price Revision ──────────────────────────────────────────────────

export type PriceRevisionItemStatus =
  (typeof priceRevisionItemStatusEnum.enumValues)[number]

export type ContractPriceRevision = typeof contractPriceRevision.$inferSelect
export type ContractPriceRevisionInsert =
  typeof contractPriceRevision.$inferInsert
export type ContractPriceRevisionUpdate =
  Partial<ContractPriceRevisionInsert> & { id: string }

export type ContractPriceRevisionItem =
  typeof contractPriceRevisionItem.$inferSelect
export type ContractPriceRevisionItemInsert =
  typeof contractPriceRevisionItem.$inferInsert
export type ContractPriceRevisionItemUpdate =
  Partial<ContractPriceRevisionItemInsert> & { id: string }

export type ContractAmountHistory = typeof contractAmountHistory.$inferSelect
export type ContractAmountHistoryInsert =
  typeof contractAmountHistory.$inferInsert
