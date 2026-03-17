# 邮箱验证功能 - 使用示例

## 前端集成示例

### React 组件示例

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export function EmailVerificationForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');

  // 发送验证码
  const sendCode = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || '发送失败');
        return;
      }
      
      setCountdown(60);
      // 启动倒计时
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 验证邮箱
  const verifyEmail = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || '验证失败');
        return;
      }
      
      // 验证成功，继续注册流程
      console.log('邮箱验证成功');
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="请输入邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          onClick={sendCode}
          disabled={loading || countdown > 0 || !email}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : countdown > 0 ? (
            `${countdown}秒`
          ) : (
            '获取验证码'
          )}
        </Button>
      </div>
      
      <Input
        type="text"
        placeholder="请输入6位验证码"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
      />
      
      <Button onClick={verifyEmail} disabled={loading || !code}>
        验证邮箱
      </Button>
      
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
```

## API 调用示例

### JavaScript/TypeScript

```typescript
// 发送验证码
async function sendVerificationCode(email: string) {
  const response = await fetch('/api/auth/send-verification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '发送失败');
  }
  
  return await response.json();
}

// 验证邮箱
async function verifyEmail(email: string, code: string) {
  const response = await fetch('/api/auth/verify-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '验证失败');
  }
  
  return await response.json();
}

// 使用示例
try {
  await sendVerificationCode('user@example.com');
  console.log('验证码已发送');
  
  // 用户输入验证码后
  await verifyEmail('user@example.com', '123456');
  console.log('邮箱验证成功');
} catch (error) {
  console.error('错误:', error.message);
}
```

### cURL

```bash
# 发送验证码
curl -X POST http://localhost:3000/api/auth/send-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'

# 验证邮箱
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","code":"123456"}'
```

## 后端服务集成示例

### 在其他 API 中检查邮箱验证状态

```typescript
import { isEmailVerified } from '@/lib/email-verification-service';

export async function POST(req: Request) {
  const { email } = await req.json();
  
  // 检查邮箱是否已验证
  const verified = await isEmailVerified(email);
  
  if (!verified) {
    return Response.json(
      { error: '请先验证邮箱' },
      { status: 400 }
    );
  }
  
  // 继续处理...
}
```

### 定时清理过期验证码

```typescript
// lib/scheduler/cleanup-verifications.ts
import { cleanupExpiredVerifications } from '@/lib/email-verification-service';
import cron from 'node-cron';

