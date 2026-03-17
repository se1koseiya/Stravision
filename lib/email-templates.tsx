import * as React from 'react';

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
