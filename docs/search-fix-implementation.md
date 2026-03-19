# AI 助手搜索功能修复 - 实施方案

## 问题确认

通过代码审查和历史会话分析，确认了以下问题：

### 1. 用户尝试使用搜索但失败
从 `data/sessions.json` 可以看到大量失败的搜索尝试：
- 用户使用 `@mcp_firecrawl_scrape` 尝试搜索
- AI 回复"我无法直接调用 Firecrawl"
- 或者返回 500 错误

### 2. 搜索工具已定义但未正确触发
- `lib/mcp/mcp-tool-definitions.ts` 中已定义：
  - `mcp_brave_search` - Brave 搜索引擎
  - `mcp_exa_search` - Exa 语义搜索
  - `mcp_firecrawl_scrape` - 网页抓取
- `lib/mcp/mcp-tool-executor.ts` 中已实现执行逻辑
- 但 AI 没有主动调用这些工具

### 3. 根本原因
1. **MCP 服务未启用**：用户可能没有在 MCP 商店中安装和启用搜索服务
2. **API Key 未配置**：即使启用了服务，也没有配置必需的 API Key
3. **AI 提示词不够强制**：系统提示词没有强制要求 AI 使用搜索工具
4. **前端状态不同步**：前端显示的"正在搜索"是模拟数据，不反映真实状态

## 修复方案

### 方案 A：引导用户配置 MCP 服务（推荐）

创建一个配置向导，帮助用户：
1. 安装搜索 MCP 服务
2. 配置 API Keys
3. 测试搜索功能

### 方案 B：使用系统托管的搜索服务

如果用户没有配置自己的 API Key，使用系统提供的搜索服务（需要后端支持）。

### 方案 C：改进 AI 提示词

强化系统提示词，明确告诉 AI：
- 何时必须使用搜索工具
- 如何正确调用工具
- 搜索失败时的降级策略

## 实施步骤

### 步骤 1：检查 MCP 配置状态

创建一个诊断工具来检查搜索服务的配置状态：

```typescript
// lib/mcp/mcp-diagnostics.ts
export function diagnoseSearchTools() {
  const installedStr = localStorage.getItem('mcp-installed-servers')
  if (!installedStr) {
    return {
      status: 'not_configured',
      message: '未安装任何 MCP 服务',
      actions: ['打开 MCP 商店', '安装搜索服务']
    }
  }

  const serverIds = JSON.parse(installedStr)
  const searchServers = ['brave-search', 'exa-search', 'firecrawl']
  const installedSearchServers = serverIds.filter((id: string) => 
    searchServers.includes(id)
  )

  if (installedSearchServers.length === 0) {
    return {
      status: 'no_search_tools',
      message: '未安装搜索工具',
      actions: ['安装 Brave Search', '安装 Exa Search', '安装 Firecrawl']
    }
  }

  // 检查 API Key 配置
  const missingKeys = []
  for (const id of installedSearchServers) {
    const configStr = localStorage.getItem(`mcp-config-${id}`)
    if (configStr) {
      const config = JSON.parse(configStr)
      const apiKey = config.envVars ? Object.values(config.envVars)[0] : null
      if (!apiKey || apiKey === 'your-api-key-here') {
        missingKeys.push(id)
      }
    }
  }

  if (missingKeys.length > 0) {
    return {
      status: 'missing_api_keys',
      message: `以下服务缺少 API Key: ${missingKeys.join(', ')}`,
      actions: ['配置 API Keys']
    }
  }

  return {
    status: 'ready',
    message: '搜索功能已就绪',
    installedTools: installedSearchServers
  }
}
```

### 步骤 2：在 AI 助手页面添加搜索状态指示器

```typescript
// app/ai-assistant/page.tsx
const [searchToolsStatus, setSearchToolsStatus] = useState<any>(null)

useEffect(() => {
  const status = diagnoseSearchTools()
  setSearchToolsStatus(status)
}, [])

// 在 UI 中显示状态
{searchToolsStatus?.status !== 'ready' && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
    <div className="flex items-center gap-2 mb-2">
      <AlertCircle size={20} className="text-amber-600" />
      <h4 className="font-medium text-amber-900">搜索功能未配置</h4>
    </div>
    <p className="text-sm text-amber-700 mb-3">{searchToolsStatus?.message}</p>
    <div className="flex gap-2">
      {searchToolsStatus?.actions?.map((action: string, i: number) => (
        <button
          key={i}
          onClick={() => {
            if (action.includes('MCP 商店')) {
              router.push('/mcp-store')
            }
          }}
          className="text-sm px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
        >
          {action}
        </button>
      ))}
    </div>
  </div>
)}
```