// 每天凌晨2点清理过期验证码
cron.schedule('0 2 * * *', async () => {
  console.log('开始清理过期验证码...');
  await cleanupExpiredVerifications();
  console.log('清理完成');
});
```

## 自定义邮件模板

### 修改邮件样式

编辑 `lib/email-verification-service.ts` 中的 HTML 模板：

```typescript
const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        /* 自定义样式 */
        .container {
          background: linear-gradient(135deg, #your-color-1, #your-color-2);
        }
        .code {
          color: #your-brand-color;
        }
      </style>
    </head>
    <body>
      <!-- 自定义内容 -->
    </body>
  </html>
`;
```

### 多语言支持

```typescript
// lib/email-templates.ts
export function getVerificationEmailHTML(code: string, lang: 'zh' | 'en' = 'zh') {
  const translations = {
    zh: {
      title: '验证您的邮箱',
      message: '感谢您注册 Stravision！请使用以下验证码完成注册：',
      expiry: '此验证码将在 10分钟 后失效',
      warning: '如果这不是您的操作，请忽略此邮件',
    },
    en: {
      title: 'Verify Your Email',
      message: 'Thank you for registering with Stravision! Please use the following code to complete your registration:',
      expiry: 'This code will expire in 10 minutes',
      warning: 'If you did not request this, please ignore this email',
    },
  };
  
  const t = translations[lang];
  
  return `
    <html>
      <body>
        <h2>${t.title}</h2>
        <p>${t.message}</p>
        <div class="code">${code}</div>
        <p>${t.expiry}</p>
        <p>${t.warning}</p>
      </body>
    </html>
  `;
}
```

## 错误处理示例

### 完整的错误处理

```typescript
async function handleEmailVerification(email: string, code: string) {
  try {
    const response = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // 根据不同错误类型处理
      switch (response.status) {
        case 400:
          if (data.error.includes('过期')) {
            return { success: false, error: '验证码已过期，请重新获取' };
          }
          if (data.error.includes('无效')) {
            return { success: false, error: '验证码错误，请检查后重试' };
          }
          break;
        case 429:
          return { success: false, error: '请求过于频繁，请稍后再试' };
        case 500:
          return { success: false, error: '服务器错误，请稍后重试' };
      }
      
      return { success: false, error: data.error || '验证失败' };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Network error:', error);
    return { success: false, error: '网络连接失败，请检查网络后重试' };
  }
}
```

## 测试示例

### Jest 单元测试

```typescript
import { sendVerificationEmail, verifyEmailCode } from '@/lib/email-verification-service';

describe('Email Verification Service', () => {
  it('should send verification email', async () => {
    const result = await sendVerificationEmail('test@example.com');
    expect(result.success).toBe(true);
  });
  
  it('should verify correct code', async () => {
    const email = 'test@example.com';
    
    // 发送验证码
    await sendVerificationEmail(email);
    
    // 从数据库获取验证码（测试环境）
    const code = '123456'; // 实际应从数据库查询
    
    // 验证
    const result = await verifyEmailCode(email, code);
    expect(result.valid).toBe(true);
  });
  
  it('should reject expired code', async () => {
    const result = await verifyEmailCode('test@example.com', '000000');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('过期');
  });
});
```

### E2E 测试（Playwright）

```typescript
import { test, expect } from '@playwright/test';

test('email verification flow', async ({ page }) => {
  // 访问注册页面
  await page.goto('/register');
  
  // 输入邮箱
  await page.fill('input[type="email"]', 'test@example.com');
  
  // 点击获取验证码
  await page.click('button:has-text("获取验证码")');
  
  // 等待成功提示
  await expect(page.locator('text=验证码已发送')).toBeVisible();
  
  // 输入验证码（需要从邮箱获取）
  await page.fill('input[placeholder*="验证码"]', '123456');
  
  // 继续注册流程
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("注册")');
  
  // 验证注册成功
  await expect(page).toHaveURL('/dashboard');
});
```

## 性能优化示例

### 使用 Redis 缓存验证码

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// 保存验证码到 Redis（10分钟过期）
async function saveVerificationCode(email: string, code: string) {
  await redis.setex(`verification:${email}`, 600, code);
}

// 验证并删除验证码
async function verifyAndDeleteCode(email: string, code: string) {
  const storedCode = await redis.get(`verification:${email}`);
  
  if (storedCode === code) {
    await redis.del(`verification:${email}`);
    return { valid: true };
  }
  
  return { valid: false, error: '验证码无效或已过期' };
}
```

### 批量发送邮件

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendBatchVerificationEmails(emails: string[]) {
  const emailPromises = emails.map(email => {
    const code = generateVerificationCode();
    return resend.emails.send({
      from: 'Stravision <noreply@stravision.ai>',
      to: email,
      subject: '验证您的邮箱',
      html: getVerificationEmailHTML(code),
    });
  });
  
  const results = await Promise.allSettled(emailPromises);
  
  return results.map((result, index) => ({
    email: emails[index],
    success: result.status === 'fulfilled',
    error: result.status === 'rejected' ? result.reason : null,
  }));
}
```

## 监控和日志示例

### 添加日志记录

```typescript
import { sendVerificationEmail } from '@/lib/email-verification-service';

async function sendVerificationWithLogging(email: string) {
  console.log(`[Email Verification] Sending code to ${email}`);
  
  const startTime = Date.now();
  const result = await sendVerificationEmail(email);
  const duration = Date.now() - startTime;
  
  if (result.success) {
    console.log(`[Email Verification] Success - ${email} (${duration}ms)`);
  } else {
    console.error(`[Email Verification] Failed - ${email}: ${result.error}`);
  }
  
  return result;
}
```

### 集成监控服务

```typescript
import * as Sentry from '@sentry/nextjs';

async function sendVerificationWithMonitoring(email: string) {
  const transaction = Sentry.startTransaction({
    op: 'email.verification',
    name: 'Send Verification Email',
  });
  
  try {
    const result = await sendVerificationEmail(email);
    
    if (!result.success) {
      Sentry.captureMessage('Email verification failed', {
        level: 'warning',
        extra: { email, error: result.error },
      });
    }
    
    return result;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  } finally {
    transaction.finish();
  }
}
```

## 更多示例

查看完整的实现代码：

- 注册页面: `app/register/page.tsx`
- API 路由: `app/api/auth/send-verification/route.ts`
- 核心服务: `lib/email-verification-service.ts`
- 邮件模板: `lib/email-templates.tsx`
