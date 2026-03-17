# 语音助手监控截图分析工作流

## 功能概述

用户可以对语音助手说："看看大棚里的草莓长得怎么样了？"，语音助手会自动：

1. 从监控画面截图
2. 跳转到 AI 助手页面
3. 自动发送截图和分析提示词
4. AI 分析草莓生长情况并生成报告
5. 语音助手提示用户查看报告

## 实现架构

```
用户语音输入
    ↓
语音助手识别命令
    ↓
执行截图工作流
    ↓
├─ 从监控页面截图
├─ 存储到 sessionStorage
└─ 跳转到 AI 助手页面
    ↓
AI 助手页面检测
    ↓
├─ 读取截图数据
├─ 设置为附件
└─ 自动发送分析请求
    ↓
AI 分析并生成报告
    ↓
语音助手提示完成
```

## 核心文件

### 1. 语音命令处理
**文件**: `lib/xiaozhi/voice-commands.ts`

```typescript
// 识别并执行语音命令
export async function processVoiceCommand(userText: string): Promise<VoiceCommandResult>

// 检查是否是特殊命令
export function isSpecialCommand(userText: string): boolean
```

**支持的命令关键词**:
- "看看大棚"
- "查看大棚"
- "大棚情况"
- "草莓长得怎么样"
- "草莓生长"
- "监控画面"
- "截图分析"
- "拍个照"

### 2. 监控截图工具
**文件**: `lib/xiaozhi/monitor-snapshot.ts`

```typescript
// 从监控页面截图
export async function captureMonitorSnapshot(cameraId?: number): Promise<SnapshotResult>

// 跳转到 AI 助手并传递截图
export function navigateToAIAssistantWithSnapshot(imageData: string, prompt: string)

// 完整的截图分析工作流
export async function executeSnapshotAnalysisWorkflow(prompt: string): Promise<{ success: boolean; error?: string }>

// 从 sessionStorage 获取截图数据
export function getSnapshotDataFromSession(): { imageData: string; prompt: string; timestamp: number } | null
```

### 3. AI 助手页面集成
**文件**: `app/ai-assistant/page.tsx`

**新增功能**:
- 检测 URL 参数 `?from=xiaozhi&action=analyze_snapshot`
- 从 sessionStorage 读取截图数据
- 自动设置附件和提示词
- 自动发送分析请求

```typescript
// 处理从语音助手传来的截图分析请求
const handleSnapshotAnalysis = async () => {
  const snapshotData = JSON.parse(sessionStorage.getItem('xiaozhi_snapshot_data'))
  setAttachments([snapshotData.imageData])
  setInput(snapshotData.prompt)
  handleSend(snapshotData.prompt, [snapshotData.imageData])
}
```

### 4. 截图 API
**文件**: `app/api/monitor/snapshot/route.ts`

```typescript
POST /api/monitor/snapshot
{
  "imageData": "data:image/jpeg;base64,...",
  "cameraName": "监控摄像头 A"
}
```

## 使用流程

### 1. 用户发起语音命令

```
用户: "看看大棚里的草莓长得怎么样了？"
```

### 2. 语音助手识别命令

```typescript
const result = await processVoiceCommand(userText);
if (result.recognized && result.action === 'snapshot_analysis') {
  // 执行截图工作流
}
```

### 3. 执行截图

```typescript
const snapshotResult = await captureMonitorSnapshot();
// 返回: { success: true, imageData: "data:image/jpeg;base64,...", cameraName: "监控摄像头 A" }
```

### 4. 跳转到 AI 助手

```typescript
navigateToAIAssistantWithSnapshot(imageData, prompt);
// 存储数据到 sessionStorage
// 跳转到 /ai-assistant?from=xiaozhi&action=analyze_snapshot
```

### 5. AI 助手自动分析

```typescript
// AI 助手页面检测 URL 参数
if (fromXiaozhi && action === 'analyze_snapshot') {
  handleSnapshotAnalysis();
}

// 自动发送消息
handleSend(prompt, [imageData]);
```

### 6. 生成分析报告

AI 会分析截图并生成详细报告，包括：
- 植株整体健康状况
- 叶片颜色和形态
- 果实发育情况
- 是否有病虫害迹象
- 环境条件是否适宜
- 改进建议

### 7. 语音助手提示完成

```
语音助手: "好的，我已经完成了大棚草莓的生长分析报告，请您查看。"
```

## 数据流

### sessionStorage 数据结构

```typescript
{
  "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "prompt": "请详细分析这张监控截图中的草莓生长情况...",
  "timestamp": 1705564800000
}
```

**特点**:
- 存储在 `xiaozhi_snapshot_data` 键下
- 一次性使用（读取后自动清除）
- 5分钟过期时间
- 跨页面传递数据

### URL 参数

```
/ai-assistant?from=xiaozhi&action=analyze_snapshot
```

**参数说明**:
- `from=xiaozhi`: 标识来源是语音助手
- `action=analyze_snapshot`: 指定操作类型

## 错误处理

### 1. 未找到监控画面

```typescript
if (!video) {
  return {
    success: false,
    error: '未找到监控画面，请先打开监控页面'
  };
}
```

**语音助手响应**: "抱歉，未找到监控画面，请先打开监控页面。"

### 2. 截图失败

```typescript
catch (error) {
  return {
    success: false,
    error: '截图失败'
  };
}
```

**语音助手响应**: "抱歉，截图失败，请稍后重试。"

### 3. 数据过期

```typescript
if (Date.now() - timestamp > 5 * 60 * 1000) {
  toast.error('截图数据已过期');
  return;
}
```

## 配置选项

### 默认分析提示词

