# AI 助手搜索功能使用指南

## 问题：为什么 AI 显示"正在搜索"但没有实际搜索？

你看到的"正在搜索"可能是系统的模拟显示，而不是真实的搜索操作。要启用真正的联网搜索功能，需要配置 MCP 搜索服务。

## 快速诊断

### 方法 1：使用诊断脚本

1. 按 `F12` 打开浏览器开发者工具
2. 切换到 `Console` 标签
3. 复制并粘贴以下代码，然后按回车：

```javascript
// 复制 scripts/diagnose-search.js 的内容到这里
```

### 方法 2：手动检查

1. 打开浏览器开发者工具 (F12)
2. 切换到 `Application` 标签
3. 在左侧找到 `Local Storage`
4. 查看 `mcp-installed-servers` 项
5. 检查是否包含 `brave-search`、`exa-search` 或 `firecrawl`

## 配置搜索功能

### 步骤 1：选择搜索服务

推荐以下服务（按优先级排序）：

#### 🆓 Firecrawl（推荐新手）
- **优点**：提供免费额度，适合测试
- **功能**：网页内容抓取
- **适用场景**：获取特定网页内容
- **注册地址**：https://firecrawl.dev/

#### 🔍 Brave Search
- **优点**：价格实惠，搜索质量高
- **功能**：通用网络搜索
- **适用场景**：查找新闻、资讯、一般信息
- **注册地址**：https://brave.com/search/api/

#### 🧠 Exa Search
- **优点**：语义理解能力强
- **功能**：深度语义搜索
- **适用场景**：查找技术文章、学术论文
- **注册地址**：https://exa.ai/

### 步骤 2：获取 API Key

以 Firecrawl 为例：

1. 访问 https://firecrawl.dev/
2. 点击 "Sign Up" 注册账号
3. 登录后进入 Dashboard
4. 找到 "API Keys" 部分
5. 点击 "Create New Key"
6. 复制生成的 API Key（格式类似：`fc-xxx...`）

### 步骤 3：在系统中配置

#### 方法 A：通过 MCP 商店（推荐）

1. 在 AI 助手页面，点击左侧边栏的 "MCP 商店"
2. 找到你想安装的搜索服务（如 Firecrawl）
3. 点击 "安装" 按钮
4. 在弹出的配置窗口中：
   - 粘贴你的 API Key
   - 点击 "保存"
5. 确认服务状态显示为 "已启用"

#### 方法 B：手动配置（高级）

1. 打开浏览器开发者工具 (F12)
2. 切换到 `Console` 标签
3. 运行以下代码（替换 `YOUR_API_KEY`）：

```javascript
// 配置 Firecrawl
const config = {
  id: 'firecrawl',
  name: 'firecrawl',
  displayName: 'Firecrawl',
  description: '网页内容抓取',
  enabled: true,
  envVars: {
    FIRECRAWL_API_KEY: 'YOUR_API_KEY'  // 替换为你的 API Key
  }
}

// 保存配置
localStorage.setItem('mcp-config-firecrawl', JSON.stringify(config))

// 更新已安装列表
const installed = JSON.parse(localStorage.getItem('mcp-installed-servers') || '[]')
if (!installed.includes('firecrawl')) {
  installed.push('firecrawl')
  localStorage.setItem('mcp-installed-servers', JSON.stringify(installed))
}

console.log('✅ Firecrawl 配置完成！请刷新页面。')
```

4. 刷新页面

### 步骤 4：测试搜索功能

配置完成后，在 AI 助手中测试：

#### 测试命令 1：基本搜索
```
搜索 2025年草莓种植技术
```

**预期结果**：
- 显示 "正在使用工具: mcp_firecrawl_scrape..." 或类似提示
- 工作室侧边栏自动打开
- 显示搜索结果或网页内容

#### 测试命令 2：网页抓取
```
帮我抓取 https://www.example.com 的内容
```

**预期结果**：
- 显示浏览器动画
- 返回网页的文本内容

#### 测试命令 3：自动搜索
```
3月份草莓大棚应该如何管理？
```

**预期结果**：
- AI 自动识别需要搜索
- 调用搜索工具获取最新信息
- 基于搜索结果给出建议

## 常见问题

