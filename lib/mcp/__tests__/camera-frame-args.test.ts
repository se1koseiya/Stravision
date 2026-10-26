/**
 * 摄像头抓帧「输入侧参数」回归锁（2026-10-16）
 *
 * 背景事故：`captureCameraFrame` 无条件传 `-rtsp_transport tcp`，而现场配置的
 * 摄像头地址是 `rtmp://101.43.28.90:1935/live/camera`（RTMP 解复用器不认识该参数）：
 *
 *   Option rtsp_transport not found.
 *   Error opening input files: Option not found   （ffmpeg 直接 code 1 退出）
 *
 * ⇒ AI 助手每次抓帧必失败，只能回「两路摄像头都调不出画面 / 直播流没接通」，
 *   而监控页 `/api/stream-rtmp`（不传该参数）却完全正常 —— 极具迷惑性。
 *
 * 本测试锁死「参数按协议择一」这条契约。
 */

import { describe, it, expect } from 'vitest'
import { isRtspUrl, buildCameraInputArgs } from '../builtin-device-control'

describe('isRtspUrl', () => {
  it('识别 rtsp / rtsps（大小写不敏感、容忍首尾空白）', () => {
    expect(isRtspUrl('rtsp://10.0.0.1:554/stream')).toBe(true)
    expect(isRtspUrl('rtsps://10.0.0.1:322/stream')).toBe(true)
    expect(isRtspUrl('  RTSP://10.0.0.1:554/s1  ')).toBe(true)
  })

  it('对 rtmp / http / https / 文件路径返回 false', () => {
    expect(isRtspUrl('rtmp://101.43.28.90:1935/live/camera')).toBe(false)
    expect(isRtspUrl('http://10.0.0.1:8080/mjpeg')).toBe(false)
    expect(isRtspUrl('https://example.com/cam')).toBe(false)
    expect(isRtspUrl('')).toBe(false)
  })
})

describe('buildCameraInputArgs', () => {
  it('RTSP 走 -rtsp_transport tcp', () => {
    expect(buildCameraInputArgs('rtsp://10.0.0.1:554/s1')).toEqual(['-rtsp_transport', 'tcp'])
  })

  it('🚨 回归锁：RTMP 绝不能带 -rtsp_transport（会 Option not found 秒退）', () => {
    const args = buildCameraInputArgs('rtmp://101.43.28.90:1935/live/camera')
    expect(args).not.toContain('-rtsp_transport')
    expect(args).toEqual(['-rw_timeout', '15000000'])
  })

  it('HTTP 流同样只加读超时', () => {
    expect(buildCameraInputArgs('http://10.0.0.1:8080/mjpeg')).toEqual(['-rw_timeout', '15000000'])
  })

  it('读超时按 timeoutMs 换算成微秒', () => {
    expect(buildCameraInputArgs('rtmp://a/b', 20000)).toEqual(['-rw_timeout', '20000000'])
    expect(buildCameraInputArgs('rtmp://a/b', 1500)).toEqual(['-rw_timeout', '1500000'])
  })

  it('timeoutMs 非法（0 / 负数 / 小数）时至少留 1ms，避免出现 -rw_timeout 0', () => {
    expect(buildCameraInputArgs('rtmp://a/b', 0)).toEqual(['-rw_timeout', '1000'])
    expect(buildCameraInputArgs('rtmp://a/b', -5)).toEqual(['-rw_timeout', '1000'])
    expect(() => buildCameraInputArgs('rtmp://a/b', 1234.9)).not.toThrow()
  })
})
