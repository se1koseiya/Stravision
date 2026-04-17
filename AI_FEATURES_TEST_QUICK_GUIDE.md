# AI 功能禁用 - 快速测试指南

## 🎯 测试目标

验证当管理员禁用某个 AI 功能后，该功能的标签不会出现在用户界面中。

## 📋 测试前准备

### 1. 确认配置文件
```bash
cat data/ai-features-config.json
```

应该看到：
```json
{
  "enableTaskList": false,
  ...
}
```

### 2. 重启开发服务器
```bash
npm run dev
```

## 🧪 测试步骤

### 测试 1: 任务列表功能禁用

1. **打开浏览器控制台**（F12）

2. **访问 AI 助手页面**
   - 打开 `http://localhost:3000/ai-assistant`

3. **检查配置加载**
   - 在控制台查找：`[AI Features] Current config:`
   - 确认 `enableTaskList: false`

4. **发送触发任务列表的请求**
   ```
   帮我规划一下今天的工作任务
   ```
   或
   ```
   制定一个草莓种植计划
   ```

5. **验证结果**
   - ✅ AI 回复中**没有**出现 `<TASK_LIST>` 标签
   - ✅ 页面上**没有**显示任务规划器组件（DynamicTaskPlanner）
   - ✅ 控制台显示：`[Frontend Filter] Applied to streaming content`
   - ✅ 控制台显示：`[Filter] Removed TASK_LIST tags`（如果 AI 尝试输出）

6. **错误情况**
   - ❌ 如果看到 `<TASK_LIST>` 标签 → 过滤失败
   - ❌ 如果看到任务规划器界面 → 组件检查失败

### 测试 2: 启用功能后恢复

1. **修改配置文件**
   ```json
   {
     "enableTaskList": true,
     ...
   }
   ```

2. **刷新页面**（不需要重启服务器）

3. **发送相同请求**
   ```
   帮我规划一下今天的工作任务
   ```

4. **验证结果**
   - ✅ AI 回复中包含 `<TASK_LIST>` 标签
   - ✅ 页面显示任务规划器组件
   - ✅ 任务列表正常工作

### 测试 3: 配置热更新

1. **保持页面打开**，不要刷新

2. **在管理员后台修改配置**
   - 访问 `http://localhost:3000/admin`
   - 找到"AI 功能设置"
   - 切换"任务列表"开关

3. **刷新 AI 助手页面**

4. **验证配置立即生效**
   - 控制台显示新的配置
   - 功能按新配置工作

## 🔍 调试检查点

### 检查点 1: 配置加载
```javascript
// 控制台应该显示：
[AI Features] Current config: {enableTaskList: false, ...}
```

### 检查点 2: 流过滤
```javascript
// 控制台应该显示：
[Frontend Filter] Applied to streaming content
```

### 检查点 3: 标签移除
```javascript
// 如果 AI 尝试输出被禁用的标签，控制台应该显示：
[Filter] Removed TASK_LIST tags
```

### 检查点 4: 组件不渲染
```javascript
// 在 React DevTools 中检查：
// DynamicTaskPlanner 组件不应该出现在组件树中
```

## 🐛 常见问题

### 问题 1: 配置没有加载
**症状**: 控制台没有显示 `[AI Features] Current config:`

**解决**:
1. 检查 `data/ai-features-config.json` 文件是否存在
2. 检查文件格式是否正确（有效的 JSON）
3. 重启开发服务器

### 问题 2: 标签仍然出现
**症状**: 页面上仍然显示 `<TASK_LIST>` 标签

**解决**:
1. 清除浏览器缓存
2. 使用无痕模式测试
3. 检查控制台是否有错误
4. 确认 `filterDisabledFeatures` 函数被调用

### 问题 3: 组件仍然渲染
**症状**: 任务规划器组件仍然显示

**解决**:
1. 检查 `aiFeatures.enableTaskList` 的值
2. 确认组件渲染条件正确
3. 查看 React DevTools 确认组件状态

## ✅ 成功标准

测试通过的标准：

1. ✅ 配置文件正确加载
2. ✅ 禁用功能时，标签不出现
3. ✅ 禁用功能时，组件不渲染
4. ✅ 启用功能时，一切正常工作
5. ✅ 配置变化后立即生效
6. ✅ 控制台显示正确的过滤日志

## 📊 测试矩阵

| 功能 | 配置 | 预期结果 | 实际结果 |
|------|------|----------|----------|
| 任务列表 | false | 不显示 | ✅ |
| 任务列表 | true | 显示 | ✅ |
| 设备状态 | false | 不显示 | ⏳ |
| 设备状态 | true | 显示 | ⏳ |
| 图表 | false | 不显示 | ⏳ |
| 图表 | true | 显示 | ⏳ |

## 🎓 测试技巧

1. **使用控制台过滤**
   - 在控制台输入：`[AI Features]` 或 `[Filter]`
   - 只显示相关日志

2. **使用 React DevTools**
   - 安装 React DevTools 扩展
   - 检查组件树和 props

3. **使用网络面板**
   - 查看 `/api/ai-features` 请求
   - 确认返回的配置正确

4. **使用断点调试**
   - 在 `filterDisabledFeatures` 函数设置断点
   - 查看过滤前后的内容

## 📝 测试报告模板

```
测试日期: ____________________
测试人员: ____________________

测试结果:
□ 配置加载正常
□ 标签过滤正常
□ 组件检查正常
□ 配置热更新正常

问题记录:
1. ________________________________
2. ________________________________

建议:
________________________________
```
