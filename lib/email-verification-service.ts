import { Resend } from 'resend';
import { initDB, execute, queryOne } from './db/database';
import { getVerificationEmailText } from './email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

// 确保数据库已初始化的 Promise
let dbInitPromise: Promise<void> | null = null;

async function ensureDB() {
  if (!dbInitPromise) {
    dbInitPromise = initDB();
  }
  await dbInitPromise;
}

/**
 * 生成6位数字验证码
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 发送验证码邮件
 */
export async function sendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureDB();
    
    // 生成验证码
    const code = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10分钟后过期
    
    // 保存验证码到数据库
    await execute(
      `INSERT INTO email_verifications (email, code, expires_at, created_at)
       VALUES ($1, $2, $3, $4)`,
      [email, code, expiresAt, Date.now()]
    );
    
    // 发送邮件
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Stravision <onboarding@resend.dev>',
      to: [email],
      subject: '验证您的邮箱 - Stravision',
      text: getVerificationEmailText(code),
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>验证您的邮箱 - Stravision</title>
            <style>
              body {
                margin: 0;
                padding: 0;
                background-color: #FAFAFA;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                -webkit-font-smoothing: antialiased;
              }
              .wrapper {
                width: 100%;
                table-layout: fixed;
                background-color: #FAFAFA;
                padding-bottom: 40px;
              }
              .container {
                max-width: 480px;
                margin: 0 auto;
                background-color: #ffffff;
                border: 1px solid #e4e4e7;
                border-radius: 24px;
                overflow: hidden;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
              }
              .header {
                padding: 40px 0 24px;
                text-align: center;
              }
              .logo {
                width: 48px;
                height: 48px;
                border-radius: 12px;
              }
              .content {
                padding: 0 40px 40px;
                text-align: center;
              }
              .title {
                font-size: 24px;
                font-weight: 700;
                color: #18181b;
                margin: 16px 0 8px;
                letter-spacing: -0.5px;
              }
              .subtitle {
                font-size: 15px;
                color: #71717a;
                line-height: 1.6;
                margin-bottom: 32px;
              }
              .code-container {
                background: #f4f4f5;
                border: 1px solid #e4e4e7;
                border-radius: 16px;
                padding: 24px;
                margin: 0 auto 32px;
                text-align: center;
                width: fit-content;
                min-width: 200px;
              }
              .code {
                font-family: 'SF Mono', 'Roboto Mono', monospace;
                font-size: 32px;
                font-weight: 600;
                color: #18181b;
                letter-spacing: 8px;
                line-height: 1;
              }
              .divider {
                height: 1px;
                background-color: #f4f4f5;
                margin: 0;
              }
              .footer {
                padding: 32px 40px;
                text-align: center;
                background-color: #ffffff;
              }
              .footer-text {
                color: #a1a1aa;
                font-size: 12px;
                line-height: 1.6;
                margin: 0;
              }
              .links {
                margin-top: 16px;
              }
              .link {
                color: #71717a;
                text-decoration: none;
                font-size: 12px;
                margin: 0 8px;
                transition: color 0.2s;
              }
              .link:hover {
                color: #18181b;
              }
            </style>
          </head>
          <body>
            <div class="wrapper">
              <div style="height: 40px;"></div>
              <div class="container">
                <!-- Header -->
                <div class="header">
                  <img src="https://stravision.cheesestrawberry.top/icon.png" alt="Stravision" class="logo">
                </div>

                <!-- Content -->
                <div class="content">
                  <h1 class="title">验证您的邮箱</h1>
                  <p class="subtitle">感谢注册 Stravision OS。<br>请使用下方的验证码完成身份验证。</p>
                  
                  <div class="code-container">
                    <div class="code">${code}</div>
                  </div>
                  
                  <p style="color: #a1a1aa; font-size: 13px; margin: 0; line-height: 1.5;">
                    验证码将在 <strong>10分钟</strong> 后失效。<br>
                    如非本人操作，请忽略此邮件。
                  </p>
                </div>

                <div class="divider"></div>

                <!-- Footer -->
                <div class="footer">
                  <p class="footer-text">
                    © ${new Date().getFullYear()} Stravision IoT Platform<br>
                    Designed for Future Agriculture
                  </p>
                  <div class="links">
                    <a href="https://stravision.cheesestrawberry.top" class="link">官网</a>
                    <span style="color: #e4e4e7;">|</span>
                    <a href="https://stravision.cheesestrawberry.top/docs" class="link">文档</a>
                    <span style="color: #e4e4e7;">|</span>
                    <a href="#" class="link">帮助</a>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    
    if (error) {
      console.error('Failed to send verification email:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in sendVerificationEmail:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '发送验证码失败' 
    };
  }
}

