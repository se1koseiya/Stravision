import { NextRequest, NextResponse } from "next/server";
import { verifyResetCode } from "@/lib/email-verification-service";
import { getUserByEmail, updateUser } from "@/lib/db/user-service";

export async function POST(req: NextRequest) {
  try {
    const { email, code, password } = await req.json();

    if (!email || !code || !password) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // Verify code first
    const verification = await verifyResetCode(email, code);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || "验证码无效" },
        { status: 400 }
      );
    }

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    // Update password
    await updateUser(user.id, { password });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "重置密码失败，请稍后重试" },
      { status: 500 }
    );
  }
}
