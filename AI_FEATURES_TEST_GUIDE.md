# AI 功能开关测试指南

## 快速测试步骤

### 测试 1：禁用任务规划器

#### 步骤
1. 访问 `/admin` 页面
2. 切换到 **System Settings** 标签
3. 找到 **AI 功能开关** 卡片
4. 关闭 **任务规划器** 开关
5. 点击 **保存配置**

#### 验证
1. 访问 `/ai-assistant` 页面
2. 发送消息："帮我制定一个草莓大棚的温度调控方案"
3. **预期结果**：
   - ✅ AI 不会输出 `<TASK_LIST>` 标签
   - ✅ AI 会用文字描述方案，而不是任务列表
   - ✅ 前端不显示任务规划器组件

#### 系统提示词变化
```diff
+ ## 🚫 禁用的功能
+ **重要：以下标签已被管理员禁用，严禁输出！**
+ 
+ 禁用的标签：<TASK_LIST>
+ 
+ **严格规则：**
+ - ❌ 不要输出上述任何标签
+ - ❌ 不要尝试使用这些功能

- ## 可用的 UI 标签
- - <TASK_LIST></TASK_LIST> - 任务规划器
```

---

### 测试 2：禁用设备控制

#### 步骤
1. 在管理后台关闭 **设备控制指令** 开关
2. 保存配置

#### 验证
1. 在 AI 助手中发送："打开风扇"
2. **预期结果**：
   - ✅ AI 不会输出设备控制 JSON
   - ✅ AI 会告知用户该功能暂时不可用
   - ✅ 或者 AI 会建议用户手动操作

#### 系统提示词变化
```diff
+ ## 🚫 设备控制已禁用
+ 严禁输出任何设备控制 JSON 指令（toggle_relay, control_camera, reset_camera 等）。
```

---

### 测试 3：禁用思考过程

#### 步骤
1. 在管理后台关闭 **思考过程** 开关
2. 保存配置
3. 在 AI 助手中开启 **深度思考模式**

#### 验证
1. 发送复杂问题："分析当前环境数据并给出优化建议"
2. **预期结果**：
   - ✅ AI 不会输出 `<REASONING>` 标签
   - ✅ 即使开启了深度思考模式，也不显示思考过程
   - ✅ 直接显示最终答案

#### 系统提示词变化
```diff
+ ## 重要：禁止输出思维链
+ **严禁**在回复中输出 <REASONING> 标签或任何形式的思考过程。
+ 用户未开启深度思考模式，请直接给出答案，不要展示中间推理步骤。
```

---

### 测试 4：禁用多个功能

#### 步骤
1. 同时关闭以下功能：
   - 任务规划器
   - 设备状态卡片
   - 设备控制面板
   - 监控画面
2. 保存配置

#### 验证
1. 发送："查看当前设备状态并帮我调控环境"
2. **预期结果**：
   - ✅ AI 不会输出任何被禁用的标签
   - ✅ AI 会用纯文字描述设备状态
   - ✅ AI 会告知用户某些功能不可用
   - ✅ 前端不显示任何被禁用的组件

#### 系统提示词变化
```diff
+ ## 🚫 禁用的功能
+ **重要：以下标签已被管理员禁用，严禁输出！**
+ 
+ 禁用的标签：<TASK_LIST>, <DEVICE_BENTO>, <CONTROL_BENTO>, <MONITOR>
```

---

### 测试 5：重置配置

#### 步骤
1. 点击 **重置** 按钮
2. 点击 **保存配置**

#### 验证
1. 所有功能开关都应该变为启用状态
2. AI 助手恢复所有功能
3. 可以正常输出所有标签

---

## 调试技巧

### 1. 查看系统提示词

在浏览器控制台中查看实际发送给 AI 的系统提示词：

```javascript
// 在 chat API 中添加日志
console.log('[System Prompt]', compactSystemPrompt)
```

### 2. 查看配置文件

```bash
# 查看配置文件内容
cat data/ai-features-config.json

# 或者在 Windows PowerShell
Get-Content data/ai-features-config.json
```

### 3. 测试配置 API

```bash
# 获取配置
curl http://localhost:3000/api/ai-features

# 保存配置（需要管理员权限）
curl -X POST http://localhost:3000/api/admin/ai-features \
  -H "Content-Type: application/json" \
  -d '{"enableTaskList": false}'
```

