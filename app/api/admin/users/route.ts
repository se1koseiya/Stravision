import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createUser, getAllUsers } from "@/lib/db/user-service";
import { z } from "zod";
import { usernameSchema, emailSchema, passwordSchema, avatarUrlSchema } from "@/lib/validations/auth";

const createUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["user", "admin", "super_admin"]).optional(),
  permissions: z.any().optional(),
  avatar_url: avatarUrlSchema,
});

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const result = createUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const newUser = await createUser(result.data);
    return NextResponse.json(newUser);
  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
