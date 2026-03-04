# 🎤 语音助手监控截图分析功能

## 功能说明

用户可以对语音助手说："**看看大棚里的草莓长得怎么样了？**"

语音助手会自动：
1. 📸 从监控画面截图
2. 🔄 跳转到 AI 助手页面
3. 🤖 自动发送截图给 AI 分析
4. 📊 生成详细的生长分析报告
5. 🔔 提示用户查看报告

## 实现文件

### 核心功能

| 文件 | 说明 |
|------|------|
| `lib/xiaozhi/voice-commands.ts` | 语音命令识别和处理 |
| `lib/xiaozhi/monitor-snapshot.ts` | 监控截图工具 |
| `app/api/monitor/snapshot/route.ts` | 截图 API |
| `app/ai-assistant/page.tsx` | AI 助手页面（已更新） |

### 支持的语音命令

用户可以说以下任意一句话触发截图分析：

- "看看大棚"
- "查看大棚"
- "大棚情况"
- "草莓长得怎么样"
- "草莓生长"
- "监控画面"
- "截图分析"
- "拍个照"
- "看一下大棚"

## 使用方法

### 1. 打开监控页面

访问 `/monitor` 页面，确保监控画面正在播放。

### 2. 激活语音助手

点击屏幕右下角的语音助手图标（莓小智）。

### 3. 说出命令

对着麦克风说："**看看大棚里的草莓长得怎么样了？**"

### 4. 等待分析

- 语音助手会自动截图
- 跳转到 AI 助手页面
- 自动发送截图和分析请求
- AI 生成详细报告

### 5. 查看报告

AI 会分析以下内容：
- ✅ 植株整体健康状况
- ✅ 叶片颜色和形态
- ✅ 果实发育情况
- ✅ 是否有病虫害迹象
- ✅ 环境条件是否适宜
- ✅ 改进建议

## 工作流程

```
用户语音 → 命令识别 → 监控截图 → 跳转页面 → AI 分析 → 生成报告
```

### 详细流程

1. **语音输入**
   ```
   用户: "看看大棚里的草莓长得怎么样了？"
   ```

2. **命令识别**
   ```typescript
   const result = await processVoiceCommand(userText);
   // result.action === 'snapshot_analysis'
   ```

3. **执行截图**
   ```typescript
   const snapshot = await captureMonitorSnapshot();
   // 返回 Base64 图片数据
   ```

4. **跳转页面**
   ```typescript
   navigateToAIAssistantWithSnapshot(imageData, prompt);
   // 跳转到 /ai-assistant?from=xiaozhi&action=analyze_snapshot
   ```

5. **自动分析**
   ```typescript
   // AI 助手页面自动检测并发送
   handleSnapshotAnalysis();
   ```

6. **生成报告**
   ```
   AI: "根据监控截图分析，草莓植株整体生长良好..."
   ```

## 技术实现

### 1. 语音命令识别

**文件**: `lib/xiaozhi/voice-commands.ts`

```typescript
export async function processVoiceCommand(userText: string): Promise<VoiceCommandResult> {
  const text = userText.toLowerCase().trim();
  
  const snapshotKeywords = [
    '看看大棚', '查看大棚', '草莓长得怎么样', ...
  ];
  
  const isSnapshotCommand = snapshotKeywords.some(keyword => text.includes(keyword));
  
  if (isSnapshotCommand) {
    const result = await executeSnapshotAnalysisWorkflow(prompt);
    return {
      recognized: true,
      action: 'snapshot_analysis',
      response: '好的，我已经从监控画面截图，正在跳转到AI助手进行分析...'
    };
  }
  
  return { recognized: false };
}
```

### 2. 监控截图

**文件**: `lib/xiaozhi/monitor-snapshot.ts`

```typescript
export async function captureMonitorSnapshot(): Promise<SnapshotResult> {
  const video = document.querySelector('video');
  if (!video) {
    return { success: false, error: '未找到监控画面' };
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  const imageData = canvas.toDataURL('image/jpeg', 0.9);
  
  return { success: true, imageData };
}
```

### 3. 数据传递

使用 `sessionStorage` 跨页面传递数据：

```typescript
sessionStorage.setItem('xiaozhi_snapshot_data', JSON.stringify({
  imageData: 'data:image/jpeg;base64,...',
  prompt: '请分析这张监控截图...',
  timestamp: Date.now()
}));
```

### 4. AI 助手自动处理

