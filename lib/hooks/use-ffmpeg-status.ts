/**
 * 探测本机 FFmpeg 可用性（/api/stream-rtmp?status=1）
 *
 * RTMP 摄像头画面依赖服务端 FFmpeg 转封装。桌面端若安装包缺少 FFmpeg，
 * 播放器只会静默重连、页面毫无提示——用这个 hook 把「为什么没画面」说出来。
 */

import { useEffect, useState } from 'react'

export interface FfmpegStatus {
  available: boolean
  path?: string
  source?: string
  version?: string
  platformKey?: string
  hint?: string
}

/** 同一页面多次挂载只探一次；失败结果 20s 内不重复打扰后端 */
const CACHE_TTL_OK = 5 * 60 * 1000
const CACHE_TTL_FAIL = 20 * 1000

let cache: { at: number; value: FfmpegStatus } | null = null
const inflight = new Map<string, Promise<FfmpegStatus>>()

export function fetchFfmpegStatus(force = false): Promise<FfmpegStatus> {
  const now = Date.now()
  if (!force && cache) {
    const ttl = cache.value.available ? CACHE_TTL_OK : CACHE_TTL_FAIL
    if (now - cache.at < ttl) return Promise.resolve(cache.value)
  }

  const key = force ? `force-${now}` : 'default'
  const existing = inflight.get(key)
  if (existing) return existing

  const request = fetch(`/api/stream-rtmp?status=1${force ? '&refresh=1' : ''}`, {
    cache: 'no-store',
  })
    .then((res) => res.json() as Promise<FfmpegStatus>)
    .then((value) => {
      cache = { at: Date.now(), value }
      return value
    })
    .catch(() => ({ available: true } as FfmpegStatus)) // 探测失败时不误报
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, request)
  return request
}

/**
 * @param enabled 为 false 时不发请求（例如当前不是 RTMP 源）
 */
export function useFfmpegStatus(enabled = true) {
  const [status, setStatus] = useState<FfmpegStatus | null>(
    cache ? cache.value : null,
  )

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void fetchFfmpegStatus().then((value) => {
      if (!cancelled) setStatus(value)
    })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return status
}
