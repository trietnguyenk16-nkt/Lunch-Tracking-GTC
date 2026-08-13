import { z } from "zod";
import { calculateBalances, simplifyDebts } from "./finance";
import { createEmployee, createExpense, deactivateEmployee, deactivateExpense, listActivity, listEmployees, listExpenses, listPayments, recordPayment, updateEmployee, updateExpense } from "./db";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";

const moneyInput = z.number().int().positive();
const dateInput = z.string().datetime();

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  team: router({
    snapshot: protectedProcedure.query(async () => {
      const [employeeRows, expenseData, paymentRows, activityRows] = await Promise.all([listEmployees(), listExpenses(), listPayments(), listActivity()]);
      const balances = calculateBalances(employeeRows, expenseData.expenses, expenseData.shares, paymentRows);
      return { employees: employeeRows, expenses: expenseData.expenses, shares: expenseData.shares, payments: paymentRows, balances, suggestions: simplifyDebts(balances), activity: activityRows };
    }),
    createEmployee: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(160), avatarUrl: z.string().url().optional() })).mutation(({ ctx, input }) => createEmployee(ctx.user, input)),
    updateEmployee: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(1).max(160), avatarUrl: z.string().url().optional() })).mutation(({ ctx, input }) => updateEmployee(ctx.user, input)),
    deactivateEmployee: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deactivateEmployee(ctx.user, input.id)),
    createExpense: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(180), category: z.string().trim().min(1).max(80), amountMinor: moneyInput, currency: z.string().length(3), paidById: z.number().int().positive(), participantIds: z.array(z.number().int().positive()).min(1), occurredAt: dateInput, notes: z.string().max(2000).optional() })).mutation(({ ctx, input }) => createExpense(ctx.user, { ...input, occurredAt: new Date(input.occurredAt) })),
    updateExpense: protectedProcedure.input(z.object({ id: z.number().int().positive(), version: z.number().int().positive(), name: z.string().trim().min(1).max(180), category: z.string().trim().min(1).max(80), amountMinor: moneyInput, currency: z.string().length(3), paidById: z.number().int().positive(), participantIds: z.array(z.number().int().positive()).min(1), occurredAt: dateInput, notes: z.string().max(2000).optional() })).mutation(({ ctx, input }) => updateExpense(ctx.user, { ...input, occurredAt: new Date(input.occurredAt) })),
    deactivateExpense: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deactivateExpense(ctx.user, input.id)),
    recordPayment: protectedProcedure.input(z.object({ payerId: z.number().int().positive(), payeeId: z.number().int().positive(), amountMinor: moneyInput, currency: z.string().length(3), paidAt: dateInput, note: z.string().max(2000).optional() })).mutation(({ ctx, input }) => recordPayment(ctx.user, { ...input, paidAt: new Date(input.paidAt) })),
  }),
});

export type AppRouter = typeof appRouter;