### Q1: 配置后仍然显示"我无法搜索"

**可能原因**：
1. 页面未刷新
2. API Key 配置错误
3. 服务未启用

**解决方法**：
1. 刷新页面（Ctrl+R 或 F5）
2. 检查 API Key 是否正确（没有多余空格）
3. 运行诊断脚本检查配置

### Q2: 搜索返回 500 错误

**可能原因**：
1. API Key 无效
2. API 配额用完
3. 网络连接问题

**解决方法**：
1. 登录服务提供商网站检查 API Key 状态
2. 查看配额使用情况
3. 尝试使用其他搜索服务

### Q3: 搜索结果为空

**可能原因**：
1. 搜索关键词不当
2. 目标网页无法访问
3. 服务暂时不可用

**解决方法**：
1. 使用更具体的搜索关键词
2. 尝试搜索其他内容
3. 稍后重试

### Q4: 如何查看搜索日志？

1. 打开浏览器开发者工具 (F12)
2. 切换到 `Console` 标签
3. 在过滤框中输入 `[MCP]`
4. 查看工具调用日志

### Q5: 如何切换搜索服务？

你可以同时安装多个搜索服务，AI 会根据场景自动选择：
- **Firecrawl**：优先用于网页抓取
- **Exa**：优先用于技术内容搜索
- **Brave**：用于通用搜索

如果想禁用某个服务：
1. 进入 MCP 设置
2. 找到对应服务
3. 点击 "禁用" 按钮

## 高级技巧

### 技巧 1：强制使用特定工具

使用 `@` 符号指定工具：

```
@mcp_firecrawl_scrape 抓取 https://example.com
```

```
@mcp_brave_search 搜索最新农业新闻
```

### 技巧 2：优化搜索关键词

包含时间上下文：
```
搜索 2025年3月 草莓种植技术
```

使用具体的问题：
```
查一下草莓白粉病的防治方法
```

### 技巧 3：查看工具执行结果

1. 点击右侧的 "工作室" 按钮
2. 查看工具调用历史
3. 查看详细的搜索结果

### 技巧 4：批量配置多个服务

```javascript
// 批量配置脚本
const services = [
  {
    id: 'brave-search',
    apiKey: 'YOUR_BRAVE_API_KEY'
  },
  {
    id: 'exa-search',
    apiKey: 'YOUR_EXA_API_KEY'
  },
  {
    id: 'firecrawl',
    apiKey: 'YOUR_FIRECRAWL_API_KEY'
  }
]

services.forEach(service => {
  const config = {
    id: service.id,
    name: service.id,
    displayName: service.id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    enabled: true,
    envVars: {
      API_KEY: service.apiKey
    }
  }
  
  localStorage.setItem(`mcp-config-${service.id}`, JSON.stringify(config))
})

const installed = JSON.parse(localStorage.getItem('mcp-installed-servers') || '[]')
services.forEach(s => {
  if (!installed.includes(s.id)) {
    installed.push(s.id)
  }
})
localStorage.setItem('mcp-installed-servers', JSON.stringify(installed))

console.log('✅ 所有服务配置完成！请刷新页面。')
```

## 费用说明

### Firecrawl
- **免费额度**：500 次/月
- **付费计划**：$29/月起
- **适合**：个人用户、测试

### Brave Search
- **免费额度**：无
- **付费计划**：$5/月起（1000次）
- **适合**：中度使用

### Exa Search
- **免费额度**：1000 次/月
- **付费计划**：$20/月起
- **适合**：技术研究

## 获取帮助

如果以上方法都无法解决问题：

1. **查看完整日志**：
   - 打开开发者工具
   - 导出 Console 日志
   - 查找错误信息

2. **检查网络请求**：
   - 切换到 Network 标签
   - 筛选 `/api/chat` 请求
   - 查看请求和响应内容

3. **联系支持**：
   - 提供诊断脚本的输出
   - 提供错误截图
   - 说明具体的使用场景

## 总结

搜索功能需要：
1. ✅ 安装 MCP 搜索服务
2. ✅ 配置有效的 API Key
3. ✅ 启用服务
4. ✅ 刷新页面

完成以上步骤后，AI 就能真正地联网搜索了！