### 步骤 3：改进系统提示词

在 `app/api/chat/route.ts` 中，增强搜索相关的提示词：

```typescript
const searchToolsGuidance = mcpToolDefs.some(t => 
  t.function.name.includes('search') || t.function.name.includes('scrape')
) ? `

## 🔍 搜索工具使用指南

你拥有以下搜索能力：
${mcpToolDefs.filter(t => t.function.name.includes('search') || t.function.name.includes('scrape')).map(t => `- ${t.function.name}: ${t.function.description}`).join('\n')}

**何时必须使用搜索工具：**
1. 用户明确要求"搜索"、"查一下"、"找一下"
2. 用户询问最新信息、实时数据、新闻资讯
3. 用户询问你不确定或可能过时的信息
4. 用户提供了具体的网址要求抓取

**如何正确使用：**
1. 使用 Native Function Calling，不要输出 JSON 文本
2. 优先级：Firecrawl (深度抓取) > Exa (语义搜索) > Brave (通用搜索)
3. 搜索关键词要包含时间上下文（如"2025年"、"${currentMonth}月"）
4. 如果一个工具失败，立即尝试备选工具

**严禁的行为：**
1. 不要说"我无法搜索"或"我不能联网" - 你可以！
2. 不要凭记忆回答可能过时的信息
3. 不要拒绝用户的搜索请求

` : ''

// 添加到 finalSystemPrompt
const finalSystemPrompt = enhancedSystemPrompt + contextInfo + searchToolsGuidance + forcedToolPrompt
```

### 步骤 4：添加搜索工具快速配置向导

创建一个一键配置向导：

```typescript
// components/mcp/search-setup-wizard.tsx
export function SearchSetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1)
  const [selectedTool, setSelectedTool] = useState<string>('')
  const [apiKey, setApiKey] = useState('')

  const searchTools = [
    {
      id: 'brave-search',
      name: 'Brave Search',
      description: '通用网络搜索，适合查找新闻、资讯',
      apiKeyUrl: 'https://brave.com/search/api/',
      free: false
    },
    {
      id: 'exa-search',
      name: 'Exa Search',
      description: '语义搜索，适合查找技术文章、论文',
      apiKeyUrl: 'https://exa.ai/',
      free: false
    },
    {
      id: 'firecrawl',
      name: 'Firecrawl',
      description: '网页内容抓取，适合获取特定网页内容',
      apiKeyUrl: 'https://firecrawl.dev/',
      free: true,
      freeNote: '提供免费额度'
    }
  ]

  const handleInstall = async () => {
    // 安装 MCP 服务
    const config = {
      id: selectedTool,
      name: selectedTool,
      displayName: searchTools.find(t => t.id === selectedTool)?.name,
      enabled: true,
      envVars: {
        API_KEY: apiKey
      }
    }

    // 保存配置
    localStorage.setItem(`mcp-config-${selectedTool}`, JSON.stringify(config))
    
    // 更新已安装列表
    const installedStr = localStorage.getItem('mcp-installed-servers') || '[]'
    const installed = JSON.parse(installedStr)
    if (!installed.includes(selectedTool)) {
      installed.push(selectedTool)
      localStorage.setItem('mcp-installed-servers', JSON.stringify(installed))
    }

    onComplete()
  }

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>配置搜索功能</DialogTitle>
          <DialogDescription>
            选择一个搜索服务并配置 API Key，即可启用 AI 联网搜索能力
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-medium">选择搜索服务</h3>
            <div className="grid gap-3">
              {searchTools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setSelectedTool(tool.id)
                    setStep(2)
                  }}
                  className="text-left p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{tool.name}</h4>
                      <p className="text-sm text-zinc-600 mt-1">{tool.description}</p>
                    </div>
                    {tool.free && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        {tool.freeNote}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <button
              onClick={() => setStep(1)}
              className="text-sm text-zinc-600 hover:text-zinc-900"
            >
              ← 返回选择
            </button>
            
            <div>
              <h3 className="font-medium mb-2">
                配置 {searchTools.find(t => t.id === selectedTool)?.name}
              </h3>
              <p className="text-sm text-zinc-600 mb-4">
                请访问{' '}
                <a
                  href={searchTools.find(t => t.id === selectedTool)?.apiKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  官方网站
                </a>
                {' '}获取 API Key
              </p>

              <label className="block text-sm font-medium mb-2">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="粘贴你的 API Key"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-zinc-600 hover:text-zinc-900"
              >
                取消
              </button>
              <button
                onClick={handleInstall}
                disabled={!apiKey}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                完成配置
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

### 步骤 5：测试搜索功能

创建一个测试页面：

```typescript
// app/test-search/page.tsx
'use client'

