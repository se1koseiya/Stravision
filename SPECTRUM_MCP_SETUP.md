# 光谱 MCP 服务器配置完成

## ✅ 已完成的工作

### 1. 工具定义注册

在 `lib/mcp/mcp-tool-definitions.ts` 中已注册光谱传感器工具：

- ✅ `get_channel`: 获取指定通道的光谱值
- ✅ `get_all_spectrum`: 获取所有 18 通道光谱数据

### 2. 工具执行器实现

在 `lib/mcp/mcp-tool-executor.ts` 中已实现：

- ✅ SSE 握手逻辑（自动获取会话端点）
- ✅ JSON-RPC 调用封装
- ✅ 错误处理和超时控制
- ✅ 自动端点推断（支持多种 URL 格式）

### 3. 端点配置

默认端点已设置为：`http://8.153.175.190:8000`

支持通过环境变量自定义：
- `SPECTRUM_API_URL`: 自定义服务器地址

### 4. 文档

- ✅ 部署指南：`mcpserver_spectrum/deploy-guide.md`
- ✅ 集成文档：`docs/spectrum-mcp-integration.md`

## 🚀 下一步操作

### 必须完成（上云部署）

1. **上传代码到服务器**
   ```bash
   cd D:\stravision\Stravision-IOT-PlatForm\mcpserver_spectrum
   tar -czf mcpserver_spectrum.tar.gz .
   scp mcpserver_spectrum.tar.gz root@8.153.175.190:/opt/
   ```

2. **在服务器上部署**
   ```bash
   ssh root@8.153.175.190
   cd /opt
   tar -xzf mcpserver_spectrum.tar.gz -C mcpserver_spectrum
   cd mcpserver_spectrum
   
   # 安装 uv
   curl -LsSf https://astral.sh/uv/install.sh | sh
   
   # 安装依赖
   uv pip install -e .
   
   # 创建 systemd 服务（推荐）
   # 参考 deploy-guide.md 中的详细步骤
   ```

3. **启动服务**
   ```bash
   systemctl start spectrum-mcp
   systemctl enable spectrum-mcp
   systemctl status spectrum-mcp
   ```

4. **验证服务**
   ```bash
   # 测试 SSE 连接
   curl -N http://8.153.175.190:8000/sse
   
   # 检查端口
   netstat -tlnp | grep 8000
   ```

5. **配置防火墙**
   ```bash
   # 开放 8000 端口
   firewall-cmd --permanent --add-port=8000/tcp
   firewall-cmd --reload
   
   # 或在云服务商控制台配置安全组
   ```

### 可选操作（优化）

1. **更新前端配置**
   
   在 MCP 商店配置中，将 URL 从 `http://localhost:8000` 更新为 `http://8.153.175.190:8000`

2. **测试工具调用**
   
   在 AI 助手中测试：
   ```
   请获取当前光谱数据，并计算 NDVI 指数。
   ```

3. **监控日志**
   ```bash
   journalctl -u spectrum-mcp -f
   ```

## 📋 配置检查清单

- [ ] 代码已上传到服务器
- [ ] Python 和 uv 已安装
- [ ] 依赖已安装（`uv pip install -e .`）
- [ ] systemd 服务已创建
- [ ] 服务已启动并设置开机自启
- [ ] 端口 8000 已开放（防火墙/安全组）
- [ ] SSE 连接测试成功
- [ ] MQTT 连接正常（查看日志）
- [ ] 前端 MCP 配置已更新
- [ ] AI 工具调用测试成功

## 🔧 故障排查

### 服务无法启动

```bash
# 查看详细日志
journalctl -u spectrum-mcp -n 100 --no-pager

# 手动运行测试
cd /opt/mcpserver_spectrum
uv run python src/mcp_server_spectrum/server.py
```

### MQTT 连接失败

检查环境变量配置：
```bash
cat /opt/mcpserver_spectrum/.env
```

确认 MQTT 凭据正确：
- Broker: `be18721454da4600b14a92424bb1181c.s1.eu.hivemq.cloud`
- Port: `8883`
- User: `meimeifarm`
- Password: `Meimei83036666`

### 端口被占用

```bash
# 查看占用端口的进程
lsof -i :8000

# 修改端口（在 .env 中）
echo "PORT=8001" >> /opt/mcpserver_spectrum/.env
```

### AI 调用失败

1. 确认服务器可访问：`curl http://8.153.175.190:8000/sse`
2. 检查前端 MCP 配置中的 URL
3. 查看浏览器控制台和服务器日志

## 📚 相关文档

- [部署指南](mcpserver_spectrum/deploy-guide.md) - 详细的部署步骤
- [集成文档](docs/spectrum-mcp-integration.md) - 使用说明和最佳实践
- [MCP 快速使用指南](MCP_快速使用指南.md) - MCP 系统概述

## 💡 使用示例

部署完成后，在 AI 助手中可以这样使用：

```
用户：请获取当前光谱数据

AI：好的，我来获取光谱传感器数据。
[调用 get_all_spectrum 工具]

当前光谱数据如下：
- 410nm (紫光): 1234
- 680nm (红光): 2345
- 760nm (近红外): 3456
...

根据数据计算的 NDVI 指数为 0.68，表明植物生长状况良好。
```

```
用户：分析植物健康状况

AI：我来获取光谱数据并进行分析。
[调用 get_all_spectrum 工具]

根据光谱分析：
1. NDVI = 0.68（正常范围 0.6-0.8）
2. 红边位置在 730nm 附近，未发现异常偏移
3. 绿光反射率正常，未见病害迹象

结论：植物健康状况良好，无需干预。
```

## ⚠️ 重要提示

1. **必须上云**：本地运行的服务器无法被云端应用访问
2. **端口开放**：确保云服务器防火墙和安全组允许 8000 端口
3. **MQTT 连接**：确保服务器能访问 HiveMQ Cloud（端口 8883）
4. **持久运行**：使用 systemd 确保服务开机自启和崩溃重启

---

配置完成后，光谱传感器数据将实时可用，AI 助手可以随时调用工具获取数据并进行智能分析！
