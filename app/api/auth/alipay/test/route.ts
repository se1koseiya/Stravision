export const runtime = 'nodejs'

import { NextResponse } from "next/server"

/**
 * 支付宝配置测试端点
 * 访问: /api/auth/alipay/test
 * 
 * 注意：生产环境应该禁用此端点或添加认证
 */
export async function GET() {
  const appId = process.env.ALIPAY_APP_ID?.trim()
  const privateKeyRaw = process.env.ALIPAY_PRIVATE_KEY
  const publicKeyRaw = process.env.ALIPAY_PUBLIC_KEY

  const result = {
    timestamp: new Date().toISOString(),
    config: {
      hasAppId: !!appId,
      appIdLength: appId?.length || 0,
      appIdFormat: appId ? /^\d{16,}$/.test(appId) : false,
      hasPrivateKey: !!privateKeyRaw,
      privateKeyLength: privateKeyRaw?.length || 0,
      hasPublicKey: !!publicKeyRaw,
      publicKeyLength: publicKeyRaw?.length || 0,
    },
    privateKey: {
      hasBeginMarker: privateKeyRaw?.includes('BEGIN') || false,
      hasEndMarker: privateKeyRaw?.includes('END') || false,
      hasPKCS1: privateKeyRaw?.includes('BEGIN RSA PRIVATE KEY') || false,
      hasPKCS8: privateKeyRaw?.includes('BEGIN PRIVATE KEY') || false,
      hasLiteralBackslashN: privateKeyRaw?.includes('\\n') || false,
      hasActualNewline: privateKeyRaw?.includes('\n') || false,
    },
    publicKey: {
      hasBeginMarker: publicKeyRaw?.includes('BEGIN') || false,
      hasEndMarker: publicKeyRaw?.includes('END') || false,
      hasPublicKeyMarker: publicKeyRaw?.includes('BEGIN PUBLIC KEY') || false,
    },
    sdkTest: {
      canImport: false,
      canInstantiate: false,
      error: null as string | null,
    }
  }

  // 测试 SDK
  try {
    const { AlipaySdk } = require('alipay-sdk')
    result.sdkTest.canImport = true

    if (appId && privateKeyRaw && publicKeyRaw) {
      const normalizePem = (value: string) => {
        return value
          .replace(/\\n/g, "\n")
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .trim()
      }

      const privateKey = normalizePem(privateKeyRaw)
      const publicKey = normalizePem(publicKeyRaw)
      
      let keyType: 'PKCS1' | 'PKCS8' = 'PKCS8'
      if (privateKey.includes('BEGIN RSA PRIVATE KEY')) {
        keyType = 'PKCS1'
      }

      new AlipaySdk({
        appId,
        privateKey,
        alipayPublicKey: publicKey,
        keyType,
      })
      
      result.sdkTest.canInstantiate = true
    }
  } catch (error: any) {
    result.sdkTest.error = error.message
  }

  return NextResponse.json(result, {
    headers: {
      'Content-Type': 'application/json',
    }
  })
}
