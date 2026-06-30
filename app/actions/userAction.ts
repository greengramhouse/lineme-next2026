"use server";

import { prisma } from "@/lib/prisma";

export async function saveUserNameAction(
  lineId: string, 
  userName: string, 
  email?: string | null,
  displayName?: string,
  pictureUrl?: string
) {
  if (!lineId) {
    return { success: false, error: "LINE ID is required" };
  }
  
  if (!userName || userName.length <= 3) {
    return { success: false, error: "UserName must be longer than 3 characters" };
  }

  try {
    const user = await prisma.user.upsert({
      where: { lineId },
      update: {
        userName,
        ...(email && { email }),
        ...(displayName && { displayName }),
        ...(pictureUrl && { pictureUrl }),
      },
      create: {
        lineId,
        displayName: displayName || "Unknown",
        pictureUrl,
        userName,
        ...(email && { email }),
      }
    });

    return { success: true, user };
  } catch (error) {
    console.error("Failed to save user name:", error);
    return { success: false, error: "Failed to save to database" };
  }
}
