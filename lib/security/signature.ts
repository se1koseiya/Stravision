import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * 核心文件校验系统 - 防止代码被 AI 或第三方任意修改
 */
const CRITICAL_FILES = [
  'app/layout.tsx',
  'lib/security/integrity.ts',
  'app/api/auth/alipay/callback/route.ts',
  'next.config.ts'
];

/**
 * 计算核心逻辑文件的 HASH
 */
export function calculateSourceHashes(basePath: string) {
  const hashes: Record<string, string> = {};
  for (const file of CRITICAL_FILES) {
    try {
      const content = fs.readFileSync(path.join(basePath, file), 'utf8');
      // 过滤掉空格和换行后再哈希，防止因格式化导致的误报
      const cleanContent = content.replace(/\s/g, '');
      hashes[file] = crypto.createHash('sha256').update(cleanContent).digest('hex');
    } catch (e) {
      hashes[file] = 'FILE_MISSING';
    }
  }
  return hashes;
}

/**
 * 校验全系统完整性
 */
export function verifyCodeSignature(): { isTampered: boolean; tamperedFiles: string[] } {
  // 从环境变量或隐藏的签名文件中读取预存的摘要
  // 生产环境下通常读取环境变量里的签名串
  const signatureRaw = process.env.SYSTEM_CODE_SIGNATURE;
  if (!signatureRaw) return { isTampered: false, tamperedFiles: [] }; // 未启用签名校验则跳过

  const expectedHashes: Record<string, string> = JSON.parse(Buffer.from(signatureRaw, 'base64').toString());
  const actualHashes = calculateSourceHashes(process.cwd());
  
  const tamperedFiles: string[] = [];
  for (const file of CRITICAL_FILES) {
    if (actualHashes[file] !== expectedHashes[file]) {
      tamperedFiles.push(file);
    }
  }

  return {
    isTampered: tamperedFiles.length > 0,
    tamperedFiles
  };
}
