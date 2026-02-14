"use server";

import { db } from "@/db/drizzle";
import { invoices, invoiceItems, contacts } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const invoiceSchema = z.object({
  customerId: z.string().uuid(),
  issueDate: z.string(),
  dueDate: z.string(),
  status: z.enum(["draft", "sent", "paid", "overdue"]), // Removed 'cancelled' as it's not in your schema
  notes: z.string().optional(),
  terms: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional().default(0),
});

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
});

// Get current user ID helper
export async function getCurrentUserId(): Promise<string> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    throw new Error("Unauthorized: No user session found");
  }
  console.log("User ID", session.user.id);
  return session.user.id;
}

export async function getInvoices() {
  try {
    const userId = await getCurrentUserId();

    const result = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerId: invoices.customerId,
        customerName: contacts.name,
        customerEmail: contacts.email,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        subtotal: invoices.subtotal,
        taxRate: invoices.taxRate,
        taxAmount: invoices.taxAmount,
        total: invoices.total,
        paidAmount: invoices.paidAmount,
        notes: invoices.notes,
        terms: invoices.terms,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
      })
      .from(invoices)
      .innerJoin(contacts, eq(invoices.customerId, contacts.id))
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return { success: false, error: "Failed to fetch invoices" };
  }
}

export async function getInvoiceById(id: string) {
  try {
    const userId = await getCurrentUserId();

    const result = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerId: invoices.customerId,
        customerName: contacts.name,
        customerEmail: contacts.email,
        customerAddress: contacts.address,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        subtotal: invoices.subtotal,
        taxRate: invoices.taxRate,
        taxAmount: invoices.taxAmount,
        total: invoices.total,
        paidAmount: invoices.paidAmount,
        notes: invoices.notes,
        terms: invoices.terms,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
      })
      .from(invoices)
      .innerJoin(contacts, eq(invoices.customerId, contacts.id))
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .limit(1);

    if (result.length === 0) {
      return { success: false, error: "Invoice not found" };
    }

    // Fetch invoice items
    const items = await db
      .select({
        id: invoiceItems.id,
        description: invoiceItems.description,
        quantity: invoiceItems.quantity,
        unitPrice: invoiceItems.unitPrice,
        total: invoiceItems.total,
      })
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, id));

    return {
      success: true,
      data: {
        ...result[0],
        items,
      },
    };
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return { success: false, error: "Failed to fetch invoice" };
  }
}

export async function createInvoice(formData: FormData) {
  try {
    const userId = await getCurrentUserId();

    const invoiceData = {
      customerId: formData.get("customerId") as string,
      issueDate: formData.get("issueDate") as string,
      dueDate: formData.get("dueDate") as string,
      status: formData.get("status") as "draft" | "sent" | "paid" | "overdue",
      notes: (formData.get("notes") as string) || "",
      terms: (formData.get("terms") as string) || "",
      taxRate: Number(formData.get("taxRate")) || 0,
    };

    const validatedInvoice = invoiceSchema.parse(invoiceData);

    // Generate invoice number
    const existingInvoices = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.userId, userId));

    const invoiceNumber = `INV-${String(existingInvoices.length + 1).padStart(
      4,
      "0"
    )}`;

    // Parse and validate invoice items
    const itemsData = formData.get("items") as string;
    let items: any[] = [];
    let subtotal = 0;

    if (itemsData) {
      const parsedItems = JSON.parse(itemsData);
      items = parsedItems.map((item: any) => {
        const validatedItem = invoiceItemSchema.parse({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice || item.rate), // Handle both unitPrice and rate
        });
        const total = validatedItem.quantity * validatedItem.unitPrice;
        subtotal += total;
        return {
          ...validatedItem,
          total,
        };
      });
    }

    // Calculate totals
    const taxAmount = (subtotal * validatedInvoice.taxRate) / 100;
    const total = subtotal + taxAmount;

    // Create invoice in database transaction
    const result = await db.transaction(async (tx) => {
      // Insert invoice
      const [newInvoice] = await tx
        .insert(invoices)
        .values({
          invoiceNumber,
          customerId: validatedInvoice.customerId,
          issueDate: new Date(validatedInvoice.issueDate),
          dueDate: new Date(validatedInvoice.dueDate),
          status: validatedInvoice.status,
          subtotal: subtotal.toFixed(2),
          taxRate: validatedInvoice.taxRate.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          total: total.toFixed(2),
          paidAmount: "0.00",
          notes: validatedInvoice.notes || null,
          terms: validatedInvoice.terms || null,
          userId: userId,
        })
        .returning();

      // Insert invoice items
      if (items.length > 0) {
        await tx.insert(invoiceItems).values(
          items.map((item) => ({
            invoiceId: newInvoice.id,
            description: item.description,
            quantity: item.quantity.toFixed(2),
            unitPrice: item.unitPrice.toFixed(2),
            total: item.total.toFixed(2),
          }))
        );
      }

      return newInvoice;
    });

    revalidatePath("/invoices");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating invoice:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.message,
      };
    }
    return { success: false, error: "Failed to create invoice" };
  }
}

