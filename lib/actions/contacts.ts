"use server"

import { db } from "@/db/drizzle"
import { contacts } from "@/db/schema"
import { eq, desc, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  type: z.enum(["customer", "vendor"]),
  taxId: z.string().optional(),
})

// Get current user ID helper
async function getCurrentUserId(): Promise<string> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user?.id) {
    throw new Error("Unauthorized: No user session found")
  }
  return session.user.id
}

export async function getContacts(type?: "customer" | "vendor") {
  try {
    const userId = await getCurrentUserId()

    let whereConditions = and(eq(contacts.isActive, true), eq(contacts.userId, userId))

    if (type) {
      whereConditions = and(eq(contacts.isActive, true), eq(contacts.userId, userId), eq(contacts.type, type))
    }

    const result = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        phone: contacts.phone,
        address: contacts.address,
        type: contacts.type,
        taxId: contacts.taxId,
        balance: contacts.balance,
        isActive: contacts.isActive,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .where(whereConditions)
      .orderBy(desc(contacts.createdAt))

    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching contacts:", error)
    return { success: false, error: "Failed to fetch contacts" }
  }
}

export async function getContactById(id: string) {
  try {
    const userId = await getCurrentUserId()

    const result = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        phone: contacts.phone,
        address: contacts.address,
        type: contacts.type,
        taxId: contacts.taxId,
        balance: contacts.balance,
        isActive: contacts.isActive,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
      .limit(1)

    if (result.length === 0) {
      return { success: false, error: "Contact not found" }
    }

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error fetching contact:", error)
    return { success: false, error: "Failed to fetch contact" }
  }
}

export async function createContact(formData: FormData) {
  try {
    const userId = await getCurrentUserId()

    const data = {
      name: formData.get("name") as string,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      address: (formData.get("address") as string) || null,
      type: formData.get("type") as "customer" | "vendor",
      taxId: (formData.get("taxId") as string) || null,
    }

    // Clean up empty strings to null for optional fields
    const cleanedData = {
      ...data,
      email: data.email === "" ? null : data.email,
      phone: data.phone === "" ? null : data.phone,
      address: data.address === "" ? null : data.address,
      taxId: data.taxId === "" ? null : data.taxId,
    }

    const validatedData = contactSchema.parse(cleanedData)

    const result = await db
      .insert(contacts)
      .values({
        ...validatedData,
        userId: userId,
        balance: "0.00", // Default balance
      })
      .returning()

    revalidatePath("/contacts")
    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error creating contact:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to create contact" }
  }
}

export async function updateContact(id: string, formData: FormData) {
  try {
    const userId = await getCurrentUserId()

    const data = {
      name: formData.get("name") as string,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      address: (formData.get("address") as string) || null,
      type: formData.get("type") as "customer" | "vendor",
      taxId: (formData.get("taxId") as string) || null,
    }

    // Clean up empty strings to null for optional fields
    const cleanedData = {
      ...data,
      email: data.email === "" ? null : data.email,
      phone: data.phone === "" ? null : data.phone,
      address: data.address === "" ? null : data.address,
      taxId: data.taxId === "" ? null : data.taxId,
    }

    const validatedData = contactSchema.parse(cleanedData)

    const result = await db
      .update(contacts)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
      .returning()

    if (result.length === 0) {
      return { success: false, error: "Contact not found or unauthorized" }
    }

    revalidatePath("/contacts")
    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error updating contact:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to update contact" }
  }
}

export async function deleteContact(id: string) {
  try {
    const userId = await getCurrentUserId()

    // Check if contact has any associated transactions, invoices, or expenses
    // You might want to prevent deletion if there are dependencies
    const result = await db
      .update(contacts)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
      .returning()

    if (result.length === 0) {
      return { success: false, error: "Contact not found or unauthorized" }
    }

    revalidatePath("/contacts")
    return { success: true }
  } catch (error) {
    console.error("Error deleting contact:", error)
    return { success: false, error: "Failed to delete contact" }
  }
}

export async function getContactsSummary() {
  try {
    const userId = await getCurrentUserId()

    const result = await db
      .select({
        type: contacts.type,
        balance: contacts.balance,
      })
      .from(contacts)
      .where(and(eq(contacts.isActive, true), eq(contacts.userId, userId)))

    const summary = {
      totalContacts: result.length,
      customers: result.filter((c) => c.type === "customer").length,
      vendors: result.filter((c) => c.type === "vendor").length,
      totalCustomerBalance: result
        .filter((c) => c.type === "customer")
        .reduce((sum, c) => sum + Number.parseFloat(c.balance || "0"), 0),
      totalVendorBalance: result
        .filter((c) => c.type === "vendor")
        .reduce((sum, c) => sum + Number.parseFloat(c.balance || "0"), 0),
    }

    return { success: true, data: summary }
  } catch (error) {
    console.error("Error fetching contacts summary:", error)
    return { success: false, error: "Failed to fetch contacts summary" }
  }
}

// Helper functions for dropdowns
export async function getCustomers() {
  try {
    const userId = await getCurrentUserId()

    const result = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        address: contacts.address,
      })
      .from(contacts)
      .where(and(eq(contacts.type, "customer"), eq(contacts.userId, userId), eq(contacts.isActive, true)))
      .orderBy(contacts.name)

    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching customers:", error)
    return { success: false, error: "Failed to fetch customers" }
  }
}

export async function getVendors() {
  try {
    const userId = await getCurrentUserId()

    const result = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
      })
      .from(contacts)
      .where(and(eq(contacts.type, "vendor"), eq(contacts.userId, userId), eq(contacts.isActive, true)))
      .orderBy(contacts.name)

    return { success: true, data: result }
  } catch (error) {
    console.error("Error fetching vendors:", error)
    return { success: false, error: "Failed to fetch vendors" }
  }
}

// Update contact balance (for when payments are made)
export async function updateContactBalance(id: string, newBalance: number) {
  try {
    const userId = await getCurrentUserId()

    const result = await db
      .update(contacts)
      .set({
        balance: newBalance.toFixed(2),
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
      .returning()

    if (result.length === 0) {
      return { success: false, error: "Contact not found or unauthorized" }
    }

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Error updating contact balance:", error)
    return { success: false, error: "Failed to update contact balance" }
  }
}
