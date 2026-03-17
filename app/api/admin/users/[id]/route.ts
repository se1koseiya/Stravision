import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserById, updateUser, toPublicUser } from "@/lib/db/user-service";
import { z } from "zod";
import { usernameSchema, passwordSchema, avatarUrlSchema } from "@/lib/validations/auth";

const updateUserSchema = z.object({
  username: usernameSchema.optional(),
  password: passwordSchema.optional().or(z.literal("")),
  role: z.enum(["user", "admin", "super_admin"]).optional(),
  membership: z.enum(["free", "pro", "plus"]).optional(),
  permissions: z.any().optional(),
  avatar_url: avatarUrlSchema,
  daily_ai_limit: z.number().min(0).optional(),
  ai_balance: z.number().min(0).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id);
    const body = await req.json();
    
    // Validate input
    const result = updateUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const input = result.data;
    
    // Remove empty password if sent
    if (input.password === "") {
        delete input.password;
    }

    // Check target user
    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Authorization checks
    if (currentUser.role === 'admin') {
      // Admin cannot update Super Admin or other Admins
      if (targetUser.role === 'super_admin' || targetUser.role === 'admin') {
         return NextResponse.json({ error: "Admins cannot modify other admins or super admins" }, { status: 403 });
      }
      
      // Admin cannot promote users to Admin or Super Admin
      if (input.role && (input.role === 'admin' || input.role === 'super_admin')) {
        return NextResponse.json({ error: "Admins cannot promote users to admin roles" }, { status: 403 });
      }
    }

    const updatedUser = await updateUser(userId, input);
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
