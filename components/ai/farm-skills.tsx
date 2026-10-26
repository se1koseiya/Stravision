"use client"

/**
 * 种植能力入口（4 条）—— 一键把「结构化提示词」灌进输入框。
 *
 * 2026-10-01 从 components/ai/matechat-home.tsx 抽出来成为共享模块，只因为
 * 用户要求「把这些（能力胶囊）放到 sender 里」：
 *   · 真实应用 /ai-assistant：走 `FarmSkillChips`（与 sender 同一套 `ModeChip` 视觉）
 *   · 落地页首屏那台「应用演示窗」：仍由 MateChatHome 的自带输入卡渲染
 * 两处必须同源，否则提示词会分叉 —— 所以定义（含 icon / prompt）只有这一份。
 *
 * 形态演进（同一天，用户补了两张参考稿之后）：
 *   绿色描边胶囊 → **扁平无边框的图文按钮**，选中后整排收起、只留一枚绿色 × 胶囊。
 *   视觉原子搬到 `components/ai/sender-modes.tsx`，这里只留数据 + 一个便捷包装。
 *
 * 2026-10-04（视觉能力）：`disease` 胶囊从「灌一段文字让用户口述症状」升级为
 * **图像诊断入口** ——
 *   1. 点击时自动唤起图片选择器（`pickImage: true`）；
 *   2. prompt 内嵌 `<DIAGNOSIS>` JSON 契约，使模型输出可被渲染成「诊断卡片」
 *      而不是一段散文（卡片渲染见 components/ai/diagnosis-card.tsx）。
 *
 * ⚠️ 这里**只有数据与一个纯展示组件**，不碰任何布局/状态。
 */

import React from "react"
import { IconBug, IconChartLine, IconScanCode, IconSeedling } from "@/components/icon"
import { ModeChip, type SenderModeItem } from "@/components/ai/sender-modes"

export interface FarmSkill {
  key: string
  label: string
  /** 点击后灌入输入框的完整提示词 */
  prompt: string
  /** 进入该能力后的 placeholder（此时输入框已被灌了模板，主要在清空后可见） */
  placeholder?: string
  icon: React.ReactNode
  /**
   * 该能力**必须依赖图片**输入。
   * 为 true 时 sender 会在进入模式的同一拍唤起文件选择器 ——
   * 省掉「用户还得自己找 + 号」这一跳，也让能力意图更明确。
   */
  pickImage?: boolean
}

