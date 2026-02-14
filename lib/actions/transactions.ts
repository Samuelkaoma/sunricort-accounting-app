"use server"

import { db } from "@/db/drizzle"
import { transactions, accounts, contacts } from "@/db/schema"
import { eq, desc, and } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

const transactionSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  type: z.enum(["income", "expense", "transfer"]),
  status: z.enum(["pending", "completed", "cancelled"]).default("completed"),
  fromAccountId: z.string().uuid().optional(),
  toAccountId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  category: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  transactionDate: z.string(),
})

async function getCurrentUserId(): Promise<string> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user?.id) {
    throw new Error("Unauthorized: No user session found")
  }
  return session.user.id
}

export async function getTransactions() {
  try {
    const userId = await getCurrentUserId()

    const toAccountAlias = alias(accounts, "toAccount")

    const result = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        type: transactions.type,
        status: transactions.status,
        reference: transactions.reference,
        notes: transactions.notes,
        transactionDate: transactions.transactionDate,
        createdAt: transactions.createdAt,
        fromAccountId: transactions.fromAccountId,
        toAccountId: transactions.toAccountId,
        contactId: transactions.contactId,
        fromAccount: {
          id: accounts.id,
          name: accounts.name,
          type: accounts.type,
        },
        toAccount: {
          id: toAccountAlias.id,
          name: toAccountAlias.name,
          type: toAccountAlias.type,
        },
        contact: {
          id: contacts.id,
          name: contacts.name,
          type: contacts.type,
        },
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.fromAccountId, accounts.id))
      .leftJoin(toAccountAlias, eq(transactions.toAccountId, toAccountAlias.id))
      .leftJoin(contacts, eq(transactions.contactId, contacts.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.transactionDate))

    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return { success: false, error: "Failed to fetch transactions" }
  }
}

export async function getAccounts() {
  try {
    const result = await db
      .select({
        id: accounts.id,
        name: accounts.name,
        type: accounts.type,
      })
      .from(accounts)
      .orderBy(accounts.type)

    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching accounts:", error)
    return { success: false, error: "Failed to fetch accounts" }
  }
}

export async function createTransaction(formData: FormData) {
  try {
    const userId = await getCurrentUserId()

    const data = {
      description: formData.get("description") as string,
      amount: formData.get("amount") as string,
      type: formData.get("type") as "income" | "expense" | "transfer",
      status: (formData.get("status") as "pending" | "completed" | "cancelled") || "completed",
      fromAccountId: (formData.get("fromAccountId") as string) || undefined,
      toAccountId: (formData.get("toAccountId") as string) || undefined,
      contactId: (formData.get("contactId") as string) || undefined,
      userId,
      category: (formData.get("category") as string) || undefined,
      reference: (formData.get("reference") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
      transactionDate: formData.get("transactionDate") as string,
    }

    const validatedData = transactionSchema.parse(data)

    const result = await db
      .insert(transactions)
      .values({
        ...validatedData,
        transactionDate: new Date(validatedData.transactionDate),
      })
      .returning()

    revalidatePath("/transactions")
    revalidatePath("/")
    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error creating transaction:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to create transaction" }
  }
}

export async function updateTransaction(id: string, formData: FormData) {
  try {
    const userId = await getCurrentUserId()

    const data = {
      description: formData.get("description") as string,
      amount: formData.get("amount") as string,
      type: formData.get("type") as "income" | "expense" | "transfer",
      status: formData.get("status") as "pending" | "completed" | "cancelled",
      fromAccountId: (formData.get("fromAccountId") as string) || undefined,
      toAccountId: (formData.get("toAccountId") as string) || undefined,
      contactId: (formData.get("contactId") as string) || undefined,
      category: (formData.get("category") as string) || undefined,
      reference: (formData.get("reference") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
      transactionDate: formData.get("transactionDate") as string,
    }

    const validatedData = transactionSchema.parse({
      ...data,
      userId,
    })

    const result = await db
      .update(transactions)
      .set({
        description: validatedData.description,
        amount: validatedData.amount,
        type: validatedData.type,
        status: validatedData.status,
        fromAccountId: validatedData.fromAccountId,
        toAccountId: validatedData.toAccountId,
        contactId: validatedData.contactId,
        reference: validatedData.reference,
        notes: validatedData.notes,
        transactionDate: new Date(validatedData.transactionDate),
        updatedAt: new Date(),
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning()

    revalidatePath("/transactions")
    revalidatePath("/")
    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error updating transaction:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to update transaction" }
  }
}

export async function deleteTransaction(id: string) {
  try {
    const userId = await getCurrentUserId()

    await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)))

    revalidatePath("/transactions")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return { success: false, error: "Failed to delete transaction" }
  }
}

export async function getTransactionsSummary() {
  try {
    const userId = await getCurrentUserId()

    const result = await db.select().from(transactions).where(eq(transactions.userId, userId))

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonth = result.filter((t) => new Date(t.transactionDate) >= startOfMonth)

    const summary = {
      totalTransactions: result.length,
      thisMonthTransactions: thisMonth.length,
      totalIncome: result.filter((t) => t.type === "income").reduce((sum, t) => sum + Number.parseFloat(t.amount), 0),
      totalExpenses: result
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0),
      thisMonthIncome: thisMonth
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0),
      thisMonthExpenses: thisMonth
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0),
    }

    return { success: true, data: summary }
  } catch (error) {
    console.error("Error fetching transactions summary:", error)
    return { success: false, error: "Failed to fetch transactions summary" }
  }
}
