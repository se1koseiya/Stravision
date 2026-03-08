# MCP 商店使用指南

## 什么是 MCP？

MCP (Model Context Protocol) 是由 Anthropic 推出的开放标准协议，它让 AI 助手能够连接到真实的工具、数据源和服务。通过 MCP，AI 可以：

- 访问数据库和文件系统
- 调用外部 API 和服务
- 执行代码和自动化任务
- 与第三方平台集成

## 功能特性

### 1. MCP 商店
- **丰富的服务器库**：精选 10+ 个高质量 MCP 服务器
- **分类浏览**：按功能分类（网络工具、开发工具、数据库等）
- **智能搜索**：快速找到需要的服务器
- **一键安装**：简化安装流程，自动配置

### 2. 已集成的 MCP 服务器

#### 网络工具
- **Firecrawl** - 网页抓取和数据提取
  - 网页抓取、网络搜索、站点爬虫
  - 结构化数据提取、自主研究代理
  - 需要 API Key：https://firecrawl.dev

- **Brave Search** - 隐私友好的搜索引擎
  - 网络搜索、新闻搜索
  - 无追踪、无广告偏见
  - 需要 API Key：https://brave.com/search/api/

#### 开发工具
- **GitHub** - 官方 GitHub 集成
  - 仓库管理、Issue 追踪、PR 管理
  - 代码搜索、提交历史
  - 需要 GitHub Token

- **E2B Sandbox** - 安全代码执行环境
  - Python/JavaScript 代码执行
  - Shell 命令、包管理
  - 需要 API Key：https://e2b.dev

#### 数据库
- **PostgreSQL** - 数据库连接
  - SQL 查询、表管理
  - 数据分析、模式查看
  - 需要数据库连接字符串

#### 生产力工具
- **Notion** - Notion 工作区集成
  - 页面管理、数据库操作
  - 内容搜索、协作编辑
  - 需要 Notion Integration Token

- **Linear** - 项目管理
  - Issue 管理、标签管理
  - 优先级设置、Sprint 追踪
  - 需要 Linear API Key

- **Slack** - 团队通讯
  - 消息发送、频道管理
  - 对话历史、文件分享
  - 需要 Slack Bot Token

#### 测试工具
- **Playwright** - 浏览器自动化
  - 浏览器控制、UI 测试
  - 表单填写、截图功能
  - 无需 API Key

#### 部署工具
- **Vercel** - 部署管理
  - 部署管理、环境变量
  - 构建日志、域名配置
  - 需要 Vercel Token

## 使用流程

### 1. 浏览 MCP 商店
1. 在 AI 助手页面，点击侧边栏的 "MCP 商店"
2. 浏览不同分类的 MCP 服务器
3. 使用搜索功能快速查找

### 2. 安装 MCP 服务器
1. 点击服务器卡片上的 "安装" 按钮
2. 如果需要 API Key，会弹出配置对话框
3. 填写必要的配置信息（API Key、连接字符串等）
4. 点击 "安装" 完成

### 3. 配置 API Key

#### Firecrawl
1. 访问 https://firecrawl.dev
2. 注册账号并登录
3. 在控制台获取 API Key
4. 在 MCP 商店安装时填入

#### GitHub
1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 选择所需权限（repo, read:user 等）
4. 生成并复制 token

#### Brave Search
1. 访问 https://brave.com/search/api/
2. 申请免费 API Key
3. 在邮箱中接收 API Key

#### Notion
1. 访问 https://www.notion.so/my-integrations
2. 创建新集成
3. 复制 Internal Integration Token
4. 在 Notion 页面中授权集成访问

#### E2B
1. 访问 https://e2b.dev
2. 注册账号
3. 在控制台获取 API Key

### 4. 管理已安装的服务器
1. 点击用户头像菜单
2. 选择 "MCP 设置"
3. 可以：
   - 启用/禁用服务器
   - 编辑配置
   - 复制配置
   - 卸载服务器

### 5. 在 AI 对话中使用
安装并配置好 MCP 服务器后，AI 助手会自动识别可用的工具。例如：

```
用户：帮我搜索最新的 Next.js 15 文档
AI：[使用 Brave Search MCP 搜索]

用户：在 GitHub 上创建一个新 Issue
AI：[使用 GitHub MCP 创建 Issue]

用户：从这个网页提取数据：https://example.com
AI：[使用 Firecrawl MCP 抓取网页]
```

## 技术架构

### 前端
- **MCP 商店页面** (`/mcp-store`)
  - 服务器浏览和搜索
  - 分类过滤
  - 一键安装

- **MCP 设置页面** (`/mcp-settings`)
  - 已安装服务器管理
  - 配置编辑
  - 启用/禁用控制

### 数据存储
- **LocalStorage**
  - `mcp-installed-servers`: 已安装服务器列表
  - `mcp-config-{serverId}`: 各服务器配置
  - `mcp-enabled-{serverId}`: 启用状态

### API 路由
- `POST /api/mcp/config` - 保存 MCP 配置
- `GET /api/mcp/config` - 获取 MCP 配置
- `DELETE /api/mcp/config` - 删除 MCP 配置

## 安全建议

1. **API Key 管理**
   - 不要在代码中硬编码 API Key
   - 使用环境变量存储敏感信息
   - 定期轮换 API Key

2. **权限控制**
   - 只授予必要的权限
   - 使用专用的 API Key，不要复用生产环境的凭证
   - 定期审查已授权的集成

3. **数据安全**
   - MCP 服务器可以访问敏感数据
   - 仔细审查服务器的权限范围
   - 优先使用官方提供的服务器

## 常见问题

### Q: MCP 服务器安装后不工作？
A: 检查以下几点：
1. API Key 是否正确填写
2. 服务器是否已启用
3. 网络连接是否正常
4. 查看浏览器控制台是否有错误信息

### Q: 如何更新 API Key？
A: 进入 MCP 设置页面，点击 "编辑" 按钮，更新配置后保存。

### Q: 可以同时使用多个 MCP 服务器吗？
A: 可以！AI 助手会根据任务自动选择合适的工具。

### Q: MCP 服务器会收费吗？
A: MCP 协议本身是免费的，但某些服务（如 Firecrawl、E2B）可能需要付费 API Key。大多数服务提供免费额度。

## 未来计划

- [ ] 支持自定义 MCP 服务器
- [ ] MCP 服务器使用统计
- [ ] 更多官方和社区服务器
- [ ] MCP 配置导入/导出
- [ ] 服务器健康检查
- [ ] 使用教程和示例

## 参考资源

- [MCP 官方文档](https://modelcontextprotocol.io)
- [MCP GitHub 仓库](https://github.com/modelcontextprotocol)
- [Awesome MCP Servers](https://github.com/punkpeye/awesome-mcp-servers)
- [MCP 服务器目录](https://glama.ai/mcp/servers)
