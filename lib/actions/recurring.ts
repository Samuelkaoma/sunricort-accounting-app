"use server"

import { db } from "@/db/drizzle"
import { recurringTransactions, accounts, contacts } from "@/db/schema"
import { eq, desc, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { alias } from "drizzle-orm/pg-core"

const recurringSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  type: z.enum(["income", "expense", "transfer"]),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  fromAccountId: z.string().uuid().optional(),
  toAccountId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
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

export async function getRecurringTransactions() {
  try {
    const userId = await getCurrentUserId()

    const toAccountAlias = alias(accounts, "toAccount")

    const result = await db
      .select({
        id: recurringTransactions.id,
        name: recurringTransactions.name,
        type: recurringTransactions.type,
        amount: recurringTransactions.amount,
        description: recurringTransactions.description,
        frequency: recurringTransactions.frequency,
        startDate: recurringTransactions.startDate,
        endDate: recurringTransactions.endDate,
        nextDate: recurringTransactions.nextDate,
        isActive: recurringTransactions.isActive,
        createdAt: recurringTransactions.createdAt,
        updatedAt: recurringTransactions.updatedAt,
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
      .from(recurringTransactions)
      .leftJoin(accounts, eq(recurringTransactions.fromAccountId, accounts.id))
      .leftJoin(toAccountAlias, eq(recurringTransactions.toAccountId, toAccountAlias.id))
      .leftJoin(contacts, eq(recurringTransactions.contactId, contacts.id))
      .where(eq(recurringTransactions.userId, userId))
      .orderBy(desc(recurringTransactions.createdAt))

    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching recurring transactions:", error)
    return { success: false, error: "Failed to fetch recurring transactions" }
  }
}

export async function createRecurringTransaction(formData: FormData) {
  try {
    const userId = await getCurrentUserId()

    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      amount: formData.get("amount") as string,
      type: formData.get("type") as "income" | "expense" | "transfer",
      frequency: formData.get("frequency") as "daily" | "weekly" | "monthly" | "yearly",
      fromAccountId: (formData.get("fromAccountId") as string) || null,
      toAccountId: (formData.get("toAccountId") as string) || null,
      contactId: (formData.get("contactId") as string) || null,
      startDate: formData.get("startDate") as string,
      endDate: (formData.get("endDate") as string) || null,
    }

    // Clean up empty strings and "none" values to null
    const cleanedData = {
      ...data,
      fromAccountId: data.fromAccountId === "" || data.fromAccountId === "none" ? null : data.fromAccountId,
      toAccountId: data.toAccountId === "" || data.toAccountId === "none" ? null : data.toAccountId,
      contactId: data.contactId === "" || data.contactId === "none" ? null : data.contactId,
      endDate: data.endDate === "" ? null : data.endDate,
    }

    const validatedData = recurringSchema.parse(cleanedData)

    // Convert amount to decimal format
    const amountDecimal = Number.parseFloat(validatedData.amount).toFixed(2)

    // Calculate next date based on frequency
    const startDate = new Date(validatedData.startDate)
    const nextDate = new Date(startDate)

    switch (validatedData.frequency) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + 1)
        break
      case "weekly":
        nextDate.setDate(nextDate.getDate() + 7)
        break
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1)
        break
      case "yearly":
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        break
    }

    const result = await db
      .insert(recurringTransactions)
      .values({
        name: validatedData.name,
        description: validatedData.description,
        amount: amountDecimal,
        type: validatedData.type,
        frequency: validatedData.frequency,
        fromAccountId: validatedData.fromAccountId || null,
        toAccountId: validatedData.toAccountId || null,
        contactId: validatedData.contactId || null,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        nextDate,
        userId: userId,
        isActive: true,
      })
      .returning()

    revalidatePath("/recurring")
    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error creating recurring transaction:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to create recurring transaction" }
  }
}

export async function updateRecurringTransaction(id: string, formData: FormData) {
  try {
    const userId = await getCurrentUserId()

    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      amount: formData.get("amount") as string,
      type: formData.get("type") as "income" | "expense" | "transfer",
      frequency: formData.get("frequency") as "daily" | "weekly" | "monthly" | "yearly",
      fromAccountId: (formData.get("fromAccountId") as string) || null,
      toAccountId: (formData.get("toAccountId") as string) || null,
      contactId: (formData.get("contactId") as string) || null,
      startDate: formData.get("startDate") as string,
      endDate: (formData.get("endDate") as string) || null,
    }

    // Clean up empty strings and "none" values to null
    const cleanedData = {
      ...data,
      fromAccountId: data.fromAccountId === "" || data.fromAccountId === "none" ? null : data.fromAccountId,
      toAccountId: data.toAccountId === "" || data.toAccountId === "none" ? null : data.toAccountId,
      contactId: data.contactId === "" || data.contactId === "none" ? null : data.contactId,
      endDate: data.endDate === "" ? null : data.endDate,
    }

    const validatedData = recurringSchema.parse(cleanedData)

    // Convert amount to decimal format
    const amountDecimal = Number.parseFloat(validatedData.amount).toFixed(2)

    // Recalculate next date if start date or frequency changed
    const startDate = new Date(validatedData.startDate)
    const nextDate = new Date(startDate)

    switch (validatedData.frequency) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + 1)
        break
      case "weekly":
        nextDate.setDate(nextDate.getDate() + 7)
        break
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1)
        break
      case "yearly":
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        break
    }

    const result = await db
      .update(recurringTransactions)
      .set({
        name: validatedData.name,
        description: validatedData.description,
        amount: amountDecimal,
        type: validatedData.type,
        frequency: validatedData.frequency,
        fromAccountId: validatedData.fromAccountId || null,
        toAccountId: validatedData.toAccountId || null,
        contactId: validatedData.contactId || null,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        nextDate,
        updatedAt: new Date(),
      })
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)))
      .returning()

    if (result.length === 0) {
      return {
        success: false,
        error: "Recurring transaction not found or unauthorized",
      }
    }

    revalidatePath("/recurring")
    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error updating recurring transaction:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to update recurring transaction" }
  }
}

export async function deleteRecurringTransaction(id: string) {
  try {
    const userId = await getCurrentUserId()

    const result = await db
      .delete(recurringTransactions)
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)))
      .returning()

    if (result.length === 0) {
      return {
        success: false,
        error: "Recurring transaction not found or unauthorized",
      }
    }

    revalidatePath("/recurring")
    return { success: true }
  } catch (error) {
    console.error("Error deleting recurring transaction:", error)
    return { success: false, error: "Failed to delete recurring transaction" }
  }
}

export async function toggleRecurringTransactionStatus(id: string) {
  try {
    const userId = await getCurrentUserId()

    // First get the current status
    const current = await db
      .select({ isActive: recurringTransactions.isActive })
      .from(recurringTransactions)
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)))
      .limit(1)

    if (current.length === 0) {
      return { success: false, error: "Recurring transaction not found" }
    }

    const result = await db
      .update(recurringTransactions)
      .set({
        isActive: !current[0].isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)))
      .returning()

    revalidatePath("/recurring")
    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error toggling recurring transaction status:", error)
    return {
      success: false,
      error: "Failed to toggle recurring transaction status",
    }
  }
}
