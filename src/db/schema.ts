import { relations } from 'drizzle-orm'
import {
  boolean,
  foreignKey,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'

export const counterpartyTypeEnum = pgEnum('counterparty_type', [
  'Юридическое лицо',
  'Физическое лицо',
  'Индивидуальный предприниматель',
  'Обособленное подразделение',
  'Государственный орган',
])

export const tag = pgTable('tag', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#6366f1'),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const invoiceKindEnum = pgEnum('invoice_kind', ['payable', 'receivable'])

export const bankTransactionDirectionEnum = pgEnum(
  'bank_transaction_direction',
  ['debit', 'credit'],
)

export const expenseTag = pgTable(
  'expense_tag',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    expenseId: text('expense_id')
      .notNull()
      .references(() => expense.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (table) => [
    unique('expense_tag_unique').on(table.expenseId, table.tagId),
    index('expense_tag_expense_idx').on(table.expenseId),
    index('expense_tag_tag_idx').on(table.tagId),
  ],
)

export const incomeTag = pgTable(
  'income_tag',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    incomeId: text('income_id')
      .notNull()
      .references(() => income.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (table) => [
    unique('income_tag_unique').on(table.incomeId, table.tagId),
    index('income_tag_income_idx').on(table.incomeId),
    index('income_tag_tag_idx').on(table.tagId),
  ],
)

export const invoiceTag = pgTable(
  'invoice_tag',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoice.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (table) => [
    unique('invoice_tag_unique').on(table.invoiceId, table.tagId),
    index('invoice_tag_invoice_idx').on(table.invoiceId),
    index('invoice_tag_tag_idx').on(table.tagId),
  ],
)

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  role: text('role').notNull().default('user'),
  banned: boolean('banned').default(false).notNull(),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    impersonatedBy: text('impersonated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

export const currentAccount = pgTable('current_account', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text().notNull(),
  balance: numeric().notNull().default('0'),
  acceptPayments: boolean('accept_payments').notNull().default(false),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  updatedBy: text('updated_by')
    .notNull()
    .references(() => user.id),
})

/**
 * Junction table that tracks which users have access to a given currentAccount
 * and what role they hold.
 *
 * Roles:
 *   - owner  : full control (edit, delete, share)
 *   - editor : can add/edit invoices
 *   - viewer : read-only access
 */
export const currentAccountUser = pgTable(
  'current_account_user',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    currentAccountId: text('current_account_id')
      .notNull()
      .references(() => currentAccount.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** 'owner' | 'editor' | 'viewer' */
    role: text('role').notNull().default('viewer'),
    invitedBy: text('invited_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // A user can only appear once per account
    unique('current_account_user_unique').on(
      table.currentAccountId,
      table.userId,
    ),
    index('current_account_user_account_idx').on(table.currentAccountId),
    index('current_account_user_user_idx').on(table.userId),
  ],
)

export const category = pgTable('category', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text().notNull(),
  useForExpenses: boolean('use_for_expenses').notNull().default(false),
  useForIncome: boolean('use_for_income').notNull().default(false),
  isShared: boolean('is_shared').notNull().default(false),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  updatedBy: text('updated_by')
    .notNull()
    .references(() => user.id),
})

export const counterparty = pgTable('counterparty', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text().notNull().unique(),
  fullName: text().unique(),
  tin: text().unique(),
  type: counterpartyTypeEnum('type'),
  linkedUserId: text('linked_user_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

export const expense = pgTable(
  'expense',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    amount: numeric('value').notNull(),
    description: text().notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => category.id),
    counterpartyId: text('counterparty_id').references(() => counterparty.id),
    currentAccountId: text('current_account_id')
      .notNull()
      .references(() => currentAccount.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    dueDate: timestamp('due_date'),
    paidAt: timestamp('paid_at'),
    archivedAt: timestamp('archived_at'),
    recurringRuleId: text('recurring_rule_id').references(
      () => recurringRule.id,
      {
        onDelete: 'set null',
      },
    ),
    recurringOccurrenceAt: timestamp('recurring_occurrence_at'),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    updatedBy: text('updated_by')
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    unique('expense_recurring_occurrence_unique').on(
      table.recurringRuleId,
      table.recurringOccurrenceAt,
    ),
  ],
)

export const income = pgTable(
  'income',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    amount: numeric('value').notNull(),
    description: text().notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => category.id),
    counterpartyId: text('counterparty_id').references(() => counterparty.id),
    currentAccountId: text('current_account_id')
      .notNull()
      .references(() => currentAccount.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    dueDate: timestamp('due_date'),
    paidAt: timestamp('paid_at'),
    archivedAt: timestamp('archived_at'),
    recurringRuleId: text('recurring_rule_id').references(
      () => recurringRule.id,
      {
        onDelete: 'set null',
      },
    ),
    recurringOccurrenceAt: timestamp('recurring_occurrence_at'),
    linkedExpenseId: text('linked_expense_id').references(() => expense.id, {
      onDelete: 'set null',
    }),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    updatedBy: text('updated_by')
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    unique('income_recurring_occurrence_unique').on(
      table.recurringRuleId,
      table.recurringOccurrenceAt,
    ),
  ],
)

export const recurringRule = pgTable('recurring_rule', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /** 'payable' | 'receivable' */
  type: text('type').notNull(),
  amount: numeric('amount').notNull(),
  description: text('description').notNull(),
  categoryId: text('category_id')
    .notNull()
    .references(() => category.id),
  counterpartyId: text('counterparty_id').references(() => counterparty.id),
  /** Account in the counterparty's system that receives the mirrored receivable (payable rules only) */
  paymentAccountId: text('payment_account_id').references(
    () => currentAccount.id,
    { onDelete: 'set null' },
  ),
  /** Category used for the mirrored receivable entry (payable rules only) */
  paymentCategoryId: text('payment_category_id').references(() => category.id, {
    onDelete: 'set null',
  }),
  currentAccountId: text('current_account_id')
    .notNull()
    .references(() => currentAccount.id),
  /** Standard 5-field cron expression, e.g. "0 9 1 * *" */
  cronExpression: text('cron_expression').notNull(),
  /**
   * Number of days after the creation date when the generated entry is due.
   * null → no due date is set on the generated entry.
   */
  dueDaysFromCreation: integer('due_days_from_creation'),
  isActive: boolean('is_active').notNull().default(true),
  /** Timestamp of the last time this rule was fired */
  lastRunAt: timestamp('last_run_at'),
  /** Pre-calculated timestamp of the next scheduled firing */
  nextRunAt: timestamp('next_run_at'),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  updatedBy: text('updated_by')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

export const invoice = pgTable(
  'invoice',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    kind: invoiceKindEnum('kind').notNull(),
    amount: numeric('value').notNull(),
    description: text().notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => category.id),
    counterpartyId: text('counterparty_id').references(() => counterparty.id),
    currentAccountId: text('current_account_id')
      .notNull()
      .references(() => currentAccount.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    dueDate: timestamp('due_date'),
    paidAt: timestamp('paid_at'),
    archivedAt: timestamp('archived_at'),
    recurringRuleId: text('recurring_rule_id').references(
      () => recurringRule.id,
      {
        onDelete: 'set null',
      },
    ),
    recurringOccurrenceAt: timestamp('recurring_occurrence_at'),
    linkedInvoiceId: text('linked_invoice_id'),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    updatedBy: text('updated_by')
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    unique('invoice_recurring_occurrence_unique').on(
      table.recurringRuleId,
      table.recurringOccurrenceAt,
      table.kind,
    ),
    foreignKey({
      columns: [table.linkedInvoiceId],
      foreignColumns: [table.id],
      name: 'invoice_linked_invoice_fk',
    }).onDelete('set null'),
  ],
)

export const bankTransaction = pgTable(
  'bank_transaction',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    currentAccountId: text('current_account_id')
      .notNull()
      .references(() => currentAccount.id),
    direction: bankTransactionDirectionEnum('direction').notNull(),
    amount: numeric('amount').notNull(),
    currency: text('currency').notNull().default('RUB'),
    bookedAt: timestamp('booked_at').notNull(),
    valueDate: timestamp('value_date'),
    description: text('description'),
    counterpartyNameRaw: text('counterparty_name_raw'),
    externalId: text('external_id'),
    rawPayload: text('raw_payload'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('bank_transaction_account_idx').on(table.currentAccountId),
    unique('bank_transaction_account_external_unique').on(
      table.currentAccountId,
      table.externalId,
    ),
  ],
)

export const settlement = pgTable(
  'settlement',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoice.id, { onDelete: 'cascade' }),
    bankTransactionId: text('bank_transaction_id')
      .notNull()
      .references(() => bankTransaction.id, { onDelete: 'cascade' }),
    amount: numeric('amount').notNull(),
    settledAt: timestamp('settled_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique('settlement_invoice_bank_transaction_unique').on(
      table.invoiceId,
      table.bankTransactionId,
    ),
    index('settlement_invoice_idx').on(table.invoiceId),
    index('settlement_bank_transaction_idx').on(table.bankTransactionId),
  ],
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const tagRelations = relations(tag, ({ many }) => ({
  expenseTags: many(expenseTag),
  incomeTags: many(incomeTag),
  invoiceTags: many(invoiceTag),
}))

export const expenseTagRelations = relations(expenseTag, ({ one }) => ({
  expense: one(expense, {
    fields: [expenseTag.expenseId],
    references: [expense.id],
  }),
  tag: one(tag, {
    fields: [expenseTag.tagId],
    references: [tag.id],
  }),
}))

export const incomeTagRelations = relations(incomeTag, ({ one }) => ({
  income: one(income, {
    fields: [incomeTag.incomeId],
    references: [income.id],
  }),
  tag: one(tag, {
    fields: [incomeTag.tagId],
    references: [tag.id],
  }),
}))

export const invoiceTagRelations = relations(invoiceTag, ({ one }) => ({
  invoice: one(invoice, {
    fields: [invoiceTag.invoiceId],
    references: [invoice.id],
  }),
  tag: one(tag, {
    fields: [invoiceTag.tagId],
    references: [tag.id],
  }),
}))

export const userRelations = relations(user, ({ many }) => ({
  currentAccountUsers: many(currentAccountUser),
}))

export const currentAccountRelations = relations(
  currentAccount,
  ({ many }) => ({
    expenses: many(expense),
    incomes: many(income),
    invoices: many(invoice),
    bankTransactions: many(bankTransaction),
    members: many(currentAccountUser),
    recurringRules: many(recurringRule),
  }),
)

export const currentAccountUserRelations = relations(
  currentAccountUser,
  ({ one }) => ({
    currentAccount: one(currentAccount, {
      fields: [currentAccountUser.currentAccountId],
      references: [currentAccount.id],
    }),
    user: one(user, {
      fields: [currentAccountUser.userId],
      references: [user.id],
    }),
    invitedByUser: one(user, {
      fields: [currentAccountUser.invitedBy],
      references: [user.id],
    }),
  }),
)

export const expenseRelations = relations(expense, ({ one, many }) => ({
  tags: many(expenseTag),
  category: one(category, {
    fields: [expense.categoryId],
    references: [category.id],
  }),
  counterparty: one(counterparty, {
    fields: [expense.counterpartyId],
    references: [counterparty.id],
  }),
  currentAccount: one(currentAccount, {
    fields: [expense.currentAccountId],
    references: [currentAccount.id],
  }),
  createdByUser: one(user, {
    fields: [expense.createdBy],
    references: [user.id],
  }),
}))

export const incomeRelations = relations(income, ({ one, many }) => ({
  tags: many(incomeTag),
  category: one(category, {
    fields: [income.categoryId],
    references: [category.id],
  }),
  counterparty: one(counterparty, {
    fields: [income.counterpartyId],
    references: [counterparty.id],
  }),
  currentAccount: one(currentAccount, {
    fields: [income.currentAccountId],
    references: [currentAccount.id],
  }),
  createdByUser: one(user, {
    fields: [income.createdBy],
    references: [user.id],
  }),
  linkedExpense: one(expense, {
    fields: [income.linkedExpenseId],
    references: [expense.id],
  }),
}))

export const invoiceRelations = relations(invoice, ({ one, many }) => ({
  tags: many(invoiceTag),
  settlements: many(settlement),
  category: one(category, {
    fields: [invoice.categoryId],
    references: [category.id],
  }),
  counterparty: one(counterparty, {
    fields: [invoice.counterpartyId],
    references: [counterparty.id],
  }),
  currentAccount: one(currentAccount, {
    fields: [invoice.currentAccountId],
    references: [currentAccount.id],
  }),
  createdByUser: one(user, {
    fields: [invoice.createdBy],
    references: [user.id],
  }),
  linkedInvoice: one(invoice, {
    fields: [invoice.linkedInvoiceId],
    references: [invoice.id],
  }),
}))

export const bankTransactionRelations = relations(
  bankTransaction,
  ({ one, many }) => ({
    currentAccount: one(currentAccount, {
      fields: [bankTransaction.currentAccountId],
      references: [currentAccount.id],
    }),
    settlements: many(settlement),
  }),
)

export const settlementRelations = relations(settlement, ({ one }) => ({
  invoice: one(invoice, {
    fields: [settlement.invoiceId],
    references: [invoice.id],
  }),
  bankTransaction: one(bankTransaction, {
    fields: [settlement.bankTransactionId],
    references: [bankTransaction.id],
  }),
}))

export const counterpartyRelations = relations(
  counterparty,
  ({ one, many }) => ({
    expenses: many(expense),
    incomes: many(income),
    invoices: many(invoice),
    recurringRules: many(recurringRule),
    linkedUser: one(user, {
      fields: [counterparty.linkedUserId],
      references: [user.id],
    }),
  }),
)

export const categoryRelations = relations(category, ({ many }) => ({
  expenses: many(expense),
  incomes: many(income),
  invoices: many(invoice),
  recurringRules: many(recurringRule),
}))

export const recurringRuleRelations = relations(recurringRule, ({ one }) => ({
  category: one(category, {
    fields: [recurringRule.categoryId],
    references: [category.id],
  }),
  counterparty: one(counterparty, {
    fields: [recurringRule.counterpartyId],
    references: [counterparty.id],
  }),
  currentAccount: one(currentAccount, {
    fields: [recurringRule.currentAccountId],
    references: [currentAccount.id],
  }),
  createdByUser: one(user, {
    fields: [recurringRule.createdBy],
    references: [user.id],
  }),
}))
