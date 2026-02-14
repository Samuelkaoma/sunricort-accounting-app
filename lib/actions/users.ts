"use server";

import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { APIError } from "better-auth";
import { tr } from "date-fns/locale";

export const signIn = async (email: string, password: string) => {
  try {
    const response = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });
    return response;
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

export const signUp = async (
  name: string,
  email: string,
  password: string,
  role?: string
) => {
  await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      role,
    },
  });
};
const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: z.enum(["admin", "accountant", "user"]),
});

export async function getUsers() {
  try {
    const result = await db.select().from(user);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, error: "Failed to fetch users" };
  }
}

export async function createUser(formData: FormData) {
  try {
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      role: formData.get("role") as "admin" | "accountant" | "user",
    };

    const validatedData = userSchema.parse(data);

    const result = await signUp(
      validatedData.name,
      validatedData.email,
      validatedData.password,
      validatedData.role
    );

    revalidatePath("/settings");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: "Failed to create user" };
  }
}

export async function updateUser(id: string, formData: FormData) {
  try {
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as "admin" | "accountant" | "user",
    };

    const validatedData = userSchema.parse(data);

    const result = await db
      .update(user)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning();

    revalidatePath("/settings");
    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: "Failed to update user" };
  }
}

export async function deleteUser(id: string) {
  try {
    await db.delete(user).where(eq(user.id, id));

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}


export async function isAdminCreated() {
  try {
    const userCount = await db.select({count: count()}).from(user);
    if(userCount[0].count > 0) {
      return true
    } else {
      return false
    }
  } catch (error) {
    console.error("Error checking if admin user exists:", error);
    return false
  }
}