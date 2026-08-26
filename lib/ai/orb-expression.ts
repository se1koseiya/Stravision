/**
 * Berry Orb 表情系统 —— 基于 Grok Orb 表情集的多信号评分制情绪推断
 *
 * 表情词汇（12 种 Grok 姿态）+ 5 个遗留状态别名：
 * - 状态类（由加载/语音状态机驱动）：idle / thinking / working / speaking / listening
 * - 内容情绪（由回复文本推断）：happy / surprised / confused / angry / sad / skeptical / playful 等
 *
 * 检测引擎：多信号评分制（相比单条正则一票命中）：
 * 1. 强/中/弱关键词分级权重 + emoji + 标点语气，累计得分取最优
 * 2. 位置加权：结论部分（尾部）命中权重更高，开头次之
 * 3. 否定修正：「无法成功」不再误判为开心，反转为难过
 * 4. 领先优势判定：分数不足或与第二名咬得太近时维持 fallback，降低误判率
 */

/** Grok Orb 内容情绪表情（姿态数据见 components/smoothui/grok-orb-data.ts） */
export type GrokOrbExpression =
  | "natural"
  | "happy"
  | "surprised"
  | "focused"
  | "curious"
  | "sleepy"
  | "skeptical"
  | "angry"
  | "confused"
  | "sad"
  | "playful"
  | "shy";

/** 遗留状态表情：跟随加载/语音状态机切换，不需要文本证据 */
export type OrbStateExpression =
  | "idle"
  | "thinking"
  | "working"
  | "speaking"
  | "listening";

export type OrbExpression = GrokOrbExpression | OrbStateExpression;

export const STATE_EXPRESSIONS: ReadonlySet<OrbExpression> = new Set<OrbStateExpression>([
  "idle",
  "thinking",
  "working",
  "speaking",
  "listening",
]);

/** 状态 → Grok 姿态映射 */
export const STATE_TO_GROK: Record<OrbStateExpression, GrokOrbExpression> = {
  idle: "natural",
  thinking: "curious",
  working: "focused",
  speaking: "playful",
  listening: "focused",
};

export function toGrokExpression(expression: OrbExpression): GrokOrbExpression {
  if (STATE_EXPRESSIONS.has(expression)) {
    return STATE_TO_GROK[expression as OrbStateExpression];
  }
  return expression as GrokOrbExpression;
}

/** 可由文本推断的内容情绪 */
type ContentEmotion = "happy" | "surprised" | "confused" | "angry" | "sad" | "skeptical" | "playful";

/**
 * 检测参数（集中定义，方便调优）：
 * - tailBonus / headBonus：尾部/开头命中加权系数
 * - minScore：低于该分数视为无明确情绪
 * - margin：第一名需领先第二名的最小分差（除非达到 strongScore）
 * - strongScore：分数足够高时忽略分差直接采纳
 */
export const ORB_EMOTION_CONFIG = {
  tailStart: 0.67,
  tailBonus: 1.5,
  headEnd: 0.2,
  headBonus: 1.2,
  minScore: 2,
  margin: 1,
  strongScore: 4.5,
} as const;

type Signal = { expr: ContentEmotion; pattern: RegExp; weight: number };

