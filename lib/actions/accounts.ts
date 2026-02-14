"use server"

import { db } from "@/db/drizzle"
import { accounts } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["cash", "bank", "mobile", "credit"]),
  description: z.string().optional(),
  balance: z.number(),
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

export async function getAccounts() {
  try {
    const result = await db.select().from(accounts).where(eq(accounts.isActive, true)).orderBy(desc(accounts.createdAt))
    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching accounts:", error)
    return { success: false, error: "Failed to fetch accounts" }
  }
}

export async function createAccount(formData: FormData) {
  try {
    const data = {
      name: formData.get("name") as string,
      type: formData.get("type") as "cash" | "bank" | "mobile" | "credit",
      balance: Number.parseFloat(formData.get("balance") as string) || 0,
      description: formData.get("description") as string,
    }

    console.log("Form Data Object:", data)

    const validatedData = accountSchema.parse(data)

    await db.insert(accounts).values({
      name: validatedData.name,
      type: validatedData.type,
      description: validatedData.description,
      balance: validatedData.balance.toString(),
    })

    revalidatePath("/accounts")
    return { success: true, message: "Account created successfully" }
  } catch (error) {
    console.error("Error creating account:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to create account" }
  }
}

export async function updateAccount(id: string, formData: FormData) {
  try {
    const data = {
      name: formData.get("name") as string,
      type: formData.get("type") as "cash" | "bank" | "mobile" | "credit",
      balance: Number.parseFloat(formData.get("balance") as string),
      description: formData.get("description") as string,
    }

    const validatedData = accountSchema.parse(data)

    await db
      .update(accounts)
      .set({
        name: validatedData.name,
        type: validatedData.type,
        description: validatedData.description,
        balance: validatedData.balance.toString(),
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, id))

    revalidatePath("/accounts")
    return { success: true, message: "Account updated successfully" }
  } catch (error) {
    console.error("Error updating account:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to update account" }
  }
}

export async function deleteAccount(id: string) {
  try {
    await db
      .update(accounts)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, id))

    revalidatePath("/accounts")
    return { success: true, message: "Account deleted successfully" }
  } catch (error) {
    console.error("Error deleting account:", error)
    return { success: false, error: "Failed to delete account" }
  }
}

export async function getAccountsSummary() {
  console.log("Summary")
  try {
    const result = await db.select().from(accounts).where(eq(accounts.isActive, true))

    console.log("Summary", result)

    const summary = {
      totalAccounts: result.length,
      totalBalance: result.reduce((sum, account) => sum + Number.parseFloat(account.balance), 0),
      accountsByType: {
        cash: result.filter((a) => a.type === "cash").reduce((sum, a) => sum + Number.parseFloat(a.balance), 0),
        bank: result.filter((a) => a.type === "bank").reduce((sum, a) => sum + Number.parseFloat(a.balance), 0),
        mobile: result.filter((a) => a.type === "mobile").reduce((sum, a) => sum + Number.parseFloat(a.balance), 0),
        credit: result.filter((a) => a.type === "credit").reduce((sum, a) => sum + Number.parseFloat(a.balance), 0),
      },
    }

    console.log("Summary 2", summary)

    return { success: true, data: summary }
  } catch (error) {
    console.error("Error fetching accounts summary:", error)
    return { success: false, error: "Failed to fetch accounts summary" }
  }
}
