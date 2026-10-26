import { sign as cryptoSign, verify as cryptoVerify } from "node:crypto"
import { getSigningKeys } from "./desktop-license-keys"

/**
 * 授权「租约」——服务端签发给桌面端的离线可信凭据。
 *
 * 格式：`<base64url(payload JSON)>.<base64url(Ed25519 签名)>`
 *   - payload 里带授权码 / 设备指纹 / 授权到期时间（exp），桌面端可脱离服务端自证真伪；
 *   - 桌面端把租约存本地，断网时验签 + 比对 exp + 宽限期即可继续使用；
 *   - 租约本身**不设独立寿命**：它就是「当前授权状态」的快照，
 *     续期 / 吊销通过每次心跳换发新租约来体现。
 *
 * ⚠️ 桌面端 desktop/lib/license.js 里有一份等价实现（纯 JS，无 TS 依赖），
 *    两边的字段名与编码方式必须保持一致，改动请同步。
 */

export interface LicenseLeasePayload {
  /** 版本号，便于将来换格式 */
  v: 1
  /** 归一化后的授权码 */
  code: string
  /** 设备指纹（sha256 hex） */
  dev: string
  /** 授权到期时间（毫秒时间戳）；0 = 永久有效 */
  exp: number
  /** 签发时间（毫秒时间戳） */
  iat: number
  /**
   * 离线宽限天数（缺省 7）。
   * 只在客户端「有联网能力但暂时连不上」时起作用——超过 gd 天未成功联网才要求重新联网。
   * 把「装完就断网」的客户设成 3650（≈100 年）即可让其长期离线可用。
   */
  gd?: number
  /** 展示名（客户 / 备注）；客户端仅用于界面显示，不参与判定 */
  lbl?: string
  /**
   * 吊销清单地址（revocation list URL）。
   *
   * 不写 = 纯离线串，客户端永不联网检查（兼容改造前签发的码）。
   * 写了 = 客户端每隔 rk 天拉一次这个地址，命中即锁死 —— 这就是**没有自己服务器也能远程吊销**的实现：
   * 地址可以指向任意静态托管（Gitee/GitHub raw、Pages、COS、R2），与 stravision.site 是否存活无关。
   */
  rl?: string
  /** 吊销清单复检周期（天，缺省 30）。超过 rk 天没成功复检就要求联网；超过 rk+gd 天直接判定锁死。 */
  rk?: number
}

/** 吊销清单内容（由私钥签名，客户端用内置公钥验签，防伪造/防篡改） */
export interface RevocationListPayload {
  /** 清单格式版本 */
  v: 1
  /** 清单更新时间（毫秒）；客户端据此拒绝"回滚到旧清单"的攻击 */
  t: number
  /** 已作废的授权码列表 */
  revoked: string[]
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/** 用服务端私钥签发租约 */
export function signLease(payload: LicenseLeasePayload): string {
  const body = b64url(JSON.stringify(payload))
  const signature = cryptoSign(null, Buffer.from(body, "utf8"), getSigningKeys().privateKey)
  return `${body}.${b64url(signature)}`
}

/**
 * 签发吊销清单。
 *
 * 产物就是一串 `<base64url payload>.<base64url 签名>`，与租约同格式 ——
 * 好处是它**可以直接当一个静态文件扔到任意托管上**（Gitee raw / COS / R2 都行），
 * 客户端 GET 到整段文本就能验签，不需要任何服务端程序。
 */
export function signRevocationList(revoked: string[]): string {
  const payload: RevocationListPayload = {
    v: 1,
    t: Date.now(),
    revoked: Array.from(new Set(revoked.map((c) => String(c || "").trim().toUpperCase()).filter(Boolean))),
  };
  const body = b64url(JSON.stringify(payload))
  const signature = cryptoSign(null, Buffer.from(body, "utf8"), getSigningKeys().privateKey)
  return `${body}.${b64url(signature)}`
}

/** 验签吊销清单（服务端自测 / 排障用；桌面端用自己那份 JS 实现） */
export function verifyRevocationList(blob: string): RevocationListPayload | null {
  const parts = String(blob || "").split(".")
  if (parts.length !== 2) return null
  const [body, sig] = parts
  try {
    const ok = cryptoVerify(
      null,
      Buffer.from(body, "utf8"),
      getSigningKeys().publicKey,
      Buffer.from(sig.replace(/-/g, "+").replace(/_/g, "/"), "base64")
    )
    if (!ok) return null
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"))
    if (!payload || payload.v !== 1 || !Array.isArray(payload.revoked)) return null
    return payload as RevocationListPayload
  } catch {
    return null
  }
}

/** 验签（服务端自测 / 排障用；桌面端用自己那份 JS 实现） */
export function verifyLease(lease: string): LicenseLeasePayload | null {
  const parts = String(lease || "").split(".")
  if (parts.length !== 2) return null
  const [body, sig] = parts
  try {
    const ok = cryptoVerify(
      null,
      Buffer.from(body, "utf8"),
      getSigningKeys().publicKey,
      Buffer.from(sig.replace(/-/g, "+").replace(/_/g, "/"), "base64")
    )
    if (!ok) return null
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"))
    return payload && payload.v === 1 ? (payload as LicenseLeasePayload) : null
  } catch {
    return null
  }
}
