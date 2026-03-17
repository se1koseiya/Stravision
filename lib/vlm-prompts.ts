// VLM Prompt Templates for Plant Diagnosis

export const PLANT_DIAGNOSIS_PROMPT = `请分析图片中的草莓植株状况，返回JSON格式诊断结果。

要求：
1. 评估生长阶段（1-6）：幼苗期/生长期/花芽分化期/开花结果期/果实成熟期/采收后期
2. 整体健康度评分（0-100）
3. 识别可见问题（病虫害、营养不良、环境压力等）
4. 提供改进建议
5. 将画面分为6个区域（从左到右），评估每个区域的植株健康度（0-100）

返回JSON格式（不要有任何额外文字）：
{
  "stage": <1-6数字>,
  "healthScore": <0-100数字>,
  "issues": [<问题列表字符串>],
  "recommendations": [<建议列表字符串>],
  "heatmap": [<6个数字，表示从左到右6个区域的健康度0-100>]
}

评估标准：
- 叶片：颜色（深绿健康，黄化/褐化异常）、大小、形态、病斑
- 茎秆：粗壮度、颜色、是否有病害
- 果实：大小、颜色、成熟度、病虫害
- 整体：密度、生长势、均匀度

仅返回JSON，不要其他解释。`

export const PLANT_DIAGNOSIS_PROMPT_COMPACT = `分析草莓植株，返回JSON：
{"stage":<1-6>,"healthScore":<0-100>,"issues":[...],"recommendations":[...],"heatmap":[6个数值0-100]}

阶段：1幼苗/2生长/3花芽/4开花/5成熟/6采收
评分：叶色形态、茎秆、果实、整体
热图：从左到右6区域健康度

仅JSON无其他文字。`

// Get default model for VLM analysis
export function getDefaultVLMModel(): string {
    return 'qwen3-vl-plus'
}

// Get available VLM models
export function getAvailableVLMModels(): string[] {
    return [
        'qwen3-vl-plus',
        'qwen3-vl-max',
        'qwen-vl-turbo'
    ]
}
