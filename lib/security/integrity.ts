import { execSync } from 'child_process';
import crypto from 'crypto';
import os from 'os';

/**
 * 获取底层硬件指纹 (Windows/Linux)
 * 用于锁定软件运行环境，防止非法复制
 */
export function getHardwareFingerprint(): string {
  try {
    let raw = "";
    if (os.platform() === 'win32') {
      // 获取主板序列号或系统 UUID
      raw = execSync('wmic csproduct get uuid').toString().split('\n')[1]?.trim() || "";
      if (!raw || raw === "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF") {
         raw = execSync('wmic baseboard get serialnumber').toString().split('\n')[1]?.trim() || "";
      }
    } else {
      // Linux: 获取机器机器码
      try { raw = execSync('cat /etc/machine-id').toString().trim(); } catch {
        raw = execSync('cat /proc/sys/kernel/random/boot_id').toString().trim();
      }
    }
    
    // 加盐哈希，生成机器码
    return crypto
      .createHash('md5')
      .update(raw + "stravision-secure-salt-2024")
      .digest('hex')
      .slice(0, 16)
      .toUpperCase();
  } catch (error) {
    console.error("Failed to generate fingerprint:", error);
    return "ST-UNAVAILABLE-HWID";
  }
}

/**
 * 验证许可证是否与当前机器匹配
 */
export function checkSystemIntegrity(): { isValid: boolean; machineID: string } {
  const machineID = getHardwareFingerprint();
  const envLicense = process.env.SYSTEM_LICENSE_KEY;
  
  // 移除开发环境下自动放行的逻辑，确保在所有环境下均执行硬件指纹与许可证匹配性检查
  // 如果没有设置 SYSTEM_LICENSE_KEY，系统将进入预设锁定模式。
  
  // 计算预期的激活码 (机器码 + 私钥的 SHA256)
  const expectedKey = crypto
    .createHash('sha256')
    .update(machineID + "strawberry-master-secret-key-999")
    .digest('hex')
    .slice(0, 24)
    .toUpperCase();

  return {
    isValid: envLicense === expectedKey,
    machineID
  };
}
