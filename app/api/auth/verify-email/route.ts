import { NextRequest } from 'next/server';
import { verifyEmailCode } from '@/lib/email-verification-service';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const verifyEmailSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  code: z.string().length(6, '验证码必须是6位数字'),
});

export async function POST(req: NextRequest) {
  try {
    // 速率限制：每个IP每分钟最多5次验证尝试
    const limiter = rateLimit(req, { limit: 5, windowMs: 60 * 1000 });
    if (!limiter.success) {
      return Response.json(
        { error: '验证尝试过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = verifyEmailSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, code } = result.data;

    // 验证验证码
    const verifyResult = await verifyEmailCode(email, code);

    if (!verifyResult.valid) {
      return Response.json(
        { error: verifyResult.error || '验证失败' },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: '邮箱验证成功',
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return Response.json(
      { error: '服务异常，请稍后重试' },
      { status: 500 }
    );
  }
}
