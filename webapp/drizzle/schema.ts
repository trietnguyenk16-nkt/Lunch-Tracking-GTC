import {
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  active: int("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdById: int("createdById").notNull(),
  updatedById: int("updatedById").notNull(),
}, (table) => ({ activeName: index("employees_active_name_idx").on(table.active, table.name) }));

export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  amountMinor: int("amountMinor").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  paidById: int("paidById").notNull(),
  occurredAt: datetime("occurredAt").notNull(),
  notes: text("notes"),
  version: int("version").default(1).notNull(),
  active: int("active").default(1).notNull(),
  supersedesId: int("supersedesId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdById: int("createdById").notNull(),
  updatedById: int("updatedById").notNull(),
}, (table) => ({ occurredAt: index("expenses_occurred_at_idx").on(table.occurredAt) }));

export const expenseShares = mysqlTable("expenseShares", {
  expenseId: int("expenseId").notNull(),
  employeeId: int("employeeId").notNull(),
  amountMinor: int("amountMinor").notNull(),
}, (table) => ({ pk: primaryKey({ columns: [table.expenseId, table.employeeId] }) }));

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  payerId: int("payerId").notNull(),
  payeeId: int("payeeId").notNull(),
  amountMinor: int("amountMinor").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  paidAt: datetime("paidAt").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdById: int("createdById").notNull(),
}, (table) => ({ paidAt: index("payments_paid_at_idx").on(table.paidAt) }));

export const activityLog = mysqlTable("activityLog", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").notNull(),
  actorName: varchar("actorName", { length: 180 }).notNull(),
  action: varchar("action", { length: 40 }).notNull(),
  entityType: varchar("entityType", { length: 40 }).notNull(),
  entityId: varchar("entityId", { length: 80 }).notNull(),
  summary: varchar("summary", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ createdAt: index("activity_log_created_at_idx").on(table.createdAt) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type ExpenseShare = typeof expenseShares.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type ActivityLog = typeof activityLog.$inferSelect;
