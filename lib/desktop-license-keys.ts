import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  type KeyObject,
} from "node:crypto"
import fs from "node:fs"
import path from "node:path"

/**
 * 桌面端授权租约的签名密钥（Ed25519）。
 *
 * 为什么用非对称签名而不是 HMAC：
 *   桌面端要能**离线**判断手里的租约是不是服务端签发的（否则用户改本地 JSON 即可续期）。
 *   用 HMAC 就必须把对称密钥下发到客户端 → 客户端可自行签任意租约。
 *   Ed25519 下服务端只持私钥、客户端只内置公钥，客户端无法伪造。
 *
 * 私钥来源优先级：
 *   1. 环境变量 DESKTOP_LICENSE_PRIVATE_KEY（base64 编码的 PKCS8 DER）—— 生产环境必须配这条；
 *   2. DESKTOP_LICENSE_KEY_DIR（或 <cwd>/data）下的 desktop-license-keys.json —— 本地开发自测；
 *   3. 都没有 → 现场生成一对并落盘（0600），同时打印警告。
 *
 * ⚠️ 桌面端与 Web 端是同一份代码，路由也会被一起打进去。
 *   因此**私钥绝不能硬编码在源码里**，只能来自环境变量/数据目录，
 *   桌面端用户拿到的只是内置公钥，无法据此签发新码。
 */

interface KeyPairMaterial {
  privateKey: string // base64 PKCS8 DER
  publicKey: string // base64 SPKI DER
}

let cached: { privateKey: KeyObject; publicKey: KeyObject } | null = null

function keyDir(): string {
  return process.env.DESKTOP_LICENSE_KEY_DIR || path.join(process.cwd(), "data")
}

function keyFile(): string {
  return path.join(keyDir(), "desktop-license-keys.json")
}

function readKeyFile(): KeyPairMaterial | null {
  try {
    const raw = JSON.parse(fs.readFileSync(keyFile(), "utf8"))
    if (typeof raw?.privateKey === "string" && typeof raw?.publicKey === "string") {
      return { privateKey: raw.privateKey, publicKey: raw.publicKey }
    }
  } catch {
    /* 不存在或损坏 → 继续往下走 */
  }
  return null
}

function writeKeyFile(material: KeyPairMaterial): void {
  try {
    const dir = keyDir()
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(keyFile(), JSON.stringify(material, null, 2), { mode: 0o600 })
    console.warn(`[desktop-license] 已生成授权签名密钥：${keyFile()}（生产环境请改用环境变量注入）`)
  } catch (error) {
    console.error("[desktop-license] 密钥落盘失败:", error)
  }
}

function generate(): KeyPairMaterial {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519")
  const material: KeyPairMaterial = {
    privateKey: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
    publicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
  }
  writeKeyFile(material)
  return material
}

function resolveMaterial(): KeyPairMaterial {
  const envPriv = process.env.DESKTOP_LICENSE_PRIVATE_KEY
  if (envPriv && envPriv.trim()) {
    const material: KeyPairMaterial = {
      privateKey: envPriv.trim(),
      publicKey: (process.env.DESKTOP_LICENSE_PUBLIC_KEY || "").trim(),
    }
    // 只给了私钥就现场推导公钥，避免运维漏配导致校验侧拿到空公钥
    if (!material.publicKey) {
      try {
        material.publicKey = createPublicKey(createPrivateKey({
          key: Buffer.from(material.privateKey, "base64"),
          format: "der",
          type: "pkcs8",
        }))
          .export({ type: "spki", format: "der" })
          .toString("base64")
      } catch (error) {
        console.error("[desktop-license] DESKTOP_LICENSE_PRIVATE_KEY 解析失败:", error)
      }
    }
    return material
  }

  const fromFile = readKeyFile()
  if (fromFile) return fromFile

  return generate()
}

/** 取（并缓存）签名密钥对 */
export function getSigningKeys(): { privateKey: KeyObject; publicKey: KeyObject } {
  if (cached) return cached
  const material = resolveMaterial()
  const privateKey = createPrivateKey({
    key: Buffer.from(material.privateKey, "base64"),
    format: "der",
    type: "pkcs8",
  })
  const publicKey = material.publicKey
    ? createPublicKey({ key: Buffer.from(material.publicKey, "base64"), format: "der", type: "spki" })
    : createPublicKey(privateKey)
  cached = { privateKey, publicKey }
  return cached
}

/** 公钥（base64 SPKI DER）—— 打包桌面端时把它注入 desktop/lib/license.js */
export function getPublicKeyBase64(): string {
  return getSigningKeys().publicKey.export({ type: "spki", format: "der" }).toString("base64")
}
