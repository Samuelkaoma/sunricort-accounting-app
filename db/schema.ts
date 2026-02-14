import {
  pgTable,
  text,
  varchar,
  decimal,
  timestamp,
  boolean,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role").default("staff"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

// Enums
export const accountTypeEnum = pgEnum("account_type", [
  "cash",
  "bank",
  "mobile",
  "credit",
]);
export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
]);
export const contactTypeEnum = pgEnum("contact_type", ["customer", "vendor"]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
]);
export const recurringFrequencyEnum = pgEnum("recurring_frequency", [
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "completed",
  "cancelled",
]);

export const expenseStatusEnum = pgEnum("expense_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "reimbursed",
]);

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: accountTypeEnum("type").notNull(),
  description: text("description"),
  balance: decimal("balance", {
    precision: 15,
    scale: 2,
  })
    .default("0.00")
    .notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: contactTypeEnum("type").notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  taxId: varchar("tax_id", { length: 50 }),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  reference: varchar("reference", { length: 100 }),
  transactionDate: timestamp("transaction_date").notNull(),
  status: transactionStatusEnum("status").default("pending").notNull(),
  receiptUrl: varchar("receipt_url", { length: 255 }),
  // Account relationships
  fromAccountId: uuid("from_account_id").references(() => accounts.id),
  toAccountId: uuid("to_account_id").references(() => accounts.id),

  // Contact relationships
  contactId: uuid("contact_id").references(() => contacts.id),

  // User relationship
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Additional fields
  notes: text("notes"),
  attachments: text("attachments"), // JSON array of file URLs

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  customerId: uuid("customer_id")
    .references(() => contacts.id)
    .notNull(),

  // Invoice details
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: invoiceStatusEnum("status").default("draft"),

  // Amounts
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0.00"),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default(
    "0.00"
  ),

  // User relationship
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Additional fields
  notes: text("notes"),
  terms: text("terms"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  invoiceId: uuid("invoice_id")
    .references(() => invoices.id)
    .notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: expenseStatusEnum("status").default("draft").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  vendorId: uuid("vendor_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const recurringTransactions = pgTable("recurring_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),

  // Account relationships
  fromAccountId: uuid("from_account_id").references(() => accounts.id),
  toAccountId: uuid("to_account_id").references(() => accounts.id),

  // Contact relationships
  contactId: uuid("contact_id").references(() => contacts.id),

  // User relationship
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Recurring settings
  frequency: recurringFrequencyEnum("frequency").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  nextDate: timestamp("next_date").notNull(),

  // Status
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(accounts),
  contacts: many(contacts),
  transactions: many(transactions),
  invoices: many(invoices),
  recurringTransactions: many(recurringTransactions),
  expenses: many(expenses),
  sessions: many(session),
  authAccounts: many(account),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  transactionsFrom: many(transactions, { relationName: "fromAccount" }),
  transactionsTo: many(transactions, { relationName: "toAccount" }),
  recurringTransactionsFrom: many(recurringTransactions, {
    relationName: "fromAccount",
  }),
  recurringTransactionsTo: many(recurringTransactions, {
    relationName: "toAccount",
  }),
  expenses: many(expenses),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  user: one(user, {
    fields: [contacts.userId],
    references: [user.id],
  }),
  transactions: many(transactions),
  invoices: many(invoices),
  recurringTransactions: many(recurringTransactions),
  expenses: many(expenses),
}));

export const transactionsRelations = relations(
  transactions,
  ({ one, many }) => ({
    user: one(user, {
      fields: [transactions.userId],
      references: [user.id],
    }),
    fromAccount: one(accounts, {
      fields: [transactions.fromAccountId],
      references: [accounts.id],
      relationName: "fromAccount",
    }),
    toAccount: one(accounts, {
      fields: [transactions.toAccountId],
      references: [accounts.id],
      relationName: "toAccount",
    }),
    contact: one(contacts, {
      fields: [transactions.contactId],
      references: [contacts.id],
    }),
  })
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(user, {
    fields: [invoices.userId],
    references: [user.id],
  }),
  customer: one(contacts, {
    fields: [invoices.customerId],
    references: [contacts.id],
  }),
  items: many(invoiceItems),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  user: one(user, {
    fields: [expenses.userId],
    references: [user.id],
  }),
  vendor: one(contacts, {
    fields: [expenses.vendorId],
    references: [contacts.id],
  }),
  account: one(accounts, {
    fields: [expenses.accountId],
    references: [accounts.id],
  }),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const recurringTransactionsRelations = relations(
  recurringTransactions,
  ({ one }) => ({
    user: one(user, {
      fields: [recurringTransactions.userId],
      references: [user.id],
    }),
    fromAccount: one(accounts, {
      fields: [recurringTransactions.fromAccountId],
      references: [accounts.id],
      relationName: "fromAccount",
    }),
    toAccount: one(accounts, {
      fields: [recurringTransactions.toAccountId],
      references: [accounts.id],
      relationName: "toAccount",
    }),
    contact: one(contacts, {
      fields: [recurringTransactions.contactId],
      references: [contacts.id],
    }),
  })
);

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// Auth table types
export type InsertUser = typeof user.$inferInsert;
export type SelectUser = typeof user.$inferSelect;

export type InsertSession = typeof session.$inferInsert;
export type SelectSession = typeof session.$inferSelect;

export type InsertAccount = typeof account.$inferInsert;
export type SelectAccount = typeof account.$inferSelect;

export type InsertVerification = typeof verification.$inferInsert;
export type SelectVerification = typeof verification.$inferSelect;

// Business table types
export type InsertAccounts = typeof accounts.$inferInsert;
export type SelectAccounts = typeof accounts.$inferSelect;

export type InsertContacts = typeof contacts.$inferInsert;
export type SelectContacts = typeof contacts.$inferSelect;

export type InsertTransactions = typeof transactions.$inferInsert;
export type SelectTransactions = typeof transactions.$inferSelect;

export type InsertInvoices = typeof invoices.$inferInsert;
export type SelectInvoices = typeof invoices.$inferSelect;

export type InsertInvoiceItems = typeof invoiceItems.$inferInsert;
export type SelectInvoiceItems = typeof invoiceItems.$inferSelect;

export type InsertRecurringTransactions =
  typeof recurringTransactions.$inferInsert;
export type SelectRecurringTransactions =
  typeof recurringTransactions.$inferSelect;

export type InsertExpenses = typeof expenses.$inferInsert;
export type SelectExpenses = typeof expenses.$inferSelect;

// Enum types for convenience
export type AccountType = "cash" | "bank" | "mobile" | "credit";
export type TransactionType = "income" | "expense" | "transfer";
export type ContactType = "customer" | "vendor";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type ExpenseStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "reimbursed";
export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type TransactionStatus = "pending" | "completed" | "cancelled";
