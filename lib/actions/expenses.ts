"use server"

import { db } from "@/db/drizzle"
import { expenses, contacts, accounts } from "@/db/schema"
import { eq, desc, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth" // Assuming you have an auth helper
import { headers } from "next/headers"

const expenseSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  status: z.enum(["draft", "submitted", "approved", "rejected", "reimbursed"]),
  vendorId: z.string().uuid("Invalid vendor ID"),
  accountId: z.string().uuid("Invalid account ID"),
})

export async function getExpenses() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const result = await db
      .select({
        id: expenses.id,
        amount: expenses.amount,
        status: expenses.status,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
        vendor: {
          id: contacts.id,
          name: contacts.name,
          email: contacts.email,
        },
        account: {
          id: accounts.id,
          name: accounts.name,
          type: accounts.type,
        },
      })
      .from(expenses)
      .leftJoin(contacts, eq(expenses.vendorId, contacts.id))
      .leftJoin(accounts, eq(expenses.accountId, accounts.id))
      .where(eq(expenses.userId, session.user.id))
      .orderBy(desc(expenses.createdAt))

    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return { success: false, error: "Failed to fetch expenses" }
  }
}

export async function getExpenseById(id: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const result = await db
      .select({
        id: expenses.id,
        amount: expenses.amount,
        status: expenses.status,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
        vendor: {
          id: contacts.id,
          name: contacts.name,
          email: contacts.email,
        },
        account: {
          id: accounts.id,
          name: accounts.name,
          type: accounts.type,
        },
      })
      .from(expenses)
      .leftJoin(contacts, eq(expenses.vendorId, contacts.id))
      .leftJoin(accounts, eq(expenses.accountId, accounts.id))
      .where(eq(expenses.id, id))
      .limit(1)

    if (result.length === 0) {
      return { success: false, error: "Expense not found" }
    }

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error fetching expense:", error)
    return { success: false, error: "Failed to fetch expense" }
  }
}

export async function createExpense(formData: FormData) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const data = {
      amount: formData.get("amount") as string,
      status: formData.get("status") as "draft" | "submitted" | "approved" | "rejected" | "reimbursed",
      vendorId: formData.get("vendorId") as string,
      accountId: formData.get("accountId") as string,
    }

    const validatedData = expenseSchema.parse(data)

    // Convert amount string to decimal format
    const amountDecimal = Number.parseFloat(validatedData.amount).toFixed(2)

    const result = await db
      .insert(expenses)
      .values({
        amount: amountDecimal,
        status: validatedData.status,
        userId: session.user.id,
        vendorId: validatedData.vendorId,
        accountId: validatedData.accountId,
      })
      .returning()

    revalidatePath("/expenses")
    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error creating expense:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to create expense" }
  }
}

export async function updateExpense(id: string, formData: FormData) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const data = {
      amount: formData.get("amount") as string,
      status: formData.get("status") as "draft" | "submitted" | "approved" | "rejected" | "reimbursed",
      vendorId: formData.get("vendorId") as string,
      accountId: formData.get("accountId") as string,
    }

    const validatedData = expenseSchema.parse(data)

    // Convert amount string to decimal format
    const amountDecimal = Number.parseFloat(validatedData.amount).toFixed(2)

    const result = await db
      .update(expenses)
      .set({
        amount: amountDecimal,
        status: validatedData.status,
        vendorId: validatedData.vendorId,
        accountId: validatedData.accountId,
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, id))
      .returning()

    if (result.length === 0) {
      return { success: false, error: "Expense not found" }
    }

    revalidatePath("/expenses")
    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error updating expense:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to update expense" }
  }
}

export async function deleteExpense(id: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    // Check if expense belongs to the user before deleting
    const expense = await db.select({ userId: expenses.userId }).from(expenses).where(eq(expenses.id, id)).limit(1)

    if (expense.length === 0) {
      return { success: false, error: "Expense not found" }
    }

    if (expense[0].userId !== session.user.id) {
      return { success: false, error: "Unauthorized" }
    }

    await db.delete(expenses).where(eq(expenses.id, id))

    revalidatePath("/expenses")
    return { success: true }
  } catch (error) {
    console.error("Error deleting expense:", error)
    return { success: false, error: "Failed to delete expense" }
  }
}

// Helper function to get vendors (contacts of type 'vendor') for dropdowns
export async function getVendors() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const result = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
      })
      .from(contacts)
      .where(and(eq(contacts.type, "vendor"), eq(contacts.isActive, true)))
      .orderBy(contacts.name)

    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching vendors:", error)
    return { success: false, error: "Failed to fetch vendors" }
  }
}

// Helper function to get accounts for dropdowns
export async function getAccounts() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const result = await db
      .select({
        id: accounts.id,
        name: accounts.name,
        type: accounts.type,
        balance: accounts.balance,
      })
      .from(accounts)
      .where(eq(accounts.isActive, true))
      .orderBy(accounts.name)

    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching accounts:", error)
    return { success: false, error: "Failed to fetch accounts" }
  }
}
