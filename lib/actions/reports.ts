"use server"

import { drizzle } from "drizzle-orm/neon-http"
import { accounts, contacts, transactions, invoices, expenses } from "@/db/schema"
import { eq, and, gte, lte, sum, count, sql, desc, asc } from "drizzle-orm"
import { getCurrentUserId } from "./invoices"
import { db } from "@/db/drizzle"


export async function getFinancialKPIs(startDate: string, endDate: string) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: "Unauthorized" }
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Get revenue from paid invoices
    const revenueResult = await db
      .select({
        total: sum(invoices.paidAmount),
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, userId),
          gte(invoices.issueDate, start),
          lte(invoices.issueDate, end),
          eq(invoices.status, "paid"),
        ),
      )

    // Get expenses
    const expenseResult = await db
      .select({
        total: sum(expenses.amount),
      })
      .from(expenses)
      .where(and(eq(expenses.userId, userId), gte(expenses.createdAt, start), lte(expenses.createdAt, end)))

    // Get current assets (account balances)
    const assetsResult = await db
      .select({
        total: sum(accounts.balance),
      })
      .from(accounts)
      .where(eq(accounts.isActive, true))

    // Get outstanding receivables
    const receivablesResult = await db
      .select({
        total: sum(sql`${invoices.total} - ${invoices.paidAmount}`),
      })
      .from(invoices)
      .where(and(eq(invoices.userId, userId), sql`${invoices.total} > ${invoices.paidAmount}`))

    const revenue = Number(revenueResult[0]?.total || 0)
    const totalExpenses = Number(expenseResult[0]?.total || 0)
    const assets = Number(assetsResult[0]?.total || 0)
    const receivables = Number(receivablesResult[0]?.total || 0)

    const grossProfit = revenue - totalExpenses
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
    const netMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
    const currentRatio = assets > 0 ? assets / Math.max(totalExpenses, 1) : 0

    return {
      success: true,
      data: {
        revenue,
        expenses: totalExpenses,
        grossProfit,
        grossMargin,
        netMargin,
        currentRatio,
        assets,
        receivables,
      },
    }
  } catch (error) {
    console.error("Error fetching KPIs:", error)
    return { success: false, error: "Failed to fetch KPIs" }
  }
}

export async function getProfitLossReport(startDate: string, endDate: string) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: "Unauthorized" }
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Get revenue by month
    const revenueData = await db
      .select({
        month: sql`DATE_TRUNC('month', ${invoices.issueDate})`.as("month"),
        revenue: sum(invoices.paidAmount),
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, userId),
          gte(invoices.issueDate, start),
          lte(invoices.issueDate, end),
          eq(invoices.status, "paid"),
        ),
      )
      .groupBy(sql`DATE_TRUNC('month', ${invoices.issueDate})`)
      .orderBy(asc(sql`DATE_TRUNC('month', ${invoices.issueDate})`))

    // Get expenses by month
    const expenseData = await db
      .select({
        month: sql`DATE_TRUNC('month', ${expenses.createdAt})`.as("month"),
        expenses: sum(expenses.amount),
      })
      .from(expenses)
      .where(and(eq(expenses.userId, userId), gte(expenses.createdAt, start), lte(expenses.createdAt, end)))
      .groupBy(sql`DATE_TRUNC('month', ${expenses.createdAt})`)
      .orderBy(asc(sql`DATE_TRUNC('month', ${expenses.createdAt})`))

    return {
      success: true,
      data: {
        revenue: revenueData,
        expenses: expenseData,
      },
    }
  } catch (error) {
    console.error("Error fetching P&L report:", error)
    return { success: false, error: "Failed to fetch P&L report" }
  }
}

export async function getBalanceSheetReport() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: "Unauthorized" }
    }

    // Get assets by account type
    const assetsData = await db
      .select({
        type: accounts.type,
        balance: sum(accounts.balance),
      })
      .from(accounts)
      .where(eq(accounts.isActive, true))
      .groupBy(accounts.type)

    // Get receivables
    const receivablesData = await db
      .select({
        total: sum(sql`${invoices.total} - ${invoices.paidAmount}`),
      })
      .from(invoices)
      .where(and(eq(invoices.userId, userId), sql`${invoices.total} > ${invoices.paidAmount}`))

    return {
      success: true,
      data: {
        assets: assetsData,
        receivables: Number(receivablesData[0]?.total || 0),
      },
    }
  } catch (error) {
    console.error("Error fetching balance sheet:", error)
    return { success: false, error: "Failed to fetch balance sheet" }
  }
}

