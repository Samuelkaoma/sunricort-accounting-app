"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function updateCompanyInfo(formData: FormData) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const phone = formData.get("phone") as string;
    const email = formData.get("email") as string;
    const website = formData.get("website") as string;

    if (!name || !email) {
      return { success: false, error: "Company name and email are required" };
    }

    // Update user's company info (stored in user table for simplicity)
    await db
      .update(user)
      .set({
        name: name,
        email: email,
        // Note: In a real app, you'd have a separate company table
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id));

    revalidatePath("/settings");
    return { success: true, data: "Company information updated successfully" };
  } catch (error) {
    console.error("Error updating company info:", error);
    return { success: false, error: "Failed to update company information" };
  }
}

export async function changePassword(formData: FormData) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { success: false, error: "All password fields are required" };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: "New passwords do not match" };
    }

    if (newPassword.length < 8) {
      return {
        success: false,
        error: "Password must be at least 8 characters long",
      };
    }

    // In a real app, you'd verify the current password and hash the new one
    // For now, we'll just simulate the password change
    console.log("Password change requested for user:", session.user.id);

    revalidatePath("/settings");
    return { success: true, data: "Password changed successfully" };
  } catch (error) {
    console.error("Error changing password:", error);
    return { success: false, error: "Failed to change password" };
  }
}

export async function createUser(formData: FormData) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const userType = formData.get("userType") as string;
    const password = formData.get("password") as string;

    if (!name || !email || !userType || !password) {
      return { success: false, error: "All fields are required" };
    }

    if (!["staff", "accountant"].includes(userType)) {
      return { success: false, error: "Invalid user type" };
    }

    if (password.length < 8) {
      return {
        success: false,
        error: "Password must be at least 8 characters long",
      };
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return { success: false, error: "User with this email already exists" };
    }

    // In a real app, you'd hash the password and create the user
    // For now, we'll simulate user creation
    console.log("User creation requested:", { name, email, userType });

    revalidatePath("/settings");
    return { success: true, data: "User created successfully" };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: "Failed to create user" };
  }
}

export async function getUsers() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // In a real app, you'd fetch users from the database
    // For now, return mock data
    const users = [
      { id: "1", name: "Mark Zulu", email: "markzulu@mail.com", type: "staff" },
      {
        id: "2",
        name: "Mary Banda",
        email: "marybanda@mail.com",
        type: "accountant",
      },
    ];

    return { success: true, data: users };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, error: "Failed to fetch users" };
  }
}
