/**
 * 视觉诊断类型层 —— 病虫害图像诊断
 *
 * 设计原则：
 * 1. 与 `lib/types/plant-growth-types.ts`（生长巡检语义）**并列而非修改**，
 *    避免摄像头巡检链路回归。
 * 2. `Detection` 的 bbox 采用**归一化坐标**（0~1），使
 *    「YOLO 本地检测」与「VLM grounding 定位」共用同一套前端渲染协议 ——
 *    渲染层因此无需知道框是哪个引擎产的。
 * 3. 所有诊断结论必须携带 `evidence`（图中依据）与 `confidence`：
 *    这是兜住视觉模型幻觉的硬约束，也是卡片上"可核对"的来源。
 */

// ---------------------------------------------------------------------------
// 检测框
// ---------------------------------------------------------------------------

/** 归一化边界框：值域 0~1，相对图片原始宽高。裁剪放大 / 渲染叠层均以此为准。 */
export interface BBox {
    /** 左上角 x（0~1） */
    x: number
    /** 左上角 y（0~1） */
    y: number
    /** 宽度（0~1） */
    w: number
    /** 高度（0~1） */
    h: number
}

/** 检测来源 —— 决定前端文案与可信度展示方式 */
export type DetectionSource = 'yolo' | 'vlm' | 'manual'

/** 单个被检出的目标（病斑 / 虫体 / 果实 / 叶片…） */
export interface Detection {
    /** 稳定 id，用于 React key 与选中态 */
    id: string
    /** 展示名，如「病斑」「蚜虫」「果实」 */
    label: string
    /** 稳定类别 key（用于图标映射 / 统计），如 `leaf_spot` */
    labelKey?: string
    /** 置信度 0~1 */
    confidence: number
    bbox: BBox
    source: DetectionSource
    /** 该框的细化说明（VLM 对 ROI 的结论，可选） */
    note?: string
    /** 该框局部严重度（可选） */
    severity?: DiagnosisSeverity
}

// ---------------------------------------------------------------------------
// 诊断语义
// ---------------------------------------------------------------------------

/** 严重度 —— 农业语境下 严重=红、健康=绿，不做股市式反色 */
export type DiagnosisSeverity = 'none' | 'mild' | 'moderate' | 'severe'

/** 病害大类 */
export type DiseaseCategory =
    | 'fungal'          // 真菌性病害
    | 'bacterial'       // 细菌性病害
    | 'viral'           // 病毒性病害
    | 'pest'            // 虫害
    | 'physiological'   // 生理性病害（环境胁迫）
    | 'nutrient'        // 营养失调
    | 'unknown'         // 信息不足，待补充

/** 鉴别诊断项 —— 让用户看到"为什么不是别的" */
export interface Differential {
    /** 候选病名 */
    name: string
    /** 是否已排除 */
    excluded: boolean
    /** 排除或保留的理由 */
    reason: string
}

/**
 * 可能原因（按可能性降序）—— 供「可能原因」面板的进度条列表使用。
 *
 * 与 {@link Differential} 的区别：differentials 回答「为什么不是别的」（排除逻辑），
 * candidates 回答「还有多大可能是别的」（概率排序）。刻意分成两个字段，
 * 是因为二者在提示词里的约束不同 —— 前者要求给排除理由，后者要求给概率。
 */
export interface DiseaseCandidate {
    /** 候选病名，如「灰霉病」 */
    name: string
    /**
     * 可能性 0~1。模型未给出时保持 undefined ——
     * 卡片此时**不画进度条**、只按顺序展示，绝不用序号臆造一个百分比。
     */
    probability?: number
    /** 一句话说明（为什么可能是它 / 为什么排除） */
    note?: string
    /** 是否已被排除 */
    excluded?: boolean
}

/**
 * 病斑分析的一行 —— 「叶片表现 / 病斑特征 / 颜色与边界」这类成对观察项。
 * 完整详情页用它做「维度 → 结论」的两列排版，比一段流水账更可核对。
 */
export interface AnalysisRow {
    /** 观察维度，如「叶片表现」 */
    label: string
    /** 该维度下的具体观察结果 */
    value: string
}