export async function getCashFlowReport(startDate: string, endDate: string) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: "Unauthorized" }
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Get cash flow by transaction type and month
    const cashFlowData = await db
      .select({
        month: sql`DATE_TRUNC('month', ${transactions.transactionDate})`.as("month"),
        type: transactions.type,
        amount: sum(transactions.amount),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, start),
          lte(transactions.transactionDate, end),
          eq(transactions.status, "completed"),
        ),
      )
      .groupBy(sql`DATE_TRUNC('month', ${transactions.transactionDate})`, transactions.type)
      .orderBy(asc(sql`DATE_TRUNC('month', ${transactions.transactionDate})`))

    return {
      success: true,
      data: cashFlowData,
    }
  } catch (error) {
    console.error("Error fetching cash flow report:", error)
    return { success: false, error: "Failed to fetch cash flow report" }
  }
}

export async function getExpenseAnalysisReport(startDate: string, endDate: string) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: "Unauthorized" }
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Get expenses by vendor
    const expensesByVendor = await db
      .select({
        vendorName: contacts.name,
        amount: sum(expenses.amount),
        count: count(expenses.id),
      })
      .from(expenses)
      .innerJoin(contacts, eq(expenses.vendorId, contacts.id))
      .where(and(eq(expenses.userId, userId), gte(expenses.createdAt, start), lte(expenses.createdAt, end)))
      .groupBy(contacts.name)
      .orderBy(desc(sum(expenses.amount)))

    // Get expenses by status
    const expensesByStatus = await db
      .select({
        status: expenses.status,
        amount: sum(expenses.amount),
        count: count(expenses.id),
      })
      .from(expenses)
      .where(and(eq(expenses.userId, userId), gte(expenses.createdAt, start), lte(expenses.createdAt, end)))
      .groupBy(expenses.status)

    return {
      success: true,
      data: {
        byVendor: expensesByVendor,
        byStatus: expensesByStatus,
      },
    }
  } catch (error) {
    console.error("Error fetching expense analysis:", error)
    return { success: false, error: "Failed to fetch expense analysis" }
  }
}

export async function getRevenueAnalysisReport(startDate: string, endDate: string) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: "Unauthorized" }
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Get revenue by customer
    const revenueByCustomer = await db
      .select({
        customerName: contacts.name,
        amount: sum(invoices.paidAmount),
        count: count(invoices.id),
      })
      .from(invoices)
      .innerJoin(contacts, eq(invoices.customerId, contacts.id))
      .where(and(eq(invoices.userId, userId), gte(invoices.issueDate, start), lte(invoices.issueDate, end)))
      .groupBy(contacts.name)
      .orderBy(desc(sum(invoices.paidAmount)))

    // Get revenue by status
    const revenueByStatus = await db
      .select({
        status: invoices.status,
        amount: sum(invoices.total),
        count: count(invoices.id),
      })
      .from(invoices)
      .where(and(eq(invoices.userId, userId), gte(invoices.issueDate, start), lte(invoices.issueDate, end)))
      .groupBy(invoices.status)

    return {
      success: true,
      data: {
        byCustomer: revenueByCustomer,
        byStatus: revenueByStatus,
      },
    }
  } catch (error) {
    console.error("Error fetching revenue analysis:", error)
    return { success: false, error: "Failed to fetch revenue analysis" }
  }
}

export async function getTaxReport(startDate: string, endDate: string) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: "Unauthorized" }
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Get tax data from invoices
    const taxData = await db
      .select({
        month: sql`DATE_TRUNC('month', ${invoices.issueDate})`.as("month"),
        taxAmount: sum(invoices.taxAmount),
        subtotal: sum(invoices.subtotal),
        total: sum(invoices.total),
      })
      .from(invoices)
      .where(and(eq(invoices.userId, userId), gte(invoices.issueDate, start), lte(invoices.issueDate, end)))
      .groupBy(sql`DATE_TRUNC('month', ${invoices.issueDate})`)
      .orderBy(asc(sql`DATE_TRUNC('month', ${invoices.issueDate})`))

    return {
      success: true,
      data: taxData,
    }
  } catch (error) {
    console.error("Error fetching tax report:", error)
    return { success: false, error: "Failed to fetch tax report" }
  }
}