import { useState } from 'react'

export default function TestSearchPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testSearch = async (tool: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: '搜索：2025年草莓种植技术' }
          ],
          model: 'qwen-plus',
          enableSearch: true,
          mcpConfigs: [
            {
              id: tool,
              name: tool,
              enabled: true,
              apiKey: localStorage.getItem(`mcp-${tool}-key`)
            }
          ]
        })
      })

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let text = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value)
      }

      setResult({ success: true, data: text })
    } catch (e: any) {
      setResult({ success: false, error: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">搜索功能测试</h1>
      
      <div className="space-y-4">
        <button
          onClick={() => testSearch('brave-search')}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          测试 Brave Search
        </button>

        <button
          onClick={() => testSearch('exa-search')}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded"
        >
          测试 Exa Search
        </button>

        <button
          onClick={() => testSearch('firecrawl')}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          测试 Firecrawl
        </button>
      </div>

      {result && (
        <div className="mt-8 p-4 border rounded">
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
```

## 用户操作指南

### 如何启用搜索功能

1. **打开 MCP 商店**
   - 点击侧边栏的"MCP 商店"
   - 或访问 `/mcp-store`

2. **安装搜索服务**
   - 选择 Brave Search、Exa Search 或 Firecrawl
   - 点击"安装"按钮

3. **配置 API Key**
   - 访问服务提供商网站注册账号
   - 获取 API Key
   - 在 MCP 设置中粘贴 API Key

4. **测试搜索**
   - 在 AI 助手中输入："搜索 2025年草莓种植技术"
   - 观察是否显示"正在使用工具: mcp_brave_search..."
   - 检查是否返回搜索结果

### 推荐配置

**免费用户**：
- 安装 Firecrawl（提供免费额度）
- 用于抓取特定网页内容

**付费用户**：
- Brave Search：通用搜索，价格实惠
- Exa Search：语义搜索，适合技术内容
- Firecrawl：网页抓取，功能强大

## 常见问题解决

### Q1: AI 说"我无法搜索"
**原因**：MCP 服务未启用或 API Key 未配置
**解决**：
1. 检查 MCP 商店中是否已安装搜索服务
2. 检查 API Key 是否正确配置
3. 刷新页面重试

### Q2: 搜索返回 500 错误
**原因**：API Key 无效或配额用完
**解决**：
1. 检查 API Key 是否正确
2. 登录服务提供商网站检查配额
3. 尝试使用其他搜索服务

### Q3: 搜索结果为空
**原因**：搜索关键词不当或网络问题
**解决**：
1. 使用更具体的搜索关键词
2. 检查网络连接
3. 尝试不同的搜索服务

### Q4: 前端显示"正在搜索"但没有结果
**原因**：这是模拟数据，不是真实搜索
**解决**：
1. 检查浏览器控制台是否有 `[MCP]` 日志
2. 检查 Network 标签中的 `/api/chat` 请求
3. 确认 `tool_calls` 是否被正确发送

## 总结

搜索功能的核心问题是：
1. **配置缺失**：用户没有安装和配置 MCP 搜索服务
2. **提示词不够强制**：AI 不知道何时应该使用搜索工具
3. **前端反馈不准确**：显示的是模拟数据而非真实状态

通过上述修复方案，可以：
1. 引导用户正确配置搜索服务
2. 强化 AI 使用搜索工具的意识
3. 提供准确的搜索状态反馈
4. 改善整体用户体验
