# MCP 快速参考卡片

## 🚀 快速开始

### 安装预设服务器
1. 打开 AI 助手 → 点击 "MCP 商店"
2. 浏览服务器 → 点击 "安装"
3. 如需 API Key，按提示获取并填写
4. 完成！开始使用

### 添加自定义服务器
1. MCP 商店 → 点击 "自定义"
2. 填写服务器信息
3. 配置命令和参数
4. 保存并安装

## 📦 服务器分类速查

| 分类 | 服务器 | 用途 |
|------|--------|------|
| 🌐 网络 | Firecrawl, Brave Search, Puppeteer | 网页抓取、搜索、自动化 |
| 💻 开发 | GitHub, E2B | 代码管理、沙箱执行 |
| 🗄️ 数据库 | PostgreSQL, MongoDB, Redis, Qdrant, Airtable | 数据存储和查询 |
| 📝 生产力 | Notion, Linear, Slack, Google Drive, Jira, Confluence | 协作和管理 |
| 🧪 测试 | Playwright | 浏览器测试 |
| 🚀 部署 | Vercel | 应用部署 |
| 🤖 AI增强 | Sequential Thinking, Memory Bank | 思维和记忆 |
| 📊 监控 | Sentry | 错误追踪 |
| 💰 商业 | Stripe | 支付处理 |

## 🔑 常用 API Key 获取

| 服务 | 获取地址 | 说明 |
|------|----------|------|
| Firecrawl | https://firecrawl.dev | 注册后在控制台获取 |
| Brave Search | https://brave.com/search/api/ | 申请免费 API Key |
| GitHub | https://github.com/settings/tokens | 创建 Personal Access Token |
| E2B | https://e2b.dev | 注册后获取 API Key |
| Notion | https://www.notion.so/my-integrations | 创建 Integration |
| Linear | https://linear.app/settings/api | 创建 API Key |
| Slack | https://api.slack.com/apps | 创建 App 获取 Bot Token |
| Google Drive | https://console.cloud.google.com | 创建 OAuth 客户端 |
| Jira/Confluence | https://id.atlassian.com/manage-profile/security/api-tokens | 创建 API Token |
| Vercel | https://vercel.com/account/tokens | 创建 Token |
| Sentry | https://sentry.io/settings/account/api/auth-tokens/ | 创建 Auth Token |
| Stripe | https://dashboard.stripe.com/apikeys | 获取 Secret Key |
| Qdrant | https://cloud.qdrant.io | 创建集群获取 Key |
| Airtable | https://airtable.com/create/tokens | 创建 Personal Access Token |

## 💡 使用技巧

### 推荐安装顺序
1. ✅ **Playwright** - 无需 API Key，快速体验
2. ✅ **Brave Search** - 免费 API Key，增强搜索
3. ✅ **GitHub** - 如果你是开发者
4. ✅ **Sequential Thinking** - 提升 AI 思考能力
5. ✅ 根据需求选择其他服务器

### 常用命令格式
```bash
# npm 包
npx -y @org/package-name

# Python 包
uvx package-name

# 本地脚本
node /path/to/script.js
python /path/to/script.py
```

### 环境变量命名规范
```
API_KEY          # API 密钥
DATABASE_URL     # 数据库连接
HOST             # 主机地址
PORT             # 端口号
TOKEN            # 访问令牌
SECRET           # 密钥
```

## 🔧 故障排除

### 问题：安装失败
```bash
# 检查命令是否正确
npx -y @package/name

# 检查网络连接
ping npmjs.com

# 清除缓存
npm cache clean --force
```

### 问题：服务器不工作
1. ✅ 检查是否已启用（MCP 设置）
2. ✅ 检查 API Key 是否正确
3. ✅ 查看浏览器控制台错误
4. ✅ 重新安装服务器

### 问题：找不到功能
1. ✅ 确认对应服务器已安装
2. ✅ 确认服务器已启用
3. ✅ 尝试更明确的指令

## 📚 文档链接

- [完整使用指南](./mcp-guide.md)
- [快速开始](./mcp-quick-start.md)
- [自定义服务器教程](./mcp-custom-guide.md)
- [演示脚本](./mcp-demo-script.md)

## 🎯 使用示例

### 网络搜索
```
你：搜索最新的 AI 新闻
AI：[使用 Brave Search]
```

### 代码管理
```
你：在 GitHub 创建一个 Issue
AI：[使用 GitHub MCP]
```

### 网页抓取
```
你：抓取这个网页的内容
AI：[使用 Firecrawl]
```

### 数据查询
```
你：查询数据库中的用户数量
AI：[使用 PostgreSQL MCP]
```

### 浏览器自动化
```
你：打开网站并截图
AI：[使用 Playwright]
```

### 代码执行
```
你：运行这段 Python 代码
AI：[使用 E2B Sandbox]
```

### 文档管理
```
你：在 Notion 创建一个页面
AI：[使用 Notion MCP]
```

### 项目管理
```
你：查看我的 Linear 任务
AI：[使用 Linear MCP]
```

## 🌟 高级功能

### 多服务器协同
```
你：搜索资料，总结后保存到 Notion
AI：[Brave Search → 分析 → Notion]
```

### 自动化工作流
```
你：从网页抓取数据，存入数据库，发送通知
AI：[Firecrawl → PostgreSQL → Slack]
```

### 开发流程
```
你：创建仓库，生成代码，测试，部署
AI：[GitHub → E2B → Playwright → Vercel]
```

## 📞 获取帮助

- 💬 查看文档
- 🐛 报告问题
- 💡 提出建议
- 🤝 社区讨论

---

**提示**：将此页面加入书签，随时查阅！
