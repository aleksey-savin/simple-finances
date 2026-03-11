import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'

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
 *   - editor : can add/edit expenses & incomes
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
  name: text().notNull().unique(),
  useForExpenses: boolean('use_for_expenses').notNull().default(false),
  useForIncome: boolean('use_for_income').notNull().default(false),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  updatedBy: text('updated_by')
    .notNull()
    .references(() => user.id),
})

export const expense = pgTable('expense', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  amount: numeric('value').notNull(),
  description: text().notNull(),
  categoryId: text('category_id')
    .notNull()
    .references(() => category.id),
  currentAccountId: text('current_account_id')
    .notNull()
    .references(() => currentAccount.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  updatedBy: text('updated_by')
    .notNull()
    .references(() => user.id),
})

export const income = pgTable('income', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  amount: numeric('value').notNull(),
  description: text().notNull(),
  categoryId: text('category_id')
    .notNull()
    .references(() => category.id),
  // Fixed: was incorrectly referencing account.id instead of currentAccount.id
  currentAccountId: text('current_account_id')
    .notNull()
    .references(() => currentAccount.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  updatedBy: text('updated_by')
    .notNull()
    .references(() => user.id),
})

export const recurringRule = pgTable('recurring_rule', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /** 'expense' | 'income' */
  type: text('type').notNull(),
  amount: numeric('amount').notNull(),
  description: text('description').notNull(),
  categoryId: text('category_id')
    .notNull()
    .references(() => category.id),
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

// ─── Relations ────────────────────────────────────────────────────────────────

export const tagRelations = relations(tag, ({ many }) => ({
  expenseTags: many(expenseTag),
  incomeTags: many(incomeTag),
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

export const userRelations = relations(user, ({ many }) => ({
  currentAccountUsers: many(currentAccountUser),
}))

export const currentAccountRelations = relations(
  currentAccount,
  ({ many }) => ({
    expenses: many(expense),
    incomes: many(income),
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
  currentAccount: one(currentAccount, {
    fields: [income.currentAccountId],
    references: [currentAccount.id],
  }),
  createdByUser: one(user, {
    fields: [income.createdBy],
    references: [user.id],
  }),
}))

export const categoryRelations = relations(category, ({ many }) => ({
  expenses: many(expense),
  incomes: many(income),
  recurringRules: many(recurringRule),
}))

export const recurringRuleRelations = relations(recurringRule, ({ one }) => ({
  category: one(category, {
    fields: [recurringRule.categoryId],
    references: [category.id],
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
