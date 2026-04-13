# 快速测试指南 - Monitor 页面操作日志

## 问题
/monitor 页面的操作日志没有显示记录

## 快速修复步骤

### 步骤 1: 添加测试日志

打开浏览器控制台（F12），在 Console 标签中执行：

```javascript
fetch('/api/device-logs/test', { 
  method: 'POST',
  credentials: 'include'
})
.then(r => r.json())
.then(data => {
  console.log('✅ 测试日志添加结果:', data)
  alert('测试日志已添加，页面将刷新')
  location.reload()
})
.catch(err => {
  console.error('❌ 添加失败:', err)
  alert('添加失败，请确保已登录且有管理员权限')
})
```

### 步骤 2: 查看日志

1. 刷新 `/monitor` 页面
2. 查看右侧的"操作日志"面板
3. 应该能看到刚才添加的测试日志

### 步骤 3: 调试（如果还是看不到）

在浏览器控制台查看调试信息：

```
[ActivityPanel] 获取到 X 条日志
[ActivityPanel] 过滤后有 Y 条日志匹配选中日期
```

如果 X > 0 但 Y = 0，说明日志不是今天的，点击"显示全部"按钮查看所有日志。

### 步骤 4: 实际测试设备控制

1. 访问 `/device-control` 页面
2. 控制任意设备（例如：开关水泵）
3. 返回 `/monitor` 页面
4. 应该能看到刚才的操作记录

## 新功能

### "显示全部"按钮
- 位置：操作日志标题右侧
- 功能：切换显示所有日志 / 按日期筛选
- 用途：当数据库中有历史日志但不是今天的时候，可以点击此按钮查看所有日志

### 调试日志
所有日志操作都会在浏览器控制台输出详细信息，便于排查问题。

## 常见问题

### Q: 提示 "Unauthorized"
A: 需要以管理员身份登录才能添加测试日志

### Q: 看不到任何日志
A: 
1. 检查浏览器控制台的调试信息
2. 点击"显示全部"按钮
3. 确认数据库中有日志数据

### Q: 日志显示但时间不对
A: 检查服务器时区设置，确保 `created_at` 时间戳正确

## 技术细节

### 日志记录位置
- `/api/mqtt/control` - 手动设备控制
- `/api/ai/device-control` - AI 助手控制

### 数据库表
```sql
device_logs (
  id, 
  device_name, 
  action, 
  operator, 
  details, 
  created_at
)
```

### API 端点
- `GET /api/device-logs?limit=50` - 获取日志
- `POST /api/device-logs` - 创建日志
- `POST /api/device-logs/test` - 添加测试日志（仅管理员）