export async function updateInvoice(id: string, formData: FormData) {
  try {
    const userId = await getCurrentUserId();

    const invoiceData = {
      customerId: formData.get("customerId") as string,
      issueDate: formData.get("issueDate") as string,
      dueDate: formData.get("dueDate") as string,
      status: formData.get("status") as "draft" | "sent" | "paid" | "overdue",
      notes: (formData.get("notes") as string) || "",
      terms: (formData.get("terms") as string) || "",
      taxRate: Number(formData.get("taxRate")) || 0,
    };

    const validatedInvoice = invoiceSchema.parse(invoiceData);

    // Parse and validate invoice items if provided
    const itemsData = formData.get("items") as string;
    let items: any[] = [];
    let subtotal = 0;

    if (itemsData) {
      const parsedItems = JSON.parse(itemsData);
      items = parsedItems.map((item: any) => {
        const validatedItem = invoiceItemSchema.parse({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice || item.rate),
        });
        const total = validatedItem.quantity * validatedItem.unitPrice;
        subtotal += total;
        return {
          ...validatedItem,
          total,
        };
      });
    }

    // Calculate totals
    const taxAmount = (subtotal * validatedInvoice.taxRate) / 100;
    const total = subtotal + taxAmount;

    // Update invoice in database transaction
    const result = await db.transaction(async (tx) => {
      // Update invoice
      const [updatedInvoice] = await tx
        .update(invoices)
        .set({
          customerId: validatedInvoice.customerId,
          issueDate: new Date(validatedInvoice.issueDate),
          dueDate: new Date(validatedInvoice.dueDate),
          status: validatedInvoice.status,
          subtotal: subtotal.toFixed(2),
          taxRate: validatedInvoice.taxRate.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          total: total.toFixed(2),
          notes: validatedInvoice.notes || null,
          terms: validatedInvoice.terms || null,
          updatedAt: new Date(),
        })
        .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
        .returning();

      if (!updatedInvoice) {
        throw new Error("Invoice not found or unauthorized");
      }

      // Update invoice items if provided
      if (itemsData) {
        // Delete existing items
        await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

        // Insert new items
        if (items.length > 0) {
          await tx.insert(invoiceItems).values(
            items.map((item) => ({
              invoiceId: id,
              description: item.description,
              quantity: item.quantity.toFixed(2),
              unitPrice: item.unitPrice.toFixed(2),
              total: item.total.toFixed(2),
            }))
          );
        }
      }

      return updatedInvoice;
    });

    revalidatePath("/invoices");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating invoice:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.message,
      };
    }
    return { success: false, error: "Failed to update invoice" };
  }
}

export async function deleteInvoice(id: string) {
  try {
    const userId = await getCurrentUserId();

    await db.transaction(async (tx) => {
      // Delete invoice items first (due to foreign key constraint)
      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

      // Delete invoice
      const result = await tx
        .delete(invoices)
        .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
        .returning();

      if (result.length === 0) {
        throw new Error("Invoice not found or unauthorized");
      }
    });

    revalidatePath("/invoices");
    return { success: true };
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return { success: false, error: "Failed to delete invoice" };
  }
}

export async function updateInvoiceStatus(
  id: string,
  status: "draft" | "sent" | "paid" | "overdue"
) {
  try {
    const userId = await getCurrentUserId();

    const [result] = await db
      .update(invoices)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .returning();

    if (!result) {
      return { success: false, error: "Invoice not found or unauthorized" };
    }

    revalidatePath("/invoices");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating invoice status:", error);
    return { success: false, error: "Failed to update invoice status" };
  }
}

// Helper function to get customers for dropdown
export async function getCustomers() {
  try {
    const userId = await getCurrentUserId();

    const result = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        address: contacts.address,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.type, "customer"),
          eq(contacts.userId, userId),
          eq(contacts.isActive, true)
        )
      )
      .orderBy(contacts.name);

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching customers:", error);
    return { success: false, error: "Failed to fetch customers" };
  }
}
