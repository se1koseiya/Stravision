/**
 * 文档子系统 · 统一数据模型
 *
 * ## 为什么要有这一层
 *
 * 「让 AI 会读 Office 文档」最容易走成的形态是：每种格式一个工具、各返回各的字符串。
 * 一旦这样，模型要记住四套参数、四套返回结构，且同一份内容从 docx 与从 pdf 进来
 * 长得完全不一样 —— 它没法把「读到的第五章」直接喂给「生成一份 pptx」。
 *
 * 所以这里定义唯一中间表示（IR）：
 *
 *   文件 ──extract/*──▶ DocumentDigest ──渲染成文本──▶ 模型
 *                              │
 *                              └──▶ 可跨格式复用到 generate/*
 *
 * DocumentDigest 是**给模型看的视图**（不是完整保真模型）：分节文本 + 表格 + 图片索引 +
 * 结构统计。真正需要保格式的原地编辑走 `edit/*`，直接操作 OOXML，不经过 IR
 * （IR 往返会丢掉字体、段落间距、编号定义这些「格式」，而用户要的正是"改完还是原样"）。
 */

/** 本子系统支持的文档格式 */
export type DocFormat =
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'md'
  | 'txt'
  | 'csv'
  | 'json'
  | 'html'

/** 可生成的格式（pdf 亦在此，但中文需嵌字体，见 render/pdf.ts） */
export type WritableFormat = 'docx' | 'xlsx' | 'pptx' | 'pdf' | 'md'

/** 分节粒度：pdf 按页、xlsx 按工作表、pptx 按幻灯片、docx/md 按标题层级切分 */
export type SectionKind = 'page' | 'sheet' | 'slide' | 'section'

/** 大纲条目（目录树，供模型判断"该读哪一段"） */
export interface OutlineNode {
  /** 层级，1 = 最高（pdf 无标题结构时按页生成 level 1） */
  level: number
  title: string
  /** 指向 sections 数组的下标，便于模型只读需要的分节 */
  sectionIndex?: number
}

/** 一个分节的纯文本内容 */
export interface DigestSection {
  index: number
  kind: SectionKind
  /** 展示名：`第 3 页` / `工作表「温湿度」` / `第 5 张幻灯片` / 标题 */
  label: string
  text: string
  charCount: number
  /** 该分节内表格在 digest.tables 里的下标 */
  tableIndexes?: number[]
}

/** 表格（已转成二维数组，表头单独标出） */
export interface DigestTable {
  /** 所在分节下标 */
  sectionIndex: number
  /** 表格名：`Sheet1!A1:D20` / `第 2 页 · 表 1` */
  label: string
  headers: string[]
  rows: string[][]
  /** 因体积上限被截断的行数 */
  truncatedRows: number
}

/**
 * 图片索引条目。
 *
 * 关键设计：**不做 OCR**。
 * 图片类内容（扫描页、截图、图表）由多模态模型直接看 —— 见 `describeImage`。
 * `transcript` 只有在调用方显式要求、且视觉链路可用时才填充。
 */
export interface DigestImage {
  sectionIndex: number
  label: string
  /** 图片字节大小（判断是否值得送模型） */
  bytes: number
  /** 宽高（已知时） */
  width?: number
  height?: number
  /** 多模态模型转写出的内容（未转写则 undefined） */
  transcript?: string
  /** 图片本身的 dataURL，供上层决定是否回传/渲染（大图不回传，避免爆上下文） */
  dataUrl?: string
}

/** 文档统计 */
export interface DocumentStats {
  pages?: number
  sheets?: number
  slides?: number
  paragraphs?: number
  chars: number
  tables: number
  images: number
  /** 无文本层的页/图（扫描件）数量 —— 决定是否需要多模态补读 */
  textlessUnits?: number
}

/** 读取结果 —— 子系统的核心输出 */
export interface DocumentDigest {
  fileId: string
  fileName: string
  format: DocFormat
  sizeBytes: number
  /** 文档标题（能从元数据取到则取，否则回退文件名） */
  title: string
  outline: OutlineNode[]
  sections: DigestSection[]
  tables: DigestTable[]
  images: DigestImage[]
  stats: DocumentStats
  /** 是否因字符预算被截断（模型据此决定是否分节续读） */
  truncated: boolean
  /** 降级/告警说明，面向模型与用户各一句（例：该 PDF 为扫描件，文本层为空） */
  notes: string[]
}

/** 产物引用 —— 生成/编辑结果的统一返回体 */
export interface ArtifactRef {
  fileId: string
  fileName: string
  format: DocFormat
  sizeBytes: number
  /** 相对站点的下载路径，前端直接用作 href */
  downloadUrl: string
  /** 来源：generated=新建，edited=基于某文件修改 */
  origin: 'generated' | 'edited' | 'uploaded'
  /** edited 时的源文件 id */
  sourceFileId?: string
  createdAt: number
}

/** 上传/生成落盘后的文件元数据 */
export interface StoredDocumentMeta {
  fileId: string
  userId: number
  fileName: string
  format: DocFormat
  sizeBytes: number
  origin: ArtifactRef['origin']
  sourceFileId?: string
  /** 会话归属（用于把产物关联回对话，便于前端渲染下载卡） */
  sessionId?: string
  createdAt: number
  /** 内容 sha256，用于去重与「同一文件重复上传」判定 */
  sha256: string
  /**
   * 预览模型（**只在我们自己生成产物时写入**）。
   *
   * 为什么需要它：PPTX / DOCX 是二进制包，浏览器里没有原生渲染器，
   * 让用户"下载完才知道长什么样"是最糟的交互。既然文件是我们拼出来的，
   * 就把排版时的**结构**（而不是二进制）留一份在元数据里 ——
   * 前端照着它渲染，预览与最终文件天然一致，也不用二次解析。
   *
   * 外部上传件没有它 → 走 /preview 接口的服务端 Digest 兜底渲染。
   */
  previewModel?: unknown
}