/**
 * 验证邮箱验证码
 */
export async function verifyEmailCode(email: string, code: string): Promise<{ valid: boolean; error?: string }> {
  try {
    await ensureDB();
    
    // 查询最新的验证码
    const verification = await queryOne<any>(
      `SELECT * FROM email_verifications
       WHERE email = $1 AND code = $2 AND used = 0
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, code]
    );
    
    if (!verification) {
      return { valid: false, error: '验证码无效或已使用' };
    }
    
    // 检查是否过期
    if (Date.now() > verification.expires_at) {
      return { valid: false, error: '验证码已过期' };
    }
    
    // 标记验证码为已使用
    await execute(
      `UPDATE email_verifications
       SET used = 1
       WHERE id = $1`,
      [verification.id]
    );
    
    // 更新用户的邮箱验证状态
    await execute(
      `UPDATE users
       SET email_verified = 1, email_verified_at = $1
       WHERE email = $2`,
      [Date.now(), email]
    );
    
    return { valid: true };
  } catch (error) {
    console.error('Error in verifyEmailCode:', error);
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : '验证失败' 
    };
  }
}

/**
 * 验证重置密码验证码
 */
export async function verifyResetCode(email: string, code: string): Promise<{ valid: boolean; error?: string }> {
  try {
    await ensureDB();
    
    // 查询最新的验证码
    const verification = await queryOne<any>(
      `SELECT * FROM email_verifications
       WHERE email = $1 AND code = $2 AND used = 0
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, code]
    );
    
    if (!verification) {
      return { valid: false, error: '验证码无效或已使用' };
    }
    
    // 检查是否过期
    if (Date.now() > verification.expires_at) {
      return { valid: false, error: '验证码已过期' };
    }
    
    // 标记验证码为已使用
    await execute(
      `UPDATE email_verifications
       SET used = 1
       WHERE id = $1`,
      [verification.id]
    );
    
    // 注意：这里不自动更新用户的 email_verified 状态
    // 重置密码操作成功后，可以在上层逻辑中根据需要更新
    
    return { valid: true };
  } catch (error) {
    console.error('Error in verifyResetCode:', error);
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : '验证失败' 
    };
  }
}

