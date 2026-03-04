# DashScope 集成测试

## 已完成的更新

### 1. API 路由 (`app/api/chat/route.ts`)
✅ 添加了 DashScope API 支持
✅ 自动检测 API 类型（基于 URL 或模型名称）
✅ DashScope SSE 格式转换为 OpenAI 兼容格式
✅ 支持流式响应

### 2. 设置对话框 (`components/ai-settings-dialog.tsx`)
✅ 添加 API 类型选择器（DashScope / OpenAI）
✅ 自动填充对应的默认配置
✅ 自动检测已保存的 API 类型
✅ 更新占位符和说明文本

### 3. 设置 API (`app/api/settings/route.ts`)
✅ 默认配置改为 DashScope
✅ 支持已登录和未登录用户

## 测试步骤

### 1. 打开应用
访问 http://localhost:3000/dashboard

### 2. 配置 DashScope API
1. 点击右上角设置图标
2. 确认"阿里云 DashScope"按钮已选中
3. 输入你的 DashScope API Key
4. 确认配置：
   - API URL: `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`
   - 模型: `qwen-turbo`
5. 点击"保存设置"

### 3. 测试聊天功能
1. 在 AI 助手输入框输入测试消息，例如："你好"
2. 观察响应是否正常
3. 检查是否支持流式输出

### 4. 测试 OpenAI 模式（可选）
1. 重新打开设置
2. 点击"OpenAI"按钮
3. 输入 OpenAI API Key
4. 测试聊天功能

## 预期结果

### DashScope 模式
- ✅ 请求发送到 `dashscope.aliyuncs.com`
- ✅ 使用 `qwen-turbo` 或其他通义千问模型
- ✅ 流式响应正常显示
- ✅ 支持中文对话

### OpenAI 模式
- ✅ 请求发送到 `api.openai.com`
- ✅ 使用 GPT 模型
- ✅ 流式响应正常显示

## API 格式对比

### DashScope 请求格式
```json
{
  "model": "qwen-turbo",
  "input": {
    "messages": [
      { "role": "system", "content": "..." },
      { "role": "user", "content": "你好" }
    ]
  },
  "parameters": {
    "result_format": "message",
    "incremental_output": true
  }
}
```

### OpenAI 请求格式
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "Hello" }
  ],
  "stream": true,
  "temperature": 0.7
}
```

## 故障排查

### 问题：POST /api/chat 返回 404
**解决方案**：重启开发服务器
```bash
# 使用提供的脚本
.\restart-dev.ps1

# 或手动重启
# 1. Ctrl+C 停止服务器
# 2. 删除 .next 目录
# 3. npm run dev
```

### 问题：POST /api/chat 返回 400
**原因**：未配置 API Key
**解决方案**：在设置中输入有效的 API Key

### 问题：POST /api/chat 返回 401
**原因**：API Key 无效或已过期
**解决方案**：
1. 检查 API Key 是否正确
2. 确认 API Key 已激活
3. 检查账户余额

### 问题：连接超时
**原因**：网络问题或 API 服务不可用
**解决方案**：
1. 检查网络连接
2. 尝试使用 VPN（如果使用 OpenAI）
3. 切换到 DashScope（国内用户）

## 开发服务器状态

当前服务器运行正常：
- ✅ GET /api/settings - 200
- ✅ POST /api/settings - 200
- ✅ GET /api/chat - 200
- ⚠️ POST /api/chat - 需要有效的 API Key

## 下一步

1. 使用真实的 DashScope API Key 测试完整流程
2. 验证流式响应是否正常
3. 测试不同的模型（qwen-turbo, qwen-plus, qwen-max）
4. 测试错误处理和边界情况

## 联网搜索测试（OpenAI 兼容模式）

### 配置
1. 打开设置对话框
2. 将 API URL 设置为：https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
3. 模型设置为：`qwen3-max`
4. 保存设置

### 测试步骤
1. 在 AI 助手输入：`杭州明天天气如何`
2. 预期行为：
   - 响应基于联网检索结果生成
   - 正文包含如 `[1]` 的内联引用标注
   - 消息底部“参考来源”中展示来源列表（标题、链接、摘要、引用片段）

### 验证点
- 请求体包含 `enable_search: true` 与 `search_strategy: "agent"`
- 界面中可展开“参考来源”查看详情
