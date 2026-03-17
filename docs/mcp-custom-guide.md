# 自定义 MCP 服务器完整指南

## 目录
1. [什么是自定义 MCP 服务器](#什么是自定义-mcp-服务器)
2. [如何添加自定义服务器](#如何添加自定义服务器)
3. [配置参数详解](#配置参数详解)
4. [实战示例](#实战示例)
5. [常见问题](#常见问题)
6. [高级技巧](#高级技巧)

## 什么是自定义 MCP 服务器

自定义 MCP 服务器允许你添加任何符合 [Model Context Protocol](https://modelcontextprotocol.io) 标准的服务器到你的 AI 助手中。这意味着你可以：

- 使用社区开发的 MCP 服务器
- 集成公司内部的私有服务
- 开发并测试自己的 MCP 服务器
- 连接任何支持 MCP 协议的工具

## 如何添加自定义服务器

### 方法 1：通过 UI 界面（推荐）

1. **打开 MCP 商店**
   - 在 AI 助手页面，点击侧边栏的 "MCP 商店"

2. **点击"自定义"按钮**
   - 在页面右上角找到 "自定义" 按钮
   - 点击打开自定义服务器配置对话框

3. **填写基本信息**
   ```
   服务器名称*: my-custom-server
   显示名称*: My Custom Server
   描述*: 这是我的自定义 MCP 服务器
   分类: 选择合适的分类
   提供商: My Company
   ```

4. **配置安装命令**
   ```
   命令: npx (或 node, python, uvx)
   参数: -y @my-org/my-mcp-server
   ```

5. **添加功能特性**（可选）
   - 点击输入框，输入功能描述
   - 按 Enter 或点击 + 按钮添加
   - 例如：数据查询、文件操作、API 调用

6. **配置环境变量**（可选）
   - 如果服务器需要 API Key 或其他配置
   - 输入变量名和默认值
   - 例如：API_KEY, DATABASE_URL

7. **保存并安装**
   - 点击"保存并安装"按钮
   - 系统会自动安装并配置服务器

### 方法 2：手动配置（高级）

如果你熟悉 MCP 配置，也可以直接编辑配置文件：

1. 打开浏览器开发者工具（F12）
2. 在 Console 中执行：
```javascript
// 获取当前配置
const config = JSON.parse(localStorage.getItem('mcp-custom-servers') || '[]')

// 添加新服务器
config.push({
  id: "my-server",
  name: "my-server",
  displayName: "My Server",
  description: "My custom MCP server",
  category: "development",
  icon: "https://example.com/icon.png",
  iconBg: "bg-blue-500",
  provider: "Custom",
  requiresApiKey: true,
  command: "npx",
  args: ["-y", "@my-org/my-server"],
  envVars: { "API_KEY": "" },
  features: ["Feature 1", "Feature 2"],
  popularity: 50,
  official: false
})

// 保存配置
localStorage.setItem('mcp-custom-servers', JSON.stringify(config))

// 刷新页面
location.reload()
```

## 配置参数详解

### 必填参数

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `name` | string | 服务器标识符，用于配置文件 | `"my-custom-server"` |
| `displayName` | string | 显示名称，用户看到的名字 | `"My Custom Server"` |
| `description` | string | 服务器功能描述 | `"连接到我的自定义服务"` |

### 可选参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `id` | string | 自动生成 | 唯一标识符 |
| `category` | string | `"development"` | 分类（web, development, database 等） |
| `icon` | string | 占位图 | 图标 URL |
| `iconBg` | string | `"bg-blue-500"` | 图标背景色 |
| `provider` | string | `"Custom"` | 提供商名称 |
| `command` | string | `"npx"` | 执行命令 |
| `args` | string[] | `[]` | 命令参数 |
| `envVars` | object | `{}` | 环境变量 |
| `features` | string[] | `[]` | 功能列表 |

### 分类选项

- `web` - 网络工具
- `development` - 开发工具
- `database` - 数据库
- `productivity` - 生产力
- `communication` - 通讯
- `testing` - 测试
- `deployment` - 部署
- `ai-enhancement` - AI 增强
- `monitoring` - 监控
- `business` - 商业

### 命令选项

- `npx` - Node.js 包执行器（最常用）
- `node` - Node.js 直接执行
- `python` - Python 脚本
- `uvx` - Python UV 包执行器

## 实战示例

### 示例 1：添加天气 MCP 服务器

假设你找到了一个社区开发的天气 MCP 服务器：

```
服务器名称: weather-mcp
显示名称: Weather MCP
描述: 获取全球天气信息和预报
分类: web
提供商: Community
命令: npx
参数: -y weather-mcp-server
功能: 
  - 当前天气查询
  - 7天天气预报
  - 历史天气数据
环境变量:
  WEATHER_API_KEY: (从 weatherapi.com 获取)
```

**配置步骤：**
1. 访问 https://weatherapi.com 注册并获取 API Key
2. 在 MCP 商店点击"自定义"
3. 填写上述信息
4. 在环境变量中填入你的 API Key
5. 保存并安装

**使用示例：**
```
你：今天北京的天气怎么样？
AI：[调用 Weather MCP]
北京今天多云，温度 15-25°C，湿度 60%...
```

### 示例 2：添加内部数据库 MCP

为公司内部 MySQL 数据库创建 MCP 服务器：

```
服务器名称: company-mysql
显示名称: Company MySQL
描述: 连接公司内部 MySQL 数据库
分类: database
提供商: Internal
命令: npx
参数: -y @company/mysql-mcp-server
功能:
  - 数据查询
  - 报表生成
  - 数据分析
环境变量:
  MYSQL_HOST: db.company.internal
  MYSQL_PORT: 3306
  MYSQL_USER: readonly_user
  MYSQL_PASSWORD: (你的密码)
  MYSQL_DATABASE: analytics
```

### 示例 3：添加 Telegram Bot MCP

连接 Telegram Bot 发送通知：

```
服务器名称: telegram-bot
显示名称: Telegram Bot
描述: 通过 Telegram Bot 发送消息和通知
分类: communication
提供商: Community
命令: npx
参数: -y telegram-mcp-server
功能:
  - 发送消息
  - 发送图片
  - 创建投票
  - 管理群组
环境变量:
  TELEGRAM_BOT_TOKEN: (从 @BotFather 获取)
  TELEGRAM_CHAT_ID: (你的 Chat ID)
```

### 示例 4：添加 Docker MCP

管理 Docker 容器：

```
服务器名称: docker-mcp
显示名称: Docker Manager
描述: 管理 Docker 容器、镜像和网络
分类: deployment
提供商: Community
命令: npx
参数: -y docker-mcp-server
功能:
  - 容器管理
  - 镜像操作
  - 日志查看
  - 资源监控
环境变量:
  DOCKER_HOST: unix:///var/run/docker.sock
```

### 示例 5：添加自己开发的 MCP

如果你开发了自己的 MCP 服务器：

```javascript
// 1. 发布到 npm
npm publish @myusername/my-mcp-server

// 2. 在 MCP 商店添加
服务器名称: my-mcp-server
显示名称: My MCP Server
描述: 我开发的自定义 MCP 服务器
分类: development
提供商: Me
命令: npx
参数: -y @myusername/my-mcp-server
```

## 常见问题

### Q1: 如何找到更多 MCP 服务器？

**答：** 可以从以下渠道查找：

1. **官方仓库**
   - https://github.com/modelcontextprotocol/servers
   - 包含 Anthropic 官方维护的服务器

2. **社区列表**
   - https://github.com/punkpeye/awesome-mcp-servers
   - 社区精选的 MCP 服务器列表

3. **MCP 服务器目录**
   - https://glama.ai/mcp/servers
   - https://mcpservers.org
   - https://findmcp.dev
   - 可搜索的 MCP 服务器目录

4. **npm 搜索**
   - 搜索关键词：`mcp-server`, `model-context-protocol`

5. **GitHub 搜索**
   - 搜索：`mcp server` 或 `model context protocol`

### Q2: 自定义服务器安装失败怎么办？

**答：** 检查以下几点：

1. **命令和参数是否正确**
   ```bash
   # 在终端测试命令是否能执行
   npx -y @package/name
   ```

2. **网络连接**
   - 确保能访问 npm registry
   - 如果在国内，可能需要配置镜像

3. **权限问题**
   - 某些命令可能需要管理员权限

4. **包是否存在**
   - 在 https://npmjs.com 搜索包名
   - 确认包名拼写正确

### Q3: 如何更新自定义服务器？

**答：** 两种方法：

1. **重新安装**
   - 卸载旧版本
   - 重新添加（会自动获取最新版本）

2. **手动更新**
   ```bash
   # 在终端执行
   npx -y @package/name@latest
   ```

### Q4: 可以同时使用多个自定义服务器吗？

**答：** 可以！没有数量限制。AI 会根据任务自动选择合适的工具。

### Q5: 自定义服务器的配置会同步吗？

**答：** 目前配置存储在浏览器 LocalStorage 中，不会自动同步。如果需要在多个设备使用：

1. 导出配置（复制 JSON）
2. 在新设备导入配置
3. 或者在每个设备重新添加

### Q6: 如何调试自定义服务器？

**答：** 

1. **查看浏览器控制台**
   - 按 F12 打开开发者工具
   - 查看 Console 标签的错误信息

2. **测试命令**
   ```bash
   # 在终端直接运行命令
   npx -y @package/name
   ```

3. **检查环境变量**
   - 确保所有必需的环境变量都已配置
   - 检查 API Key 是否有效

## 高级技巧

### 技巧 1：使用本地开发的 MCP 服务器

如果你正在开发 MCP 服务器，可以使用本地路径：

```
命令: node
参数: /path/to/your/server/index.js
```

### 技巧 2：批量导入服务器

使用浏览器控制台批量添加：

```javascript
const servers = [
  {
    name: "server1",
    displayName: "Server 1",
    // ... 其他配置
  },
  {
    name: "server2",
    displayName: "Server 2",
    // ... 其他配置
  }
]

const existing = JSON.parse(localStorage.getItem('mcp-custom-servers') || '[]')
localStorage.setItem('mcp-custom-servers', JSON.stringify([...existing, ...servers]))
location.reload()
```

### 技巧 3：创建服务器模板

保存常用配置作为模板：

```javascript
// 保存模板
const template = {
  category: "development",
  iconBg: "bg-blue-500",
  provider: "My Company",
  command: "npx",
  features: ["Feature 1", "Feature 2"],
  popularity: 50,
  official: false
}

localStorage.setItem('mcp-server-template', JSON.stringify(template))

// 使用模板
const template = JSON.parse(localStorage.getItem('mcp-server-template'))
const newServer = {
  ...template,
  name: "new-server",
  displayName: "New Server",
  description: "Description",
  args: ["-y", "@org/new-server"]
}
```

### 技巧 4：环境变量管理

对于敏感信息，建议：

1. 不要在配置中硬编码
2. 使用环境变量占位符
3. 在安装时再填入实际值

```javascript
// 配置时使用占位符
envVars: {
  "API_KEY": "${YOUR_API_KEY}",
  "SECRET": "${YOUR_SECRET}"
}

// 安装时替换
```

### 技巧 5：服务器分组

使用命名约定组织服务器：

```
公司内部: company-mysql, company-api, company-docs
开发工具: dev-docker, dev-git, dev-ci
数据分析: data-postgres, data-redis, data-elastic
```

## 开发自己的 MCP 服务器

如果你想开发自己的 MCP 服务器，参考：

1. **官方文档**
   - https://modelcontextprotocol.io/docs/develop/build-server

2. **示例代码**
   - https://github.com/modelcontextprotocol/servers

3. **SDK**
   - TypeScript: `@modelcontextprotocol/sdk`
   - Python: `mcp`

4. **基本结构**
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "my-mcp-server",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  },
});

// 注册工具
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "my_tool",
      description: "My custom tool",
      inputSchema: {
        type: "object",
        properties: {
          param: { type: "string" }
        }
      }
    }
  ]
}));

// 处理工具调用
server.setRequestHandler("tools/call", async (request) => {
  // 实现工具逻辑
});

// 启动服务器
const transport = new StdioServerTransport();
await server.connect(transport);
```

## 总结

自定义 MCP 服务器功能让你可以：

✅ 使用任何符合 MCP 标准的服务器
✅ 集成公司内部服务
✅ 测试自己开发的服务器
✅ 扩展 AI 助手的能力

记住：
- 从简单的服务器开始
- 仔细阅读服务器文档
- 测试配置是否正确
- 保护好 API Key 等敏感信息

祝你使用愉快！🎉