/**
 * 相似案例 —— 由**联网检索**得到的同病害历史案例（含配图）。
 *
 * 图片一律经站内代理 `/api/vision/image-proxy` 输出：外链直引会撞防盗链与混合内容，
 * 代理侧统一做来源校验、类型白名单与缓存。
 */
export interface SimilarCase {
    /** 稳定 id（用来源 URL 派生），用于 React key */
    id: string
    /** 案例标题，如「草莓·灰霉病」 */
    title: string
    /** 作物名（能识别到时给出） */
    crop?: string
    /** 一句话描述（来自检索摘要，已截断） */
    description?: string
    /** 发生/发布日期 YYYY-MM-DD */
    date?: string
    /** 配图地址（站内代理 URL） */
    imageUrl?: string
    /** 原始网页地址（用户可点开溯源） */
    sourceUrl: string
    /** 来源站点名 */
    source?: string
}

/** 防治层级 —— 按绿色防控优先级排序 */
export type TreatmentLevelKey = 'environment' | 'physical' | 'biological' | 'chemical'

export interface TreatmentLevel {
    level: TreatmentLevelKey
    /** 展示名，如「环境调控」 */
    label: string
    /** 具体操作 */
    actions: string[]
    /** 安全间隔期（天）—— 化学药剂必填 */
    safetyIntervalDays?: number
}

// ---------------------------------------------------------------------------
// 诊断结果
// ---------------------------------------------------------------------------

export interface DiagnosisMeta {
    /** 实际使用的模型 id（来自用户 provider 配置，非硬编码） */
    model: string
    /** 供应商类型 */
    provider?: string
    /** 参与诊断的图片数 */
    images: number
    /** 耗时（毫秒） */
    elapsedMs: number
    /** 是否走了降级路径 */
    degraded?: boolean
    /** 降级原因（面向开发者，不直接展示给用户） */
    degradedReason?: string
}

export interface DiagnosisResult {
    /** 主诊断病名（`category === 'unknown'` 时可为「信息不足」） */
    diseaseName: string
    /**
     * 一句话结论 —— 卡片头部直接展示给种植户的那句话（部位 + 程度 + 典型表现）。
     * 模型可给可不给；缺失时卡片端会兜底拼一句，所以是可选字段。
     */
    summary?: string
    /** 病害大类 */
    category: DiseaseCategory
    /** 整体置信度 0~1 */
    confidence: number
    /** 严重度 */
    severity: DiagnosisSeverity
    /** 受害部位，如 ['叶片', '果实'] */
    affectedParts: string[]
    /** 图中依据 —— 可核对，是抗幻觉的核心 */
    evidence: string[]
    /** 鉴别排除 */
    differentials: Differential[]
    /**
     * 可能原因（由高到低，含主诊断）。缺失时卡片会用 `differentials` 兜底排列，
     * 但**不会**臆造概率 —— 没有 probability 就不画进度条。
     */
    candidates?: DiseaseCandidate[]
    /** 病斑分析的分维度观察（叶片表现 / 病斑特征 / 颜色与边界…） */
    analysis?: AnalysisRow[]
    /** 相似案例（联网检索结果；异步补齐，可能为空） */
    similarCases?: SimilarCase[]
    /** 四级防治方案 */
    treatments: TreatmentLevel[]
    /** 补拍建议（置信度偏低时给出，而非硬下结论） */
    followUp?: string[]
    /** 检测框（可为空数组：无定位能力时仍是有效诊断） */
    detections: Detection[]
    meta: DiagnosisMeta
    timestamp: number
}

// ---------------------------------------------------------------------------
// 语义元数据
// ---------------------------------------------------------------------------

export interface SeverityMeta {
    label: string
    /** 主色（明暗主题下均由调用方叠加透明度使用） */
    color: string
    /** 浅底 */
    bg: string
    /** 一句话判定说明 */
    hint: string
}

export const SEVERITY_META: Record<DiagnosisSeverity, SeverityMeta> = {
    none: { label: '未见异常', color: '#059669', bg: 'rgba(5,150,105,0.10)', hint: '未检出明显病征，保持常规管理' },
    mild: { label: '轻度', color: '#65A30D', bg: 'rgba(101,163,13,0.10)', hint: '局部零星发生，及时干预可控' },
    moderate: { label: '中度', color: '#D97706', bg: 'rgba(217,119,6,0.12)', hint: '已扩散至多点，需尽快处理' },
    severe: { label: '重度', color: '#DC2626', bg: 'rgba(220,38,38,0.12)', hint: '大面积发生，须立即处置并隔离' },
}

