import * as React from 'react';

/* ===================== 品牌化验证码邮件（对齐新版登录卡视觉） ===================== */

/* 邮件内链接域名（官网入口） */
const SITE_URL = "https://stravision.site";
/* 邮件内图片资源域名（当前实际提供静态资源服务的域名） */
const ASSET_URL = "https://stravision.cheesestrawberry.top";
const ART_URL = `${ASSET_URL}/web/login/memory.png`;
const LOGO_URL = `${ASSET_URL}/logo.png`;

interface BrandedCodeEmailOptions {
  title: string;
  subtitle: string;
  code: string;
  note: string;
}

/**
 * 生成品牌化验证码邮件 HTML。
 * 视觉对齐 landing-v4 登录卡：白卡 + memory.png 美术头图 + 薄荷绿 #009456 强调色。
 * 全部使用内联样式 + 基础标签，兼容主流邮件客户端。
 */
export function buildBrandedCodeEmailHtml(opts: BrandedCodeEmailOptions): string {
  const { title, subtitle, code, note } = opts;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - 莓界 Berry Realm</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F4FAF6;">
    <div style="background-color:#F4FAF6;padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;margin:0 auto;background-color:#ffffff;border:1px solid #E6EFE9;border-radius:20px;border-collapse:separate;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;">
        <!-- 顶部美术横幅 -->
        <tr>
          <td style="padding:0;background-color:#F3FAF5;">
            <img src="${ART_URL}" alt="莓界 Berry Realm" width="480" style="display:block;width:100%;height:170px;object-fit:cover;object-position:center 22%;border:0;">
          </td>
        </tr>
        <!-- 内容区 -->
        <tr>
          <td style="padding:8px 32px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;padding-right:8px;">
                  <img src="${LOGO_URL}" alt="" width="28" height="28" style="display:block;width:28px;height:28px;border-radius:9px;border:0;">
                </td>
                <td style="vertical-align:middle;font-size:16px;font-weight:800;color:#222222;letter-spacing:0.5px;">莓界</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px 0;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#1A1A1A;line-height:1.3;">${title}</h1>
            <p style="margin:8px 0 0;font-size:14px;color:#999999;line-height:1.7;">${subtitle}</p>
          </td>
        </tr>
        <!-- 验证码 -->
        <tr>
          <td style="padding:24px 32px 0;">
            <div style="background-color:#E6FDEE;border:1px solid #BFEFD6;border-radius:12px;padding:22px 16px;text-align:center;">
              <span style="font-family:'SF Mono','Roboto Mono','Courier New',monospace;font-size:34px;font-weight:700;color:#009456;letter-spacing:10px;line-height:1;">${code}</span>
            </div>
            <p style="margin:14px 0 0;font-size:12px;color:#A6A6A6;line-height:1.7;text-align:center;">${note}</p>
          </td>
        </tr>
        <!-- 分隔线 + 页脚 -->
        <tr>
          <td style="padding:28px 32px 0;">
            <div style="height:1px;background-color:#EEEEEE;line-height:1px;font-size:0;">&nbsp;</div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#A6A6A6;line-height:1.7;">
              © ${year} 莓界 Berry Realm · AI 驱动的智慧莓园管控平台
            </p>
            <p style="margin:10px 0 0;font-size:12px;line-height:1.7;">
              <a href="${SITE_URL}" style="color:#009456;text-decoration:none;font-weight:600;">访问官网</a>
              <span style="color:#DDDDDD;margin:0 8px;">|</span>
              <a href="${SITE_URL}/login" style="color:#009456;text-decoration:none;font-weight:600;">前往登录</a>
            </p>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>`;
}

interface VerificationEmailProps {
  code: string;
}

export const VerificationEmailTemplate: React.FC<VerificationEmailProps> = ({ code }) => (
  <html>
    <head>
      <meta charSet="utf-8" />
      <style>{`
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 40px;
          text-align: center;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: white;
          margin-bottom: 20px;
        }
        .content {
          background: white;
          border-radius: 12px;
          padding: 30px;
          margin-top: 20px;
        }
        .code {
          font-size: 36px;
          font-weight: bold;
          color: #10b981;
          letter-spacing: 8px;
          margin: 30px 0;
          padding: 20px;
          background: #f0fdf4;
          border-radius: 8px;
          border: 2px dashed #10b981;
        }
        .footer {
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
          margin-top: 20px;
        }
        .warning {
          color: #ef4444;
          font-size: 14px;
          margin-top: 20px;
        }
      `}</style>
    </head>
    <body>
      <div className="container">
        <div className="logo">🍓 Stravision</div>
        <div className="content">
          <h2 style={{ color: '#1f2937', marginTop: 0 }}>验证您的邮箱</h2>
          <p style={{ color: '#6b7280' }}>感谢您注册 Stravision！请使用以下验证码完成注册：</p>
          <div className="code">{code}</div>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            此验证码将在 <strong>10分钟</strong> 后失效
          </p>
          <div className="warning">⚠️ 如果这不是您的操作，请忽略此邮件</div>
        </div>
        <div className="footer">
          <p>© {new Date().getFullYear()} Stravision - AI驱动的智慧农业平台</p>
        </div>
      </div>
    </body>
  </html>
);

// 纯文本版本（作为备用）
export const getVerificationEmailText = (code: string): string => {
  return `
验证您的邮箱 - Stravision

感谢您注册 Stravision！

您的验证码是：${code}

此验证码将在 10分钟 后失效。

如果这不是您的操作，请忽略此邮件。

© ${new Date().getFullYear()} Stravision - AI驱动的智慧农业平台
  `.trim();
};
