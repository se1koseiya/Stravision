# 🔄 重启开发服务器指南

## 问题

代码已更新，但运行的还是旧代码。

## 原因

1. TypeScript 文件需要重新编译
2. Next.js 开发服务器需要重启才能加载新代码

## 解决步骤

### 1. 完全停止服务器

在运行 `npm run dev` 的终端中：

```
按 Ctrl+C（可能需要按两次）
```

确保看到类似这样的输出：
```
^C
Gracefully shutting down. Please wait...
```

### 2. 清理缓存（可选但推荐）

```bash
# 删除 .next 缓存目录
rmdir /s /q .next

# 或者使用 PowerShell
Remove-Item -Recurse -Force .next
```

### 3. 重新启动

```bash
npm run dev
```

### 4. 等待编译完成

看到类似输出：
```
✓ Ready in 3.2s
○ Local:        http://localhost:3000
```

### 5. 测试

打开 http://localhost:3000/ai-assistant

输入：
```
@get_all_spectrum
```

或者：
```
请获取当前光谱数据
```

## 验证日志

正确的日志应该包含：

```
[MCP] Executing Spectrum Tool: get_all_spectrum
[MCP] Args type: object value: {}
[MCP] Connecting to Supergateway: http://8.153.175.190:8000/spectrum-stravision
[MCP] Got endpoint: http://8.153.175.190:8000/spectrum-stravision/messages?sessionId=xxx
[MCP] No arguments (args is object)
[MCP] Request body: {"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_all_spectrum"},"id":1234567890}
[MCP] Sending request to http://8.153.175.190:8000/spectrum-stravision/messages?sessionId=xxx
[MCP] Got response from SSE
```

## 如果还是不行

### 方案 A: 强制重新编译

```bash
# 停止服务器
Ctrl+C

# 删除所有缓存
rmdir /s /q .next
rmdir /s /q node_modules\.cache

# 重新安装依赖（如果需要）
npm install

# 启动
npm run dev
```

### 方案 B: 检查文件是否保存

1. 打开 `lib/mcp/mcp-tool-executor.ts`
2. 查找 `executeSpectrumTool` 函数
3. 确认包含这行代码：
   ```typescript
   console.log(`[MCP] Args type:`, typeof args, 'value:', args)
   ```
4. 如果没有，说明文件没有保存，重新保存

### 方案 C: 手动触发编译

```bash
# 停止服务器
Ctrl+C

# 运行 TypeScript 编译器
npx tsc --noEmit

# 如果有错误，修复它们
# 然后重新启动
npm run dev
```

## 常见问题

### Q: 按 Ctrl+C 后服务器没有停止

A: 再按一次 Ctrl+C，或者关闭终端窗口重新打开

### Q: 删除 .next 目录失败

A: 
```bash
# 使用管理员权限
# 或者手动在文件管理器中删除
```

### Q: 启动后立即报错

A: 检查是否有语法错误：
```bash
npx tsc --noEmit
```

## 快速重启命令（一键执行）

创建一个批处理文件 `restart-dev.bat`：

```batch
@echo off
echo 停止服务器...
taskkill /F /IM node.exe 2>nul

echo 清理缓存...
if exist .next rmdir /s /q .next

echo 启动服务器...
npm run dev
```

然后直接运行：
```bash
restart-dev.bat
```

---

重启后应该就能看到新的日志输出了！