export interface CategoryMeta {
    label: string
    /** 对应可用图标名（@/components/icon），由消费方引入避免类型层依赖 UI */
    icon: string
    hint: string
}

export const CATEGORY_META: Record<DiseaseCategory, CategoryMeta> = {
    fungal: { label: '真菌性病害', icon: 'IconExperiment', hint: '多在高湿、温差大的环境条件下流行' },
    bacterial: { label: '细菌性病害', icon: 'IconExperiment', hint: '常经伤口、雨水飞溅传播' },
    viral: { label: '病毒性病害', icon: 'IconExperiment', hint: '多由蚜虫、粉虱等媒介传播，需先治虫' },
    pest: { label: '虫害', icon: 'IconBug', hint: '关注虫口密度与天敌数量' },
    physiological: { label: '生理性病害', icon: 'IconLeaf', hint: '多由温湿度、光照胁迫引起，非传染性' },
    nutrient: { label: '营养失调', icon: 'IconSeedling', hint: '结合 EC / pH 与缺素症状综合判断' },
    unknown: { label: '信息不足', icon: 'IconHelp', hint: '当前图片不足以判定，建议补拍特写' },
}

export const TREATMENT_LEVEL_META: Record<TreatmentLevelKey, { label: string; icon: string; order: number }> = {
    environment: { label: '环境调控', icon: 'IconThermometer', order: 1 },
    physical: { label: '物理防治', icon: 'IconScissors', order: 2 },
    biological: { label: '生物防治', icon: 'IconSeedling', order: 3 },
    chemical: { label: '化学防治', icon: 'IconMedicineChest', order: 4 },
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

export function getSeverityMeta(severity: DiagnosisSeverity): SeverityMeta {
    return SEVERITY_META[severity] ?? SEVERITY_META.none
}

export function getCategoryMeta(category: DiseaseCategory): CategoryMeta {
    return CATEGORY_META[category] ?? CATEGORY_META.unknown
}

/** 置信度分档文案 —— 卡片据此决定是"给结论"还是"建议补拍" */
export function getConfidenceTier(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.75) return 'high'
    if (confidence >= 0.55) return 'medium'
    return 'low'
}

/** 低于该置信度时，UI 应优先展示 followUp 补拍建议而非下达结论 */
export const LOW_CONFIDENCE_THRESHOLD = 0.55

/** 把任意来源的坐标收敛为合法归一化 bbox（clamp + 纠偏） */
export function normalizeBBox(input: Partial<BBox> | null | undefined): BBox | null {
    if (!input) return null
    const nums = [input.x, input.y, input.w, input.h]
    if (nums.some((n) => typeof n !== 'number' || !Number.isFinite(n))) return null

    let { x, y, w, h } = input as BBox
    // 容错：上游可能给 [x1,y1,x2,y2] 而非 [x,y,w,h]
    if (x + w > 1.02 && y + h > 1.02 && x < 1 && y < 1) {
        w = w - x
        h = h - y
    }
    x = Math.min(Math.max(x, 0), 1)
    y = Math.min(Math.max(y, 0), 1)
    w = Math.min(Math.max(w, 0), 1 - x)
    h = Math.min(Math.max(h, 0), 1 - y)
    // 过滤退化框
    if (w < 0.005 || h < 0.005) return null
    return { x, y, w, h }
}

/** 运行时校验：只有结构完整的结果才会被送进卡片渲染 */
export function isDiagnosisResult(value: unknown): value is DiagnosisResult {
    if (!value || typeof value !== 'object') return false
    const v = value as Partial<DiagnosisResult>
    return (
        typeof v.diseaseName === 'string' &&
        typeof v.category === 'string' &&
        typeof v.confidence === 'number' &&
        typeof v.severity === 'string' &&
        Array.isArray(v.evidence) &&
        Array.isArray(v.treatments)
    )
}
