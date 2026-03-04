import { NextRequest } from 'next/server';
import { initDB, queryOne, query } from '@/lib/db/database';
import { verifyToken } from '@/lib/auth';

// 确保数据库已初始化
let dbInitPromise: Promise<void> | null = null;

async function ensureDB() {
  if (!dbInitPromise) {
    dbInitPromise = initDB();
  }
  await dbInitPromise;
}

export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
    const token = req.cookies.get('auth_token')?.value;
    if (!token) {
      return Response.json({ error: '未授权' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return Response.json({ error: '需要管理员权限' }, { status: 403 });
    }

    await ensureDB();
    // 统计数据
    const stats = {
      // 总验证码数量
      totalVerifications: await queryOne<{ count: string | number }>('SELECT COUNT(*) as count FROM email_verifications'),
      
      // 已使用的验证码
      usedVerifications: await queryOne<{ count: string | number }>('SELECT COUNT(*) as count FROM email_verifications WHERE used = 1'),
      
      // 未使用的验证码
      unusedVerifications: await queryOne<{ count: string | number }>('SELECT COUNT(*) as count FROM email_verifications WHERE used = 0'),
      
      // 过期的验证码
      expiredVerifications: await queryOne<{ count: string | number }>(
        'SELECT COUNT(*) as count FROM email_verifications WHERE expires_at < $1 AND used = 0',
        [Date.now()]
      ),
      
      // 今天发送的验证码
      todayVerifications: await queryOne<{ count: string | number }>(
        'SELECT COUNT(*) as count FROM email_verifications WHERE created_at > $1',
        [Date.now() - 24 * 60 * 60 * 1000]
      ),
      
      // 已验证邮箱的用户数
      verifiedUsers: await queryOne<{ count: string | number }>('SELECT COUNT(*) as count FROM users WHERE email_verified = 1'),
      
      // 未验证邮箱的用户数
      unverifiedUsers: await queryOne<{ count: string | number }>('SELECT COUNT(*) as count FROM users WHERE email_verified = 0'),
      
      // 最近的验证记录
      recentVerifications: await query(`
        SELECT email, code, used, expires_at, created_at 
        FROM email_verifications 
        ORDER BY created_at DESC 
        LIMIT 10
      `),
    };

    return Response.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Get email verification stats error:', error);
    return Response.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
