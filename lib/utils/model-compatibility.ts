/**
 * Utility functions for checking model compatibility with various features
 */

/**
 * Check if a model supports search functionality
 * @param model - The model name
 * @param apiUrl - The API URL (optional)
 * @returns true if the model supports search, false otherwise
 */
export function supportsSearch(model: string | undefined, apiUrl?: string): boolean {
  if (!model) return false
  
  const isDashScope = apiUrl?.includes("dashscope.aliyuncs.com") || model?.startsWith("qwen")
  
  if (!isDashScope) {
    // OpenAI models don't support search through this API
    return false
  }
  
  // Only qwen-max and qwen3-max series support search in DashScope
  const modelLower = model.toLowerCase()
  return modelLower.includes("qwen-max") || modelLower.includes("qwen3-max")
}

/**
 * Get a user-friendly message explaining why search is not supported
 * @param model - The model name
 * @returns A message explaining the limitation
 */
export function getSearchUnsupportedMessage(model: string | undefined): string {
  if (!model) return "请先选择一个模型"
  
  const modelLower = model.toLowerCase()
  
  if (modelLower.includes("gpt") || modelLower.includes("openai")) {
    return "OpenAI 模型暂不支持联网搜索功能"
  }
  
  if (modelLower.includes("qwen")) {
    return "当前模型不支持搜索，请使用 qwen-max 或 qwen3-max 系列模型"
  }
  
  return "当前模型不支持联网搜索功能"
}
