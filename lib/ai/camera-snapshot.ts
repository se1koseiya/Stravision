/**
 * 📷 摄像头快照投递（Camera Snapshot Delivery）
 *
 * ── 背景：截图抓到了，但用户看不到（2026-10-16）──
 * 链路原本是「模型调 take_camera_snapshot → 服务端 ffmpeg 抓帧 → SSE tool_result.result.images
 * → 前端 __commitStudioData」——最后一跳掉进 studioData 就再没人读，用户端一片空白，
 * 而回灌给模型的工具结果里还写着"图片已转发给用户"（等于谎报）。
 *
 * 本模块负责**纯数据**部分：把 SSE 收到的快照整理成"能给用户看的助手消息"。
 * 与 UI 无关（不 import 任何 app/ 下的类型），便于单测锁契约。
 *
 * 为什么必须是**独立一条助手消息**、而不是塞进模型正文：
 * - 正文由模型控制（它可能压根不提图），而画面是服务端工具产物 → 必须由数据驱动，保证必出现；
 * - 正文里塞 base64 会被当作文本送进上下文（token 爆炸），且会话落库体积失控。
 * 独立消息的 content 用 image_url 结构承载：服务端转发上游前会把**非 user 角色的图片**
 * 降级成 `[图片]` 文案（见 route.ts 的 sanitizedMessages），既不炸 token 也不丢上下文。
 *
 * ⛔ 时序约束（调用方必须遵守）：**只能在流结束后投递**。
 *    流式期间助手正文永远写 `messages[messages.length - 1]`，
 *    中途插入的消息会被下一段正文覆盖（详见 page.tsx 的 pendingCameraSnapshotsRef 注释）。
 */

/** 排队中的一条待投递快照（= SSE tool_result 里解析出来的画面） */
export interface PendingCameraSnapshot {
  /** 去重键（工具名 + 参数）：同一轮重复调用同一工具同一参数只投递一张 */
  key: string
  cameraId: 'a' | 'b'
  /** 画面本体：dataURL（服务端 ffmpeg 抓帧后直传）或同源 URL */
  dataUrl: string
  /** 触发这次截图的用户原话（用于截图消息的说明文案） */
  query?: string
}

/** 投递用的助手消息（结构对齐 `@/app/ai-assistant/types` 的 Message，避免 lib → app 反向依赖） */
export interface CameraSnapshotMessage {
  role: 'assistant'
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  >
  /** 🏷️ 渲染层据此走「快照卡」（整帧可见 / 看大图 / 下载），而非用户原图的 168px 小预览 */
  snapshot: { camera: 'a' | 'b'; capturedAt: number }
}

/** 用户原话太长时裁一下 —— 它要进消息正文（占上下文），一句话说明来源足够 */
const QUERY_MAX_LEN = 40

/** 把一条待投递快照转成用户可见的助手消息 */
export function toCameraSnapshotMessage(
  pending: PendingCameraSnapshot,
  capturedAt: number = Date.now(),
): CameraSnapshotMessage {
  const ask = (pending.query || '').trim()
  const askBrief = ask.length > QUERY_MAX_LEN ? `${ask.slice(0, QUERY_MAX_LEN)}…` : ask
  const label = pending.cameraId.toUpperCase()
  return {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: askBrief
          ? `针对「${askBrief}」，这是摄像头 ${label} 的实时画面：`
          : `这是摄像头 ${label} 的实时画面：`,
      },
      { type: 'image_url', image_url: { url: pending.dataUrl } },
    ],
    snapshot: { camera: pending.cameraId, capturedAt },
  }
}

/**
 * 批量投递：**同一相机同一时刻只留一张**。
 *
 * 实测模型偶尔会在同一轮里把工具调两遍（take_camera_snapshot 连调两次），
 * 画面相差不到 1 秒 —— 两张几乎一样的图并排出现纯属噪音。
 * 注意去重键是 `key`（工具名 + 参数），所以「左移一次 + 右移一次」这种
 * 参数不同的两次抓帧**不会**被合并，该给用户看的都还在。
 */
export function toCameraSnapshotMessages(
  pending: PendingCameraSnapshot[] | null | undefined,
  capturedAt: number = Date.now(),
): CameraSnapshotMessage[] {
  if (!Array.isArray(pending) || pending.length === 0) return []
  const seen = new Set<string>()
  const out: CameraSnapshotMessage[] = []
  for (const item of pending) {
    if (!item || !item.dataUrl) continue
    const key = item.key || `${item.cameraId}:${item.dataUrl.slice(0, 64)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(toCameraSnapshotMessage(item, capturedAt))
  }
  return out
}