### 4. 查看后端日志

在服务器控制台中查看：

```
[Chat API] AI Features Config: Loaded
```

或

```
[Chat API] AI Features Config: Using defaults
```

---

## 常见问题

### Q1: 禁用功能后，AI 仍然输出被禁用的标签？

**可能原因：**
1. 配置文件未正确保存
2. 浏览器缓存了旧的配置
3. AI 模型违反了指令

**解决方法：**
1. 检查 `data/ai-features-config.json` 文件内容
2. 刷新浏览器页面（Ctrl+F5）
3. 查看后端日志确认配置已加载
4. 前端会自动过滤掉违规输出

### Q2: 配置保存失败？

**可能原因：**
1. 没有管理员权限
2. `data` 目录不存在或无写入权限

**解决方法：**
1. 确认使用管理员账号登录
2. 手动创建 `data` 目录
3. 检查目录权限

### Q3: 前端仍然显示被禁用的组件？

**可能原因：**
1. 前端未集成配置检查
2. 组件使用了硬编码的条件

**解决方法：**
1. 在组件中使用 `useAIFeatures` hook
2. 根据配置条件渲染组件

---

## 性能测试

### 配置加载性能

```javascript
// 测试配置读取速度
console.time('Load AI Features Config')
const config = await fetch('/api/ai-features').then(r => r.json())
console.timeEnd('Load AI Features Config')
// 预期：< 50ms
```

### 系统提示词生成性能

```javascript
// 测试提示词生成速度
console.time('Generate System Prompt')
const prompt = generateCompactSystemPrompt({
  basePrompt: '...',
  enableDeviceControl: true,
  enableReasoning: true,
  mcpToolNames: [],
  contextCompressed: false,
  aiFeatures: config
})
console.timeEnd('Generate System Prompt')
// 预期：< 10ms
```

---

## 自动化测试脚本

### 测试所有功能开关

```typescript
// test-ai-features.ts
const features = [
  'enableTaskList',
  'enableDeviceBento',
  'enableControlBento',
  'enableMonitor',
  'enableScheduledTasks',
  'enableChart',
  'enableSpectral',
  'enableReasoning',
  'enableSources',
  'enableToolUsed',
  'enableScheduleTask',
  'enableDeviceControl',
  'enableHTMLPreview',
  'enableWebPreview',
]

for (const feature of features) {
  console.log(`Testing ${feature}...`)
  
  // 禁用功能
  await fetch('/api/admin/ai-features', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [feature]: false })
  })
  
  // 发送测试消息
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Test message' }]
    })
  })
  
  // 验证响应中不包含被禁用的标签
  const data = await response.json()
  console.log(`✓ ${feature} disabled successfully`)
}
```

---

## 测试清单

- [ ] 禁用单个功能
- [ ] 禁用多个功能
- [ ] 禁用所有功能
- [ ] 重置为默认配置
- [ ] 配置持久化（服务器重启后仍然生效）
- [ ] 非管理员无法修改配置
- [ ] 所有用户可以读取配置
- [ ] 前端正确过滤被禁用的标签
- [ ] AI 遵守禁用指令
- [ ] 配置文件损坏时使用默认配置
- [ ] 并发保存配置不冲突

---

## 测试报告模板

```markdown
# AI 功能开关测试报告

## 测试环境
- 日期：2026-04-16
- 测试人员：[姓名]
- 浏览器：Chrome 120
- 服务器：Node.js 18

## 测试结果

### 功能测试
| 功能 | 状态 | 备注 |
|------|------|------|
| 禁用任务规划器 | ✅ 通过 | AI 正确遵守指令 |
| 禁用设备控制 | ✅ 通过 | 不输出控制 JSON |
| 禁用思考过程 | ✅ 通过 | 不显示思维链 |
| 重置配置 | ✅ 通过 | 所有功能恢复 |

### 性能测试
| 指标 | 结果 | 目标 |
|------|------|------|
| 配置加载时间 | 35ms | < 50ms |
| 提示词生成时间 | 5ms | < 10ms |

### 问题记录
1. [问题描述]
2. [解决方案]

## 结论
所有测试通过，功能正常。
```