/**
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureDB();
    
    // 生成验证码
    const code = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10分钟后过期
    
    // 保存验证码到数据库
    await execute(
      `INSERT INTO email_verifications (email, code, expires_at, created_at)
       VALUES ($1, $2, $3, $4)`,
      [email, code, expiresAt, Date.now()]
    );
    
    // 发送邮件
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Stravision <onboarding@resend.dev>',
      to: [email],
      subject: '重置您的密码 - Stravision',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>重置您的密码 - Stravision</title>
            <style>
              body {
                margin: 0;
                padding: 0;
                background-color: #FAFAFA;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                -webkit-font-smoothing: antialiased;
              }
              .wrapper {
                width: 100%;
                table-layout: fixed;
                background-color: #FAFAFA;
                padding-bottom: 40px;
              }
              .container {
                max-width: 480px;
                margin: 0 auto;
                background-color: #ffffff;
                border: 1px solid #e4e4e7;
                border-radius: 24px;
                overflow: hidden;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
              }
              .header {
                padding: 40px 0 24px;
                text-align: center;
              }
              .logo {
                width: 48px;
                height: 48px;
                border-radius: 12px;
              }
              .content {
                padding: 0 40px 40px;
                text-align: center;
              }
              .title {
                font-size: 24px;
                font-weight: 700;
                color: #18181b;
                margin: 16px 0 8px;
                letter-spacing: -0.5px;
              }
              .subtitle {
                font-size: 15px;
                color: #71717a;
                line-height: 1.6;
                margin-bottom: 32px;
              }
              .code-container {
                background: #f4f4f5;
                border: 1px solid #e4e4e7;
                border-radius: 16px;
                padding: 24px;
                margin: 0 auto 32px;
                text-align: center;
                width: fit-content;
                min-width: 200px;
              }
              .code {
                font-family: 'SF Mono', 'Roboto Mono', monospace;
                font-size: 32px;
                font-weight: 600;
                color: #ef4444;
                letter-spacing: 8px;
                line-height: 1;
              }
              .divider {
                height: 1px;
                background-color: #f4f4f5;
                margin: 0;
              }
              .footer {
                padding: 32px 40px;
                text-align: center;
                background-color: #ffffff;
              }
              .footer-text {
                color: #a1a1aa;
                font-size: 12px;
                line-height: 1.6;
                margin: 0;
              }
              .links {
                margin-top: 16px;
              }
              .link {
                color: #71717a;
                text-decoration: none;
                font-size: 12px;
                margin: 0 8px;
                transition: color 0.2s;
              }
              .link:hover {
                color: #18181b;
              }
            </style>
          </head>
          <body>
            <div class="wrapper">
              <div style="height: 40px;"></div>
              <div class="container">
                <!-- Header -->
                <div class="header">
                  <img src="https://stravision.cheesestrawberry.top/icon.png" alt="Stravision" class="logo">
                </div>

                <!-- Content -->
                <div class="content">
                  <h1 class="title">重置您的密码</h1>
                  <p class="subtitle">我们收到了重置您 Stravision 账户密码的请求。<br>请使用下方验证码完成操作。</p>
                  
                  <div class="code-container">
                    <div class="code">${code}</div>
                  </div>
                  
                  <p style="color: #a1a1aa; font-size: 13px; margin: 0; line-height: 1.5;">
                    验证码将在 <strong>10分钟</strong> 后失效。<br>
                    如非本人操作，请立即修改密码并联系支持。
                  </p>
                </div>

                <div class="divider"></div>

                <!-- Footer -->
                <div class="footer">
                  <p class="footer-text">
                    © ${new Date().getFullYear()} Stravision IoT Platform<br>
                    Designed for Future Agriculture
                  </p>
                  <div class="links">
                    <a href="https://stravision.cheesestrawberry.top" class="link">官网</a>
                    <span style="color: #e4e4e7;">|</span>
                    <a href="https://stravision.cheesestrawberry.top/docs" class="link">文档</a>
                    <span style="color: #e4e4e7;">|</span>
                    <a href="#" class="link">帮助</a>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    
    if (error) {
      console.error('Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in sendPasswordResetEmail:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '发送重置邮件失败' 
    };
  }
}

/**
 * 检查邮箱是否已验证
 */
export async function isEmailVerified(email: string): Promise<boolean> {
  try {
    await ensureDB();
    const user = await queryOne<{ email_verified: number | string }>(
      `SELECT email_verified FROM users WHERE email = $1`,
      [email]
    );
    return Number(user?.email_verified ?? 0) === 1;
  } catch (error) {
    console.error('Error in isEmailVerified:', error);
    return false;
  }
}

/**
 * 清理过期的验证码（可以通过定时任务调用）
 */
export async function cleanupExpiredVerifications(): Promise<void> {
  try {
    await ensureDB();
    await execute(
      `DELETE FROM email_verifications
       WHERE expires_at < $1`,
      [Date.now()]
    );
  } catch (error) {
    console.error('Error in cleanupExpiredVerifications:', error);
  }
}
