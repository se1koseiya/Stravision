import { NextRequest, NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/email-verification-service";
import { getUserByEmail } from "@/lib/db/user-service";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "请输入邮箱地址" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await getUserByEmail(email);
    if (!user) {
      // For better security, we might want to return success even if user doesn't exist
      // But for better UX in this context, we'll return an error
      return NextResponse.json(
        { error: "该邮箱未注册" },
        { status: 404 }
      );
    }

    const result = await sendPasswordResetEmail(email);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "发送验证码失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "服务异常，请稍后重试" },
      { status: 500 }
    );
  }
}
