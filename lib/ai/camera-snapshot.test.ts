import { describe, it, expect } from 'vitest'
import {
  toCameraSnapshotMessage,
  toCameraSnapshotMessages,
  type PendingCameraSnapshot,
} from './camera-snapshot'

/**
 * 摄像头快照投递契约
 *
 * 事故背景（2026-10-16）：用户说"给我看看棚里"，AI 也真调了 take_camera_snapshot、
 * 服务端 ffmpeg 也抓到了帧 —— 但前端只有 __commitStudioData 收下，**没有任何渲染**，
 * 用户端一片空白。这里锁死"快照 → 用户可见助手消息"的转换口径。
 */

const shot = (over: Partial<PendingCameraSnapshot> = {}): PendingCameraSnapshot => ({
  key: 'take_camera_snapshot:{}',
  cameraId: 'a',
  dataUrl: 'data:image/jpeg;base64,AAAA',
  query: '给我看看棚里',
  ...over,
})

describe('toCameraSnapshotMessage', () => {
  it('产出一条 assistant 消息：说明文案 + image_url + snapshot 标记', () => {
    const msg = toCameraSnapshotMessage(shot(), 1_700_000_000_000)
    expect(msg.role).toBe('assistant')
    expect(msg.snapshot).toEqual({ camera: 'a', capturedAt: 1_700_000_000_000 })
    expect(msg.content).toHaveLength(2)
    expect(msg.content[0]).toEqual({ type: 'text', text: '针对「给我看看棚里」，这是摄像头 A 的实时画面：' })
    expect(msg.content[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/jpeg;base64,AAAA' },
    })
  })

  it('没有用户原话时不硬塞「针对…」', () => {
    const msg = toCameraSnapshotMessage(shot({ query: undefined }))
    expect(msg.content[0]).toEqual({ type: 'text', text: '这是摄像头 A 的实时画面：' })
  })

  it('用户原话过长要截断（它会进正文占上下文）', () => {
    const long = '看'.repeat(120)
    const msg = toCameraSnapshotMessage(shot({ query: long }))
    const text = (msg.content[0] as { text: string }).text
    expect(text.length).toBeLessThan(70)
    expect(text).toContain('…')
  })

  it('摄像头 b 用 B 作为标签', () => {
    const msg = toCameraSnapshotMessage(shot({ cameraId: 'b', query: undefined }))
    expect((msg.content[0] as { text: string }).text).toBe('这是摄像头 B 的实时画面：')
  })
})

describe('toCameraSnapshotMessages', () => {
  it('同一次调用（同 key）重复出现只投递一张 —— 模型偶尔把同一工具连调两次', () => {
    const dup = [shot(), shot(), shot()]
    expect(toCameraSnapshotMessages(dup)).toHaveLength(1)
  })

  it('参数不同的两次抓帧都要投递（左移一次 + 右移一次）', () => {
    const two = [
      shot({ key: 'move_camera_and_look:{"direction":1}', cameraId: 'a' }),
      shot({ key: 'move_camera_and_look:{"direction":2}', cameraId: 'a' }),
    ]
    expect(toCameraSnapshotMessages(two)).toHaveLength(2)
  })

  it('空输入 / 无画面地址 → 不产出消息', () => {
    expect(toCameraSnapshotMessages([])).toHaveLength(0)
    expect(toCameraSnapshotMessages(null)).toHaveLength(0)
    expect(toCameraSnapshotMessages([shot({ dataUrl: '' })])).toHaveLength(0)
  })

  it('每条消息都带稳定的 snapshot 标记（渲染层据此走快照卡）', () => {
    const msgs = toCameraSnapshotMessages([shot(), shot({ key: 'k2', cameraId: 'b' })], 42)
    expect(msgs.every((m) => m.snapshot.capturedAt === 42)).toBe(true)
    expect(msgs.map((m) => m.snapshot.camera)).toEqual(['a', 'b'])
  })
})
