/**
 * 预览渲染器的统一入参
 *
 * 每个格式一个模块、默认导出同名组件，由 `document-preview.tsx` 按需 `import()`。
 * 之所以"一个格式一个模块"而不是一个大 switch：
 * 解析/渲染库体积都不小，动态 import 才能确保它们不进首屏包 ——
 * 预览是"点开才需要"的能力，不该让每一条对话都为它买单。
 */

export interface PreviewSurfaceProps {
  /**
   * 预览模型。
   *
   * 两种形态，由接口返回的 `source` 区分：
   *   · `model`  —— 生成时留下的结构化版式（PPTX 走这条，见 `pptx.tsx`）；
   *   · `digest` —— 服务端抽出的 DocumentDigest（兜底，见 `digest.tsx`）。
   */
  previewModel: any
  /** 鉴权下载地址（PDF 内联预览时拼 `?inline=1`） */
  downloadUrl?: string
  fileName: string
  /** 小写格式名 */
  format: string
}
