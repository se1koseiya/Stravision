/**
 * 站内图片代理 —— 「相似案例」配图的唯一出口
 *
 * GET /api/vision/image-proxy?url=<encodeURIComponent(原始图地址)>
 *
 * ── 为什么必须有 ──
 * 相似案例的配图来自第三方站点，直接 `<img src="https://别人站/xx.jpg">` 会撞三件事：
 *   ① **防盗链**：目标站校验 Referer，空 Referer 直接 403 → 前端一片裂图；
 *   ② **混合内容 / 跨域**：http 图在 https 页面上被浏览器拦掉；
 *   ③ **不可控**：目标站一挂，我们的卡片就跟着烂。
 * 代理这一层统一补 Referer、做类型白名单、限体积、加缓存，前端只管引用。
 *
 * ── 安全边界（这是公网可访问的转发端点，必须收口）──
 *   · 必须登录（避免变成开放代理被人刷流量）
 *   · 只允许 http/https
 *   · 拒绝内网 / 环回 / 链路本地主机名与 IP 段（SSRF）
 *   · 只透传 `image/*`，其它类型一律 415
 *   · 体积上限 6MB，超时 10s
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_BYTES = 6 * 1024 * 1024
const TIMEOUT_MS = 10_000

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

/** 明显的内网 / 本地目标 —— 直接拒（不做 DNS 解析：代理只服务公开图片，宁可误杀） */
function isBlockedHost(hostname: string): boolean {
    const h = hostname.toLowerCase()
    if (!h) return true
    if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
        const [a, b] = h.split('.').map(Number)
        if (a === 10 || a === 127 || a === 0) return true
        if (a === 192 && b === 168) return true
        if (a === 172 && b >= 16 && b <= 31) return true
        if (a === 169 && b === 254) return true
        if (a >= 224) return true
    }
    // IPv6 环回 / 链路本地
    if (h === '::1' || h === '[::1]' || h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true
    return false
}

export async function GET(req: NextRequest) {
    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 })
    }

    const raw = req.nextUrl.searchParams.get('url')
    if (!raw) {
        return NextResponse.json({ ok: false, error: '缺少 url 参数' }, { status: 400 })
    }

    let target: URL
    try {
        target = new URL(raw)
    } catch {
        return NextResponse.json({ ok: false, error: 'url 非法' }, { status: 400 })
    }

    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
        return NextResponse.json({ ok: false, error: '仅支持 http(s)' }, { status: 400 })
    }
    if (isBlockedHost(target.hostname)) {
        return NextResponse.json({ ok: false, error: '目标地址不被允许' }, { status: 403 })
    }

    try {
        const upstream = await fetch(target.toString(), {
            headers: {
                'User-Agent': UA,
                Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
                // 补上同源 Referer —— 绝大多数防盗链只校验"是不是空 Referer"
                Referer: `${target.protocol}//${target.host}/`,
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(TIMEOUT_MS),
        })

        if (!upstream.ok) {
            return NextResponse.json({ ok: false, error: `上游返回 ${upstream.status}` }, { status: 502 })
        }

        const contentType = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
        if (!contentType.startsWith('image/')) {
            return NextResponse.json({ ok: false, error: `非图片类型：${contentType || '未知'}` }, { status: 415 })
        }

        const buf = await upstream.arrayBuffer()
        if (buf.byteLength === 0) {
            return NextResponse.json({ ok: false, error: '图片内容为空' }, { status: 502 })
        }
        if (buf.byteLength > MAX_BYTES) {
            return NextResponse.json({ ok: false, error: '图片体积超限' }, { status: 413 })
        }

        return new NextResponse(buf, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': String(buf.byteLength),
                // 案例图基本不变，长缓存直接省掉重复回源
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
            },
        })
    } catch (err: any) {
        const aborted = err?.name === 'AbortError' || err?.name === 'TimeoutError'
        return NextResponse.json(
            { ok: false, error: aborted ? '拉取图片超时' : err?.message || '拉取图片失败' },
            { status: aborted ? 504 : 502 },
        )
    }
}