export const FARM_SKILLS: FarmSkill[] = [
  {
    key: "inspect",
    label: "巡检分析",
    placeholder: "描述本次要巡检的棚区，或直接开始巡检分析",
    icon: <IconScanCode size={14} />,
    prompt: `请基于设备上传的巡检数据，对当前草莓大棚执行一次完整巡检分析，按以下结构输出：

1. 【核心指标速览】当前温度、湿度、CO₂、光照、土壤含水率、NDVI 健康指数，对比标准范围（白天 20-25℃ / 夜间 10-15℃ / 湿度 60-80% / CO₂ 800-1200ppm / 光照 30000-50000lux / NDVI 0.6-0.8），用 ✅/⚠️/❌ 标注每一项。
2. 【异常定位】找出偏离阈值的指标，定位可能的发生位置（几号棚 / 哪一垄 / 哪个时段）。
3. 【风险预警】结合近 24h 趋势，预测未来 6-12h 可能放大的问题（如连续高湿 → 白粉病风险、连续高温干旱 → 红蜘蛛风险）。
4. 【处置建议】按「紧急 / 重要 / 一般」三档给出可执行措施，并标注每项预估耗时与人力。
5. 【复核点位】列出建议人工复核的 1-3 个具体位置，方便巡检员二次确认。

请开始：`,
  },
  {
    key: "disease",
    label: "病虫害识别",
    placeholder: "上传病叶 / 果实 / 茎秆照片，我来诊断",
    icon: <IconBug size={14} />,
    pickImage: true,
    prompt: `请诊断我上传的草莓照片，给出可核对的结论。

【若尚未收到图片】只回一句话，提示我上传照片，并说明拍摄要点（病部特写 / 叶背 / 果实 / 整株各一张，光线充足、对焦清晰）。**不要输出 JSON。**

【收到图片后】**必须调用 diagnose_plant_image 工具**完成诊断，不要自己手写 <DIAGNOSIS> 标签或 JSON：

- 工具会自动拿到我刚发的图片，你只需在参数里补充线索（发病部位、发生范围、近期天气与用药史）与我的问题；
- 调用后系统会渲染「诊断卡片」和「在原图上标注病害部位的遮罩图」，你只需用一段话总结结论与下一步操作；
- 严禁凭空判断"这大概是灰霉病" —— 没有调用工具就直接下结论属于编造。

【追问也要调工具】我已经发过照片、现在又说「我要病害部位图 / 把病害部位标出来 / 圈一下哪儿病了」时，
**不要重新要图，也不要画示意图** —— 直接再调用一次 diagnose_plant_image（图片会自动沿用我之前发的那张），
系统会用它的定位结果在我**本人的那张照片**上生成遮罩图。⛔ 严禁用 ILLU/SVG 手绘"病害分布示意图"来代替，
那不是我要的东西。

工具返回后再补充这些硬性要求对应的检查（若结果不满足，如实说明并可请我补拍）：
1. evidence 必须是图中**真实可见**的特征，不得引用教科书描述充当依据。
2. 鉴别诊断需覆盖最容易混淆的候选（生理性缺素 / 日灼 / 药害 必须与传染性病害区分）。
3. 置信度低于 0.55 时不要硬下结论，把补拍建议说给我听。
4. 化学防治必须带安全间隔期；优先环境调控与生物防治。`,
  },
  {
    key: "env",
    label: "环境监测",
    placeholder: "选择要汇总的棚区与时段，或直接生成环境简报",
    icon: <IconChartLine size={14} />,
    prompt: `请汇总当前草莓大棚环境监测数据，并生成可直接交给种植户的简报：

【实时数据】
- 空气温度（℃） / 空气湿度（%）
- 土壤温度（℃） / 土壤含水率（%）
- CO₂ 浓度（ppm） / 光照强度（lux） / 累计光合有效辐射 J/cm²
- 近 1h / 24h / 7d 趋势对比

【分项评估】对每一项指标输出：当前值 | 标准范围 | 偏差 | 评级（优/良/中/差）。

【调控动作清单】仅列出当前需要立即触发的项，格式：
- [设备名] [动作] [目标值] [建议时长] [预期效果]

【异常告警】用一句大白话告诉种植户"现在该不该担心"——比如"温度 32℃ 已超阈值，建议 10 分钟内开启 1、2 号风机"。

【次日展望】结合近 3 日数据，预测明早 6-10 点可能出现的风险（高湿/低温/光照不足），并给出今夜 22:00-明早 6:00 的预防性调控建议。

请开始汇总：`,
  },
  {
    key: "strategy",
    label: "种植策略",
    placeholder: "告知品种与生育期，或直接给出未来 7 天调控策略",
    icon: <IconSeedling size={14} />,
    prompt: `请以莓小智种植策略师身份，基于当前环境与生育期，给出接下来 7 天的精准调控策略：

【先确认生育期】——如果我还告诉你品种（红颜 / 甜查理 / 章姬 / 圣诞红等），请自行结合品种特性。

【一、环境策略（按生育期）】给出每天的：
- 白天温度区间、夜间温度区间、湿度区间
- 通风时段、加湿/除湿触发条件
- CO₂ 释放窗口与目标浓度
- 补光时长（如需要）与推荐光谱配比
  - 营养生长期：蓝光为主（R:50 G:100 B:255）
  - 花果期：红光为主（R:255 G:100 B:50）
  - 平衡期：R:200 G:50 B:150

【二、水肥策略】
- 灌溉频次、每次时长、EC/pH 目标区间
- 关键生育期重点元素（花期偏磷钾、果实膨大期偏钾）

【三、农事操作】按日期给出 7 天任务表：摘老叶、疏花疏果、授粉、采收、防病节点等。

【四、风险预案】列出本周最可能的 2 类风险及应对 SOP。

请先读取我当前大棚的实时数据，再输出策略。`,
  },
]

/**
 * 把 4 条种植能力转成 sender 的「模式行」定义。
 *
 * `seed` = 完整提示词 → 进入模式时灌进输入框（保留「看得见、改得动」的老体验，
 * 而不是像纯模式那样把模板藏在系统提示里）；`placeholder` 只在用户清空后可见。
 * `pickImage` 透传给 sender，用于「进入即唤起选图」。
 */
export function farmSkillsToModes(): SenderModeItem[] {
  return FARM_SKILLS.map((s) => ({
    key: `farm:${s.key}`,
    label: s.label,
    icon: s.icon,
    placeholder: s.placeholder,
    seed: s.prompt,
    pickImage: s.pickImage,
  }))
}

export interface FarmSkillChipsProps {
  darkMode?: boolean
  disabled?: boolean
  /** 点击后把该条提示词交给调用方（通常是 setInput + focus） */
  onPick: (skill: FarmSkill) => void
  /** 只渲染前 N 条 —— 工具条挤不下时由调用方裁剪（用户：「位置紧张就去掉一两个」） */
  limit?: number
}

/**
 * 一排扁平能力胶囊（落地页首屏 / 其它非 sender 场景用）。
 * 视觉与 `/ai-assistant` 的工具条完全同源（同一个 `ModeChip`），只是点击语义
 * 在这里简化为「直接灌提示词」，不带模式状态。
 */
export function FarmSkillChips({ darkMode = false, disabled = false, onPick, limit }: FarmSkillChipsProps) {
  const items = limit != null ? FARM_SKILLS.slice(0, limit) : FARM_SKILLS
  return (
    <>
      {items.map((skill) => (
        <ModeChip
          key={skill.key}
          label={skill.label}
          icon={skill.icon}
          darkMode={darkMode}
          disabled={disabled}
          onClick={() => onPick(skill)}
        />
      ))}
    </>
  )
}
