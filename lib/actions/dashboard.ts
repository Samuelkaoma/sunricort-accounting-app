"use server"

import { db } from "@/db/drizzle"
import { accounts, transactions, invoices, expenses } from "@/db/schema"
import { eq, desc, and, gte } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function getDashboardData() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = session.user.id

    const accountsData = await db
      .select()
      .from(accounts)
      .where(eq(accounts.isActive, true))

    const recentTransactions = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        type: transactions.type,
        transactionDate: transactions.transactionDate,
        fromAccountId: transactions.fromAccountId,
        toAccountId: transactions.toAccountId,
      })
      .from(transactions)
      .where(and(eq(transactions.status, "completed"), eq(transactions.userId, userId)))
      .orderBy(desc(transactions.transactionDate))
      .limit(5)

    const processedTransactions = await Promise.all(
      recentTransactions.map(async (transaction) => {
        let accountName = "Unknown"

        if (transaction.fromAccountId) {
          const fromAccount = accountsData.find((acc) => acc.id === transaction.fromAccountId)
          accountName = fromAccount?.name || "Unknown"
        } else if (transaction.toAccountId) {
          const toAccount = accountsData.find((acc) => acc.id === transaction.toAccountId)
          accountName = toAccount?.name || "Unknown"
        }

        return {
          ...transaction,
          fromAccount: transaction.fromAccountId ? accountName : null,
          toAccount: transaction.toAccountId ? accountName : null,
        }
      }),
    )

    // Get financial summary
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const monthlyTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.status, "completed"),
          gte(transactions.transactionDate, startOfMonth),
          eq(transactions.userId, userId),
        ),
      )

    const totalBalance = accountsData.reduce((sum, account) => sum + Number.parseFloat(account.balance), 0)
    const monthlyIncome = monthlyTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0)
    const monthlyExpenses = monthlyTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0)

    // Get invoices summary
    const invoicesData = await db.select().from(invoices).where(eq(invoices.userId, userId))

    const totalInvoiced = invoicesData.reduce((sum, inv) => sum + Number.parseFloat(inv.total), 0)
    const totalPaid = invoicesData.reduce((sum, inv) => sum + Number.parseFloat(inv.paidAmount || "0"), 0)

    // Get expenses summary
    const expensesData = await db.select().from(expenses).where(eq(expenses.userId, userId))

    const pendingExpenses = expensesData.filter((e) => e.status === "submitted").length

    return {
      success: true,
      data: {
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        netIncome: monthlyIncome - monthlyExpenses,
        totalInvoiced,
        totalPaid,
        outstandingAmount: totalInvoiced - totalPaid,
        pendingExpenses,
        recentTransactions: processedTransactions,
        accountsData,
        accountsByType: {
          cash: accountsData.filter((a) => a.type === "cash").reduce((sum, a) => sum + Number.parseFloat(a.balance), 0),
          bank: accountsData.filter((a) => a.type === "bank").reduce((sum, a) => sum + Number.parseFloat(a.balance), 0),
          mobile: accountsData
            .filter((a) => a.type === "mobile")
            .reduce((sum, a) => sum + Number.parseFloat(a.balance), 0),
          credit: accountsData
            .filter((a) => a.type === "credit")
            .reduce((sum, a) => sum + Number.parseFloat(a.balance), 0),
        },
      },
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return { success: false, error: "Failed to fetch dashboard data" }
  }
}
