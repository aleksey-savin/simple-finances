import { relations } from 'drizzle-orm'
import {
  boolean,
  date,
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

export const contractTypeEnum = pgEnum('contract_type', [
  'customer',
  'supplier',
])

export const vmTypeEnum = pgEnum('vm_type', ['qemu', 'lxc'])

export const priceRevisionItemStatusEnum = pgEnum(
  'price_revision_item_status',
  ['draft', 'notified', 'agreed', 'signed', 'success'],
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
  bankName: text('bank_name'),
  bankNameInitials: text('bank_name_initials'),
  bankBik: text('bank_bik'),
  bankKs: text('bank_ks'),
  accountNumber: text('account_number'),
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
  companyId: text('company_id').references(() => company.id, {
    onDelete: 'set null',
  }),
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
  name: text().notNull(),
  fullName: text(),
  tin: text(),
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

export const client = pgTable('client', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  companyId: text('company_id').references(() => company.id, {
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

export const clientCounterparty = pgTable(
  'client_counterparty',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    counterpartyId: text('counterparty_id')
      .notNull()
      .references(() => counterparty.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('client_counterparty_unique').on(
      table.clientId,
      table.counterpartyId,
    ),
    index('client_counterparty_client_idx').on(table.clientId),
    index('client_counterparty_counterparty_idx').on(table.counterpartyId),
  ],
)

export const company = pgTable('company', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

export const companyCurrentAccount = pgTable(
  'company_current_account',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text('company_id')
      .notNull()
      .references(() => company.id, { onDelete: 'cascade' }),
    currentAccountId: text('current_account_id')
      .notNull()
      .references(() => currentAccount.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('company_current_account_unique').on(
      table.companyId,
      table.currentAccountId,
    ),
    unique('company_current_account_account_unique').on(table.currentAccountId),
    index('company_current_account_company_idx').on(table.companyId),
    index('company_current_account_account_idx').on(table.currentAccountId),
  ],
)

export const companyCounterparty = pgTable(
  'company_counterparty',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text('company_id')
      .notNull()
      .references(() => company.id, { onDelete: 'cascade' }),
    counterpartyId: text('counterparty_id')
      .notNull()
      .references(() => counterparty.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('company_counterparty_unique').on(
      table.companyId,
      table.counterpartyId,
    ),
    index('company_counterparty_company_idx').on(table.companyId),
    index('company_counterparty_counterparty_idx').on(table.counterpartyId),
  ],
)

export const userCounterparty = pgTable(
  'user_counterparty',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    counterpartyId: text('counterparty_id')
      .notNull()
      .references(() => counterparty.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('user_counterparty_unique').on(table.userId, table.counterpartyId),
    index('user_counterparty_user_idx').on(table.userId),
    index('user_counterparty_counterparty_idx').on(table.counterpartyId),
  ],
)

export const businessLine = pgTable('business_line', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

export const contract = pgTable(
  'contract',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    number: text('number'),
    signedAt: date('signed_at'),
    contractType: contractTypeEnum('contract_type')
      .notNull()
      .default('customer'),
    businessLineId: text('business_line_id')
      .notNull()
      .references(() => businessLine.id),
    counterpartyId: text('counterparty_id')
      .notNull()
      .references(() => counterparty.id),
    companyId: text('company_id').references(() => company.id, {
      onDelete: 'set null',
    }),
    amount: numeric('amount').array().notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('contract_business_line_idx').on(table.businessLineId),
    index('contract_counterparty_idx').on(table.counterpartyId),
    index('contract_company_idx').on(table.companyId),
  ],
)

export const document = pgTable('document', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  url: text('url').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  uploadedBy: text('uploaded_by')
    .notNull()
    .references(() => user.id),
})

export const contractDocument = pgTable(
  'contract_document',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contractId: text('contract_id')
      .notNull()
      .references(() => contract.id, { onDelete: 'cascade' }),
    documentId: text('document_id')
      .notNull()
      .references(() => document.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('contract_document_contract_idx').on(table.contractId),
    unique('contract_document_unique').on(table.contractId, table.documentId),
  ],
)

export const contractPriceRevision = pgTable(
  'contract_price_revision',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    businessLineId: text('business_line_id')
      .notNull()
      .references(() => businessLine.id),
    companyId: text('company_id').references(() => company.id, {
      onDelete: 'set null',
    }),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('price_revision_business_line_idx').on(table.businessLineId),
    index('price_revision_company_idx').on(table.companyId),
  ],
)

export const contractAmountHistory = pgTable(
  'contract_amount_history',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contractId: text('contract_id')
      .notNull()
      .references(() => contract.id, { onDelete: 'cascade' }),
    previousAmounts: numeric('previous_amounts').array().notNull(),
    newAmounts: numeric('new_amounts').array().notNull(),
    revisionItemId: text('revision_item_id'),
    changedBy: text('changed_by')
      .notNull()
      .references(() => user.id),
    changedAt: timestamp('changed_at').defaultNow().notNull(),
  },
  (table) => [
    index('contract_amount_history_contract_idx').on(table.contractId),
  ],
)

export const contractPriceRevisionItem = pgTable(
  'contract_price_revision_item',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    revisionId: text('revision_id')
      .notNull()
      .references(() => contractPriceRevision.id, { onDelete: 'cascade' }),
    contractId: text('contract_id')
      .notNull()
      .references(() => contract.id, { onDelete: 'cascade' }),
    currentAmounts: numeric('current_amounts').array().notNull(),
    proposedAmounts: numeric('proposed_amounts').array().notNull(),
    included: boolean('included').notNull().default(true),
    status: priceRevisionItemStatusEnum('status').notNull().default('draft'),
    notifiedAt: timestamp('notified_at'),
    agreedAt: timestamp('agreed_at'),
    signedAt: timestamp('signed_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique('price_revision_item_unique').on(table.revisionId, table.contractId),
    index('price_revision_item_revision_idx').on(table.revisionId),
    index('price_revision_item_contract_idx').on(table.contractId),
  ],
)

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
  contractId: text('contract_id').references(() => contract.id, {
    onDelete: 'set null',
  }),
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
    contractId: text('contract_id').references(() => contract.id, {
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
  clients: many(client),
  companies: many(company),
  businessLines: many(businessLine),
  contracts: many(contract),
  counterpartyLinks: many(userCounterparty),
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
    companyLinks: many(companyCurrentAccount),
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
  reminderLogs: many(invoiceReminderLog),
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
  contract: one(contract, {
    fields: [invoice.contractId],
    references: [contract.id],
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
    contracts: many(contract),
    clientLinks: many(clientCounterparty),
    companyLinks: many(companyCounterparty),
    userLinks: many(userCounterparty),
    linkedUser: one(user, {
      fields: [counterparty.linkedUserId],
      references: [user.id],
    }),
  }),
)

export const companyCounterpartyRelations = relations(
  companyCounterparty,
  ({ one }) => ({
    company: one(company, {
      fields: [companyCounterparty.companyId],
      references: [company.id],
    }),
    counterparty: one(counterparty, {
      fields: [companyCounterparty.counterpartyId],
      references: [counterparty.id],
    }),
  }),
)

export const userCounterpartyRelations = relations(
  userCounterparty,
  ({ one }) => ({
    user: one(user, {
      fields: [userCounterparty.userId],
      references: [user.id],
    }),
    counterparty: one(counterparty, {
      fields: [userCounterparty.counterpartyId],
      references: [counterparty.id],
    }),
  }),
)

export const clientManager = pgTable(
  'client_manager',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('client_manager_unique').on(table.clientId, table.userId),
    index('client_manager_client_idx').on(table.clientId),
    index('client_manager_user_idx').on(table.userId),
  ],
)

export const clientManagerRelations = relations(clientManager, ({ one }) => ({
  client: one(client, {
    fields: [clientManager.clientId],
    references: [client.id],
  }),
  user: one(user, {
    fields: [clientManager.userId],
    references: [user.id],
  }),
}))

export const contact = pgTable(
  'contact',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: text('position'),
    phone: text('phone'),
    email: text('email'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('contact_client_idx').on(table.clientId)],
)

export const contactRelations = relations(contact, ({ one }) => ({
  client: one(client, {
    fields: [contact.clientId],
    references: [client.id],
  }),
}))

export const clientRelations = relations(client, ({ one, many }) => ({
  counterparties: many(clientCounterparty),
  managers: many(clientManager),
  contacts: many(contact),
  company: one(company, {
    fields: [client.companyId],
    references: [company.id],
  }),
  createdByUser: one(user, {
    fields: [client.createdBy],
    references: [user.id],
  }),
}))

export const clientCounterpartyRelations = relations(
  clientCounterparty,
  ({ one }) => ({
    client: one(client, {
      fields: [clientCounterparty.clientId],
      references: [client.id],
    }),
    counterparty: one(counterparty, {
      fields: [clientCounterparty.counterpartyId],
      references: [counterparty.id],
    }),
  }),
)

export const companyRelations = relations(company, ({ one, many }) => ({
  currentAccounts: many(companyCurrentAccount),
  counterpartyLinks: many(companyCounterparty),
  clients: many(client),
  contracts: many(contract),
  createdByUser: one(user, {
    fields: [company.createdBy],
    references: [user.id],
  }),
}))

export const companyCurrentAccountRelations = relations(
  companyCurrentAccount,
  ({ one }) => ({
    company: one(company, {
      fields: [companyCurrentAccount.companyId],
      references: [company.id],
    }),
    currentAccount: one(currentAccount, {
      fields: [companyCurrentAccount.currentAccountId],
      references: [currentAccount.id],
    }),
  }),
)

export const businessLineRelations = relations(
  businessLine,
  ({ one, many }) => ({
    contracts: many(contract),
    createdByUser: one(user, {
      fields: [businessLine.createdBy],
      references: [user.id],
    }),
  }),
)

export const contractAmountHistoryRelations = relations(
  contractAmountHistory,
  ({ one }) => ({
    contract: one(contract, {
      fields: [contractAmountHistory.contractId],
      references: [contract.id],
    }),
    changedByUser: one(user, {
      fields: [contractAmountHistory.changedBy],
      references: [user.id],
    }),
  }),
)

export const contractRelations = relations(contract, ({ one, many }) => ({
  businessLine: one(businessLine, {
    fields: [contract.businessLineId],
    references: [businessLine.id],
  }),
  counterparty: one(counterparty, {
    fields: [contract.counterpartyId],
    references: [counterparty.id],
  }),
  company: one(company, {
    fields: [contract.companyId],
    references: [company.id],
  }),
  createdByUser: one(user, {
    fields: [contract.createdBy],
    references: [user.id],
  }),
  priceRevisionItems: many(contractPriceRevisionItem),
  amountHistory: many(contractAmountHistory),
  contractDocuments: many(contractDocument),
  contractVms: many(contractVm),
  invoices: many(invoice),
  recurringRules: many(recurringRule),
}))

export const documentRelations = relations(document, ({ one }) => ({
  uploadedByUser: one(user, {
    fields: [document.uploadedBy],
    references: [user.id],
  }),
}))

export const contractDocumentRelations = relations(
  contractDocument,
  ({ one }) => ({
    contract: one(contract, {
      fields: [contractDocument.contractId],
      references: [contract.id],
    }),
    document: one(document, {
      fields: [contractDocument.documentId],
      references: [document.id],
    }),
  }),
)

export const contractPriceRevisionRelations = relations(
  contractPriceRevision,
  ({ one, many }) => ({
    businessLine: one(businessLine, {
      fields: [contractPriceRevision.businessLineId],
      references: [businessLine.id],
    }),
    company: one(company, {
      fields: [contractPriceRevision.companyId],
      references: [company.id],
    }),
    createdByUser: one(user, {
      fields: [contractPriceRevision.createdBy],
      references: [user.id],
    }),
    items: many(contractPriceRevisionItem),
  }),
)

export const contractPriceRevisionItemRelations = relations(
  contractPriceRevisionItem,
  ({ one }) => ({
    revision: one(contractPriceRevision, {
      fields: [contractPriceRevisionItem.revisionId],
      references: [contractPriceRevision.id],
    }),
    contract: one(contract, {
      fields: [contractPriceRevisionItem.contractId],
      references: [contract.id],
    }),
  }),
)

export const categoryRelations = relations(category, ({ one, many }) => ({
  company: one(company, {
    fields: [category.companyId],
    references: [company.id],
  }),
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
  contract: one(contract, {
    fields: [recurringRule.contractId],
    references: [contract.id],
  }),
}))

export const smtpSettings = pgTable(
  'smtp_settings',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    host: text('host').notNull(),
    port: integer('port').notNull().default(587),
    secure: boolean('secure').notNull().default(false),
    username: text('username').notNull(),
    password: text('password').notNull(),
    fromName: text('from_name').notNull(),
    fromEmail: text('from_email').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  }
)

export const proxmoxNode = pgTable(
  'proxmox_node',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    currentAccountId: text('current_account_id')
      .notNull()
      .references(() => currentAccount.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    host: text('host').notNull(),
    port: integer('port').notNull().default(8006),
    tokenId: text('token_id').notNull(),
    tokenSecret: text('token_secret').notNull(),
    verifySsl: boolean('verify_ssl').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('proxmox_node_account_idx').on(table.currentAccountId)],
)

export const proxmoxAccountSettings = pgTable(
  'proxmox_account_settings',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    currentAccountId: text('current_account_id')
      .notNull()
      .references(() => currentAccount.id, { onDelete: 'cascade' }),
    reminderDaysBefore: integer('reminder_days_before').notNull().default(5),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique('proxmox_account_settings_unique').on(table.currentAccountId),
  ],
)

export const contractVm = pgTable(
  'contract_vm',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contractId: text('contract_id')
      .notNull()
      .references(() => contract.id, { onDelete: 'cascade' }),
    proxmoxNodeId: text('proxmox_node_id')
      .notNull()
      .references(() => proxmoxNode.id, { onDelete: 'cascade' }),
    vmid: integer('vmid').notNull(),
    vmType: vmTypeEnum('vm_type').notNull(),
    name: text('name').notNull(),
    pausedUntil: timestamp('paused_until'),
    isPausedBySystem: boolean('is_paused_by_system').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('contract_vm_node_vmid_unique').on(table.proxmoxNodeId, table.vmid),
    index('contract_vm_contract_idx').on(table.contractId),
    index('contract_vm_node_idx').on(table.proxmoxNodeId),
  ],
)

export const invoiceReminderLog = pgTable(
  'invoice_reminder_log',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoice.id, { onDelete: 'cascade' }),
    sentAt: timestamp('sent_at').defaultNow().notNull(),
    toEmail: text('to_email').notNull(),
  },
  (table) => [index('invoice_reminder_log_invoice_idx').on(table.invoiceId)],
)

export const proxmoxNodeRelations = relations(proxmoxNode, ({ one, many }) => ({
  currentAccount: one(currentAccount, {
    fields: [proxmoxNode.currentAccountId],
    references: [currentAccount.id],
  }),
  contractVms: many(contractVm),
}))

export const contractVmRelations = relations(contractVm, ({ one }) => ({
  contract: one(contract, {
    fields: [contractVm.contractId],
    references: [contract.id],
  }),
  proxmoxNode: one(proxmoxNode, {
    fields: [contractVm.proxmoxNodeId],
    references: [proxmoxNode.id],
  }),
}))

export const invoiceReminderLogRelations = relations(
  invoiceReminderLog,
  ({ one }) => ({
    invoice: one(invoice, {
      fields: [invoiceReminderLog.invoiceId],
      references: [invoice.id],
    }),
  }),
)
