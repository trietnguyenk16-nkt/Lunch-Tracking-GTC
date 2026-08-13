import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { activityLog, employees, expenseShares, expenses, InsertUser, payments, User, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { splitEvenly, validatePayment } from "./finance";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

function requireDb() {
  if (!_db) throw new Error("Database is not configured");
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, name: user.name, email: user.email, loginMethod: user.loginMethod, role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"), lastSignedIn: user.lastSignedIn ?? new Date() };
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: { name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: values.lastSignedIn, role: values.role } });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listEmployees() {
  return requireDb().select().from(employees).orderBy(employees.name);
}

export async function listExpenses() {
  const db = requireDb();
  const [expenseRows, shareRows] = await Promise.all([db.select().from(expenses).where(eq(expenses.active, 1)).orderBy(desc(expenses.occurredAt)), db.select().from(expenseShares)]);
  return { expenses: expenseRows, shares: shareRows };
}

export async function listPayments() {
  return requireDb().select().from(payments).orderBy(desc(payments.paidAt));
}

export async function listActivity() {
  return requireDb().select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(60);
}

export async function createActivity(actor: User, action: string, entityType: string, entityId: string, summary: string, tx: any = requireDb()) {
  await tx.insert(activityLog).values({ actorUserId: actor.id, actorName: actor.name ?? actor.email ?? "Team member", action, entityType, entityId, summary });
}

export async function createEmployee(actor: User, input: { name: string; avatarUrl?: string }) {
  const db = requireDb();
  return db.transaction(async (tx) => {
    const result = await tx.insert(employees).values({ name: input.name.trim(), avatarUrl: input.avatarUrl || null, createdById: actor.id, updatedById: actor.id });
    const id = Number(result[0].insertId);
    await createActivity(actor, "created", "employee", String(id), `Created employee ${input.name.trim()}`, tx);
    return id;
  });
}

export async function updateEmployee(actor: User, input: { id: number; name: string; avatarUrl?: string }) {
  const db = requireDb();
  return db.transaction(async (tx) => {
    await tx.update(employees).set({ name: input.name.trim(), avatarUrl: input.avatarUrl || null, updatedById: actor.id }).where(eq(employees.id, input.id));
    await createActivity(actor, "updated", "employee", String(input.id), `Updated employee ${input.name.trim()}`, tx);
  });
}

export async function deactivateEmployee(actor: User, id: number) {
  const db = requireDb();
  return db.transaction(async (tx) => {
    await tx.update(employees).set({ active: 0, updatedById: actor.id }).where(eq(employees.id, id));
    await createActivity(actor, "deactivated", "employee", String(id), `Deactivated employee #${id}`, tx);
  });
}

export async function createExpense(actor: User, input: { name: string; category: string; amountMinor: number; currency: string; paidById: number; participantIds: number[]; occurredAt: Date; notes?: string }) {
  const db = requireDb();
  const shares = splitEvenly(input.amountMinor, input.participantIds);
  return db.transaction(async (tx) => {
    const result = await tx.insert(expenses).values({ ...input, name: input.name.trim(), category: input.category.trim(), currency: input.currency.toUpperCase(), notes: input.notes || null, createdById: actor.id, updatedById: actor.id });
    const id = Number(result[0].insertId);
    await tx.insert(expenseShares).values(shares.map((share) => ({ expenseId: id, ...share })));
    await createActivity(actor, "created", "expense", String(id), `Logged ${input.name.trim()} for ${input.amountMinor} minor units`, tx);
    return id;
  });
}

export async function updateExpense(actor: User, input: { id: number; version: number; name: string; category: string; amountMinor: number; currency: string; paidById: number; participantIds: number[]; occurredAt: Date; notes?: string }) {
  const db = requireDb();
  const shares = splitEvenly(input.amountMinor, input.participantIds);
  return db.transaction(async (tx) => {
    const current = await tx.select().from(expenses).where(and(eq(expenses.id, input.id), eq(expenses.version, input.version), eq(expenses.active, 1))).limit(1);
    if (!current[0]) throw new Error("Expense changed since it was loaded; refresh and try again");
    const result = await tx.insert(expenses).values({ name: input.name.trim(), category: input.category.trim(), amountMinor: input.amountMinor, currency: input.currency.toUpperCase(), paidById: input.paidById, occurredAt: input.occurredAt, notes: input.notes || null, version: input.version + 1, active: 1, supersedesId: input.id, createdById: actor.id, updatedById: actor.id });
    const replacementId = Number(result[0].insertId);
    await tx.insert(expenseShares).values(shares.map((share) => ({ expenseId: replacementId, ...share })));
    await tx.update(expenses).set({ active: 0, updatedById: actor.id }).where(and(eq(expenses.id, input.id), eq(expenses.active, 1), eq(expenses.version, input.version)));
    await createActivity(actor, "replaced", "expense", String(replacementId), `Replaced expense #${input.id} with ${input.name.trim()}`, tx);
    return replacementId;
  });
}

export async function deactivateExpense(actor: User, id: number) {
  const db = requireDb();
  return db.transaction(async (tx) => {
    await tx.update(expenses).set({ active: 0, updatedById: actor.id, version: 999999 }).where(and(eq(expenses.id, id), eq(expenses.active, 1)));
    await createActivity(actor, "deactivated", "expense", String(id), `Deactivated expense #${id}`, tx);
  });
}

export async function recordPayment(actor: User, input: { payerId: number; payeeId: number; amountMinor: number; currency: string; paidAt: Date; note?: string }) {
  validatePayment(input);
  const db = requireDb();
  return db.transaction(async (tx) => {
    const result = await tx.insert(payments).values({ ...input, currency: input.currency.toUpperCase(), note: input.note || null, createdById: actor.id });
    const id = Number(result[0].insertId);
    await createActivity(actor, "recorded", "payment", String(id), `Recorded payment of ${input.amountMinor} minor units`, tx);
    return id;
  });
}
