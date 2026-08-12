import { NextRequest } from 'next/server';
import { sendVerificationEmail } from '@/lib/email-verification-service';
import { rateLimit } from '@/lib/rate-limit';
import { verifyCapToken, isCapRequired } from '@/lib/cap';
import { z } from 'zod';

// 测试环境（isCapRequired()===false）不强制要求 capToken
const capTokenSchema = isCapRequired()
  ? z.string().min(1, '请完成人机验证')
  : z.string().optional();

const sendVerificationSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  capToken: capTokenSchema,
});

export async function POST(req: NextRequest) {
  try {
    // 严格的速率限制：每个IP每分钟最多3次请求
    const limiter = rateLimit(req, { limit: 3, windowMs: 60 * 1000 });
    if (!limiter.success) {
      return Response.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = sendVerificationSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, capToken } = result.data;

    // 服务端校验 Cap 人机验证令牌
    const capResult = await verifyCapToken(capToken);
    if (!capResult.success) {
      return Response.json(
        { error: capResult.error || '人机验证失败，请重试' },
        { status: 400 }
      );
    }

    // 发送验证码
    const sendResult = await sendVerificationEmail(email);

    if (!sendResult.success) {
      return Response.json(
        { error: sendResult.error || '发送验证码失败' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: '验证码已发送，请查收邮件',
    });
  } catch (error) {
    console.error('Send verification error:', error);
    return Response.json(
      { error: '服务异常，请稍后重试' },
      { status: 500 }
    );
  }
}