**文件**: `app/ai-assistant/page.tsx`

```typescript
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const fromXiaozhi = urlParams.get('from') === 'xiaozhi';
  const action = urlParams.get('action');
  
  if (fromXiaozhi && action === 'analyze_snapshot') {
    handleSnapshotAnalysis();
  }
}, []);

const handleSnapshotAnalysis = async () => {
  const snapshotData = JSON.parse(sessionStorage.getItem('xiaozhi_snapshot_data'));
  sessionStorage.removeItem('xiaozhi_snapshot_data');
  
  setAttachments([snapshotData.imageData]);
  setInput(snapshotData.prompt);
  
  setTimeout(() => {
    handleSend(snapshotData.prompt, [snapshotData.imageData]);
  }, 500);
};
```

## 配置说明

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

- 格式：JPEG
- 质量：90%
- 最大尺寸：1920x1080

### 数据过期时间

- 5分钟自动过期
- 一次性使用（读取后清除）

## 错误处理

### 1. 未找到监控画面

```
语音助手: "抱歉，未找到监控画面，请先打开监控页面。"
```

**解决方案**: 先访问 `/monitor` 页面

### 2. 截图失败

```
语音助手: "抱歉，截图失败，请稍后重试。"
```

**解决方案**: 
- 检查视频是否正在播放
- 刷新监控页面
- 检查浏览器权限

### 3. 数据过期

```
提示: "截图数据已过期"
```

**解决方案**: 重新执行语音命令

## 使用示例

### 示例 1: 基本使用

```
用户: "看看大棚里的草莓长得怎么样了？"

语音助手: "好的，我已经从监控画面截图，正在跳转到AI助手进行分析，请稍候..."

[自动跳转到 AI 助手页面]

AI: "根据监控截图分析，草莓植株整体生长良好：

1. 植株健康状况：叶片翠绿，生长旺盛
2. 叶片形态：叶片舒展，无明显病斑
3. 果实发育：果实饱满，颜色鲜艳
4. 病虫害：未发现明显病虫害迹象
5. 环境条件：光照充足，温湿度适宜
6. 建议：继续保持当前管理方式"

语音助手: "好的，我已经完成了大棚草莓的生长分析报告，请您查看。"
```

### 示例 2: 病虫害检测

```
用户: "看看草莓有没有病虫害"

[执行截图和分析]

AI: "经过仔细检查，发现以下情况：

1. 部分叶片边缘有褐色斑点，可能是灰霉病早期症状
2. 建议：
   - 降低湿度至60%以下
   - 增强通风
   - 喷施杀菌剂
   - 及时清除病叶"
```

### 示例 3: 成熟度判断

```
用户: "看看草莓什么时候可以采摘"

[执行截图和分析]

AI: "根据果实颜色和大小判断：

1. 约70%的果实已转红
2. 建议再等2-3天采摘
3. 最佳采摘时机：果实90%以上转红，表面有光泽"
```

## 扩展功能

### 1. 多摄像头支持

```typescript
// 指定摄像头
"看看A摄像头的草莓" → 截取摄像头A
"看看B摄像头的草莓" → 截取摄像头B
```

### 2. 定时分析

```typescript
// 设置定时任务
"每天早上9点分析一次草莓生长情况"
```

### 3. 历史对比

```typescript
// 对比历史数据
"对比一下今天和昨天的草莓生长情况"
```

## 性能优化

- ✅ 图片自动压缩（90%质量）
- ✅ 懒加载截图功能
- ✅ 5分钟数据过期
- ✅ 一次性使用数据

## 安全考虑

- ✅ 用户登录验证
- ✅ 自动清除敏感数据
- ✅ 图片大小限制
- ✅ 数据过期机制

## 相关文档

- [详细实现文档](./docs/voice-snapshot-analysis-workflow.md)
- [图片识别功能](./docs/image-preview-feature.md)
- [语音助手集成](./docs/realtime-voice-integration.md)

## 状态

✅ **已实现** - 2024-01-18

- ✅ 语音命令识别
- ✅ 监控截图功能
- ✅ 自动跳转和分析
- ✅ 错误处理
- ✅ 完整文档

## 测试建议

1. 打开监控页面
2. 激活语音助手
3. 说："看看大棚里的草莓长得怎么样了？"
4. 观察自动截图、跳转和分析过程
5. 查看生成的分析报告

---

**功能已完成！现在可以通过语音命令自动分析草莓生长情况了。** 🎉