```typescript
const defaultPrompt = 
  '请详细分析这张监控截图中的草莓生长情况，包括：\n' +
  '1. 植株整体健康状况\n' +
  '2. 叶片颜色和形态\n' +
  '3. 果实发育情况\n' +
  '4. 是否有病虫害迹象\n' +
  '5. 环境条件是否适宜\n' +
  '6. 改进建议';
```

### 截图质量

```typescript
const imageData = canvas.toDataURL('image/jpeg', 0.9); // 90% 质量
```

### 数据过期时间

```typescript
const EXPIRY_TIME = 5 * 60 * 1000; // 5分钟
```

## 扩展功能

### 1. 支持多摄像头

```typescript
// 指定摄像头 ID
await captureMonitorSnapshot(1); // 摄像头 A
await captureMonitorSnapshot(2); // 摄像头 B
```

### 2. 自定义分析维度

```typescript
// 用户可以指定分析重点
"看看草莓有没有病虫害" → 重点分析病虫害
"看看草莓成熟度" → 重点分析果实成熟情况
```

### 3. 历史记录

```typescript
// 保存分析历史
interface AnalysisHistory {
  timestamp: number;
  imageData: string;
  prompt: string;
  result: string;
}
```

### 4. 定时自动分析

```typescript
// 每天定时截图并分析
const schedule = {
  time: '09:00',
  frequency: 'daily',
  action: 'snapshot_analysis'
};
```

## 性能优化

### 1. 图片压缩

```typescript
// 压缩大图片
if (canvas.width > 1920) {
  const scale = 1920 / canvas.width;
  canvas.width = 1920;
  canvas.height = canvas.height * scale;
}
```

### 2. 懒加载

```typescript
// 只在需要时加载截图功能
const { captureMonitorSnapshot } = await import('@/lib/xiaozhi/monitor-snapshot');
```

### 3. 缓存优化

```typescript
// 缓存最近的截图
const CACHE_KEY = 'recent_snapshot';
const CACHE_DURATION = 60 * 1000; // 1分钟
```

## 安全考虑

### 1. 权限验证

```typescript
// API 需要验证用户登录
const user = await getCurrentUser();
if (!user) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 2. 数据清理

```typescript
// 自动清除过期数据
sessionStorage.removeItem('xiaozhi_snapshot_data');
```

### 3. 大小限制

```typescript
// 限制图片大小
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
if (imageData.length > MAX_SIZE) {
  throw new Error('图片过大');
}
```

## 测试用例

### 1. 基本流程测试

```typescript
test('完整的截图分析工作流', async () => {
  // 1. 用户说话
  const userText = '看看大棚里的草莓长得怎么样了';
  
  // 2. 识别命令
  const result = await processVoiceCommand(userText);
  expect(result.recognized).toBe(true);
  expect(result.action).toBe('snapshot_analysis');
  
  // 3. 执行截图
  const snapshot = await captureMonitorSnapshot();
  expect(snapshot.success).toBe(true);
  expect(snapshot.imageData).toBeDefined();
  
  // 4. 跳转并分析
  // ... 验证页面跳转和自动发送
});
```

### 2. 错误处理测试

```typescript
test('未找到监控画面', async () => {
  const result = await captureMonitorSnapshot();
  expect(result.success).toBe(false);
  expect(result.error).toContain('未找到监控画面');
});
```

### 3. 数据过期测试

```typescript
test('截图数据过期', async () => {
  // 设置过期数据
  const expiredData = {
    imageData: 'data:image/jpeg;base64,...',
    prompt: 'test',
    timestamp: Date.now() - 10 * 60 * 1000 // 10分钟前
  };
  sessionStorage.setItem('xiaozhi_snapshot_data', JSON.stringify(expiredData));
  
  // 尝试读取
  const data = getSnapshotDataFromSession();
  expect(data).toBeNull();
});
```

## 故障排查

### 问题 1: 截图失败

**症状**: 语音助手提示"截图失败"

**排查步骤**:
1. 检查是否在监控页面
2. 检查视频元素是否存在
3. 检查浏览器控制台错误
4. 检查视频是否正在播放

**解决方案**:
```typescript
// 确保视频已加载
video.addEventListener('loadeddata', () => {
  // 现在可以截图
});
```

### 问题 2: 跳转后没有自动发送

**症状**: 跳转到 AI 助手但没有自动分析

**排查步骤**:
1. 检查 URL 参数是否正确
2. 检查 sessionStorage 数据
3. 检查浏览器控制台错误

**解决方案**:
```typescript
// 确保 URL 参数正确
const url = new URL(window.location.href);
console.log('from:', url.searchParams.get('from'));
console.log('action:', url.searchParams.get('action'));
```

### 问题 3: AI 无法识别图片

**症状**: AI 提示无法识别图片内容

**排查步骤**:
1. 检查图片质量
2. 检查图片格式
3. 检查模型是否支持视觉

**解决方案**:
```typescript
// 确保使用视觉模型
if (hasImageContent && !isVLMModel) {
  effectiveModel = 'qwen-vl-plus';
}
```

## 相关文档

- [图片识别功能](./image-preview-feature.md)
- [语音助手集成](./realtime-voice-integration.md)
- [AI 命令执行](./ai-command-execution.md)
- [监控页面文档](../app/monitor/page.tsx)

## 更新日志

### 2024-01-18
- ✅ 初始版本发布
- ✅ 支持语音触发截图
- ✅ 自动跳转和分析
- ✅ 完整的错误处理

## 后续优化

- [ ] 支持多摄像头选择
- [ ] 添加分析历史记录
- [ ] 支持定时自动分析
- [ ] 优化图片压缩
- [ ] 添加分析模板
- [ ] 支持语音播报结果
