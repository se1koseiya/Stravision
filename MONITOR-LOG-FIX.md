# Monitor 页面操作日志修复说明

## 问题描述
/monitor 页面的操作日志面板没有显示操作记录。

## 问题原因分析

1. **日期过滤问题**: ActivityPanel 组件默认只显示当天的日志，如果数据库中没有今天的日志，就会显示"无活动记录"。

2. **可能的数据问题**:
   - 数据库中可能没有日志数据
   - 日志的 `created_at` 时间戳可能不是今天的日期
   - 时间戳格式可能不正确

## 已实施的修复

### 1. 改进日志获取和过滤逻辑
在 `components/monitor/activity-panel.tsx` 中添加了：
- 时间戳有效性验证
- 详细的控制台日志输出，便于调试
- 更好的错误处理

### 2. 创建测试工具

#### 方法 1: 使用 API 端点添加测试日志
访问以下 API 端点（需要管理员权限）：
```bash
POST /api/device-logs/test
```

或在浏览器控制台执行：
```javascript
fetch('/api/device-logs/test', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

#### 方法 2: 使用 Node.js 脚本
```bash
npx tsx scripts/test-device-logs.ts
```

### 3. 验证日志记录功能

所有设备控制操作都会自动记录日志：

- **MQTT 控制 API** (`/api/mqtt/control`): ✅ 已记录日志
- **AI 设备控制 API** (`/api/ai/device-control`): ✅ 已记录日志

## 调试步骤

1. **打开浏览器控制台**，访问 `/monitor` 页面

2. **查看控制台输出**:
   ```
   [ActivityPanel] 获取到 X 条日志
   [ActivityPanel] 过滤后有 Y 条日志匹配选中日期
   ```

3. **检查日志数据**:
   - 如果 X = 0，说明数据库中没有日志
   - 如果 X > 0 但 Y = 0，说明没有今天的日志

4. **添加测试日志**:
   ```javascript
   // 在浏览器控制台执行
   fetch('/api/device-logs/test', { method: 'POST' })
     .then(r => r.json())
     .then(data => {
       console.log(data)
       // 刷新页面查看日志
       location.reload()
     })
   ```

5. **手动触发设备操作**:
   - 访问 `/device-control` 页面
   - 控制任意设备（开关继电器、调整灯光等）
   - 返回 `/monitor` 页面查看日志

## 日志显示逻辑

- 默认显示今天的日志
- 可以点击日历条上的日期切换到其他日期
- 每 10 秒自动刷新一次
- 日志按时间倒序排列（最新的在上面）

## 数据库表结构

```sql
CREATE TABLE device_logs (
  id BIGSERIAL PRIMARY KEY,
  device_name TEXT NOT NULL,
  action TEXT NOT NULL,
  operator TEXT NOT NULL,
  details TEXT,
  created_at BIGINT NOT NULL
);
```

## 后续建议

1. **添加"显示所有日志"选项**: 允许用户查看所有日期的日志，不仅限于选中日期
2. **添加日期范围选择器**: 支持查看一段时间内的日志
3. **添加日志搜索功能**: 按设备名称、操作类型等搜索
4. **添加日志导出功能**: 导出为 CSV 或 JSON 格式

## 测试清单

- [ ] 数据库中有日志数据
- [ ] 日志的 created_at 时间戳正确
- [ ] ActivityPanel 组件正确获取日志
- [ ] 日期过滤逻辑正常工作
- [ ] 控制台输出调试信息
- [ ] 设备操作后自动记录日志
- [ ] 日志在 UI 中正确显示