/** 情绪信号表：强（3）→ 中（2）→ 弱（1），pattern 均需 g 标志 */
const SIGNALS: Signal[] = [
  // ── 强信号（明确情绪表达）──────────────────────────────
  { expr: "happy",     pattern: /太好了|太棒了|好消息|恭喜|值得高兴|圆满|大丰收|长势喜人|🎉|🥳|😄|😆/g, weight: 3 },
  { expr: "angry",     pattern: /警告|警报|危险|紧急|千万不|务必立即|立即处理|刻不容缓|⚠️|🚨/g, weight: 3 },
  { expr: "surprised", pattern: /没想到|出乎意料|居然|竟然|太意外|难以置信|天哪|😱|😮|😲/g, weight: 3 },
  { expr: "confused",  pattern: /不太清楚|没听清|没看懂|什么意思|你是说|不太明白|没理解|说清楚一点|🤔/g, weight: 3 },
  { expr: "sad",       pattern: /很遗憾|对不起|抱歉|令人痛心|惋惜|💔/g, weight: 3 },
  { expr: "skeptical", pattern: /值得怀疑|存疑|未必|不见得|恐怕不对|有问题/g, weight: 3 },

  // ── 中信号（语境依赖，需与其他信号竞争）────────────────
  { expr: "happy",     pattern: /成功|已完成|完成了|搞定|顺利|不错|很好|非常好|开心|高兴|✅|👍|👏/g, weight: 2 },
  { expr: "angry",     pattern: /超标|异常|故障|病虫害|灾害|禁止|请勿|严禁|受损|枯萎|蔫了/g, weight: 2 },
  { expr: "surprised", pattern: /失败|出错|出错了|无法完成|无法执行|暂时无法/g, weight: 2 },
  { expr: "confused",  pattern: /不确定|疑似|疑惑|奇怪|需要确认|确认一下/g, weight: 2 },
  { expr: "sad",       pattern: /失效|已停止|无法挽回|凋零|没能/g, weight: 2 },
  { expr: "skeptical", pattern: /需要核实|不太对劲|再确认一下/g, weight: 2 },
  { expr: "playful",   pattern: /开个玩笑|逗你|调皮|😝|😜|🤪/g, weight: 2 },

  // ── 弱信号（语气倾向，仅作加分项）─────────────────────
  { expr: "happy",     pattern: /[～~]|哈哈+|嘿嘿|嘻嘻/g, weight: 1 },
  { expr: "surprised", pattern: /哇|咦/g, weight: 1 },
  { expr: "confused",  pattern: /可能|也许|大概|或许|似乎/g, weight: 1 },
  { expr: "confused",  pattern: /[?？]{2,}/g, weight: 1.5 },
];

/** 否定前缀：出现在 happy 关键词紧前方时，将语义反转为「失败/难过」 */
const NEGATION = /无法|不能|没能|未能|没有|不再|不太/;

export type OrbEmotionScores = Record<ContentEmotion, number>;

export interface OrbEmotionAnalysis {
  scores: OrbEmotionScores;
  /** 得分最高且通过阈值判定的情绪；不足以判定时为 null */
  top: ContentEmotion | null;
  /** top 的得分（top 为 null 时为 0） */
  score: number;
}

/** 分析文本的情绪得分（评分制，不做阈值判定） */
export function scoreOrbEmotion(text: string): OrbEmotionScores {
  const scores: OrbEmotionScores = {
    happy: 0,
    surprised: 0,
    confused: 0,
    angry: 0,
    sad: 0,
    skeptical: 0,
    playful: 0,
  };
  const clean = (text ?? "").trim();
  if (!clean) return scores;

  const len = clean.length;
  const tailStart = len * ORB_EMOTION_CONFIG.tailStart;
  const headEnd = len * ORB_EMOTION_CONFIG.headEnd;

  for (const sig of SIGNALS) {
    for (const m of clean.matchAll(sig.pattern)) {
      let weight = sig.weight;
      if (m.index! >= tailStart) weight *= ORB_EMOTION_CONFIG.tailBonus;
      else if (m.index! <= headEnd) weight *= ORB_EMOTION_CONFIG.headBonus;

      // 否定修正：如「无法成功」「没能完成」→ 难过而非开心
      if (sig.expr === "happy") {
        const prefix = clean.slice(Math.max(0, m.index! - 4), m.index!);
        if (NEGATION.test(prefix)) {
          scores.sad += weight + 1;
          continue;
        }
      }
      scores[sig.expr] += weight;
    }
  }
  return scores;
}

/** 完整分析：评分 + 阈值/领先优势判定 */
export function analyzeOrbEmotion(text: string): OrbEmotionAnalysis {
  const scores = scoreOrbEmotion(text);
  const ranked = (Object.entries(scores) as Array<[ContentEmotion, number]>).sort(
    (a, b) => b[1] - a[1]
  );
  const [topExpr, topScore] = ranked[0];
  const runnerUp = ranked[1][1];

  const hasWinner =
    topScore >= ORB_EMOTION_CONFIG.minScore &&
    (topScore - runnerUp >= ORB_EMOTION_CONFIG.margin ||
      topScore >= ORB_EMOTION_CONFIG.strongScore);

  return { scores, top: hasWinner ? topExpr : null, score: hasWinner ? topScore : 0 };
}

/**
 * 根据 AI 输出文本推断表情。
 * @param text AI 的回复文本（流式场景传增量拼接文本即可，全文参与评分）
 * @param fallback 没有命中明确情绪时返回的表情，默认 "natural"
 */
export function detectOrbExpression(
  text: string,
  fallback: OrbExpression = "natural"
): OrbExpression {
  const { top } = analyzeOrbEmotion(text);
  return top ?? fallback;
}
