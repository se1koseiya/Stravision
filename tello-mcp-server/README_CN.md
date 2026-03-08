# Tello 无人机边缘控制节点 (MCP)

本项目提供了一个独立的 Tello 无人机边缘控制节点，旨在作为 AI 助手（如 Trae, Claude Desktop 等）的 Model Context Protocol (MCP) 扩展模块运行。它不仅可以通过 AI 进行自然语言控制，还提供了标准的 RESTful API 和 WebSocket 接口，方便与其他系统集成。

## 主要特性

- **MCP 服务器**: 通过标准输入输出 (Stdio) 暴露 Tello 控制工具和状态资源，实现与 AI 的无缝集成。
- **AB 点自动巡航**: 支持基于 Mission Pad（挑战卡）的自动化巡航任务。设置两个挑战卡（如 1 和 6），无人机将在两点之间自动往返飞行，模拟进行植物/QR 码扫描，并将数据发送给 AI 助手进行分析。
- **RESTful API**: 提供 HTTP 接口，用于直接发送指令和获取无人机状态。
- **WebSocket**: 提供实时状态流和指令通道。
- **高可用性**: 具备自动重连、心跳保活和错误处理机制。
- **日志记录**: 详细的日志记录，便于调试和审计。

## 架构

- **Tello Client**: 处理与无人机的 UDP 通信 (指令端口: 8889, 状态端口: 8890)。
- **MCP Server**: 将 AI 的工具调用转换为无人机指令。
- **API Server**: 为外部系统提供 HTTP/WS 接口 (默认端口: 3001)。
- **Mission Manager**: 负责执行复杂的自动化任务，如挑战卡巡航。

## 快速开始

### 1. 环境准备

- Node.js (v18+)
- 一台 Tello 无人机（通过 WiFi 连接）
- 或者 Tello 仿真环境

### 2. 安装

```bash
cd tello-mcp-server
npm install
```

### 3. 配置

在根目录创建 `.env` 文件（可参考 `.env.example`）：

```env
# Tello 配置
TELLO_IP=192.168.10.1
TELLO_COMMAND_PORT=8889
TELLO_STATE_PORT=8890
TELLO_LOCAL_PORT=8889

# API 服务器配置 (避免与主平台 3000 端口冲突)
API_PORT=3001

# Stravision 平台地址 (用于上传图片分析)
STRAVISION_URL=http://localhost:3000

# 日志
LOG_LEVEL=info
```

### 4. 运行

**开发模式**:
```bash
npm run dev
```

**生产模式**:
```bash
npm run build
npm start
```

## 功能使用说明

### AI 助手集成 (MCP)

在您的 AI 助手配置中添加以下 MCP 服务器设置：

```json
{
  "mcpServers": {
    "tello": {
      "command": "node",
      "args": ["/path/to/tello-mcp-server/dist/index.js"],
      "env": {
        "TELLO_IP": "192.168.10.1"
      }
    }
  }
}
```

连接后，您可以直接对 AI 说：
- "起飞"
- "向左移动 50 厘米"
- "开始在挑战卡 1 和 6 之间巡航，循环 3 次"

### AB 点巡航功能

该功能专为大棚植物巡检设计。

1.  **准备工作**: 将 Tello 挑战卡（Mission Pad）放置在植物旁边。例如，卡片 1 放在起点，卡片 6 放在终点。
2.  **启动任务**:
    - **通过 AI**: "开始巡航任务，起点 1，终点 6，循环 2 次。"
    - **通过 API**: 调用 `start_cruise_mission` 工具。
3.  **执行流程**:
    - 无人机起飞。
    - 飞往挑战卡 1 -> 悬停 -> (模拟) 拍照并发送给 AI 分析。
    - 飞往挑战卡 6 -> 悬停 -> (模拟) 拍照并发送给 AI 分析。
    - 重复指定次数。
    - 任务结束，自动降落。

### API 文档

详细 API 文档请参考 [docs/API.md](docs/API.md)。

- **获取状态**: `GET http://localhost:3001/api/state`
- **发送指令**: `POST http://localhost:3001/api/command`

## 注意事项

- 请确保电脑已连接 Tello 的 WiFi。
- 巡航功能依赖 Tello 的下视摄像头识别挑战卡，请确保光线充足且地面纹理清晰。
- 默认 API 端口为 3001，主平台端口为 3000，请确保端口未被占用。

## 许可证

MIT
