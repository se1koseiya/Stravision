# 语音助手截图命令测试指南

## 快速测试

### 前置条件

1. ✅ 服务器正在运行
2. ✅ 已登录系统
3. ✅ 监控页面视频正在播放
4. ✅ 浏览器已授予麦克风权限

### 测试步骤

#### 步骤 1: 打开监控页面

```
导航到: http://localhost:3000/monitor
```

确认：
- [ ] 视频画面正常显示
- [ ] 视频正在播放（不是暂停状态）

#### 步骤 2: 激活语音助手

1. 点击右下角的语音助手球体
2. 等待状态变为"正在聆听"

确认：
- [ ] 球体颜色变化（表示已连接）
- [ ] 显示"正在聆听"状态
- [ ] 麦克风权限已授予

#### 步骤 3: 说出测试命令

清晰地说出以下任一命令：

```
"看看大棚里的草莓长得怎么样了？"
"查看大棚情况"
"草莓长得怎么样"
"截图分析一下"
"拍个照看看"
```

#### 步骤 4: 观察执行流程

预期行为：

1. **语音识别** (1-2秒)
   - [ ] 显示你说的话
   - [ ] 控制台显示: `[RealtimeVoiceOrb] Snapshot command detected`

2. **命令响应** (立即)
   - [ ] 显示响应文本: "好的，我已经从监控画面截图，正在跳转到AI助手进行分析，请稍候..."
   - [ ] **不会**显示设备控制 JSON
   - [ ] **不会**执行设备操作

3. **截图** (1秒)
   - [ ] 控制台显示截图成功日志

4. **页面跳转** (立即)
   - [ ] 自动跳转到 `/ai-assistant?from=xiaozhi&action=analyze_snapshot`

5. **自动分析** (2-3秒)
   - [ ] AI 助手自动发送分析请求
   - [ ] 显示截图预览
   - [ ] AI 开始分析

6. **生成报告** (5-10秒)
   - [ ] AI 返回详细的草莓生长分析报告
   - [ ] 报告包含健康状况、叶片形态、果实发育等内容

## 详细测试场景

### 场景 1: 正常流程测试

**目标**: 验证完整的截图分析工作流

**步骤**:
1. 打开监控页面
2. 激活语音助手
3. 说："看看大棚里的草莓长得怎么样了？"
4. 等待完整流程执行

**预期结果**:
- ✅ 命令被正确识别
- ✅ 截图成功
- ✅ 跳转到 AI 助手
- ✅ 自动发送分析请求
- ✅ 生成分析报告
- ❌ 不会生成设备控制命令
- ❌ 不会执行设备操作

### 场景 2: 关键词变体测试

**目标**: 验证不同关键词都能触发命令

**测试命令**:
- "看看大棚"
- "查看大棚"
- "大棚情况"
- "草莓长得怎么样"
- "草莓生长"
- "监控画面"
- "截图分析"
- "拍个照"
- "看一下大棚"

**预期**: 所有命令都应该触发截图分析工作流

### 场景 3: 非特殊命令测试

**目标**: 验证普通命令不会被误识别

**测试命令**:
- "打开风扇"
- "关闭水泵"
- "设置补光灯"
- "今天天气怎么样"
- "温度是多少"

**预期**: 这些命令应该正常发送给 AI 处理，不会触发截图

### 场景 4: 错误处理测试

#### 4.1 未在监控页面

**步骤**:
1. 在其他页面（如 dashboard）
2. 激活语音助手
3. 说："看看大棚"

**预期**:
- ✅ 命令被识别
- ✅ 显示错误提示: "未找到监控画面，请先打开监控页面"
- ❌ 不会跳转

#### 4.2 视频未加载

**步骤**:
1. 在监控页面但视频未加载
2. 激活语音助手
3. 说："看看大棚"

**预期**:
- ✅ 命令被识别
- ✅ 显示错误提示
- ❌ 不会跳转

## 控制台日志检查

### 正常流程日志

```
[RealtimeVoiceOrb] Received: conversation.item.input_audio_transcription.completed
[RealtimeVoiceOrb] Snapshot command detected: 看看大棚里的草莓长得怎么样了？
[Snapshot] Capturing from video element
[Snapshot] Capture successful, size: 1920x1080
[Snapshot] Navigating to AI assistant
[AI Assistant] Snapshot data detected
[AI Assistant] Auto-sending analysis request
```

### 错误流程日志

```
[RealtimeVoiceOrb] Snapshot command detected: 看看大棚
[Snapshot] Error: 未找到监控画面
[RealtimeVoiceOrb] Special command error: 截图失败
```

## 性能指标

### 响应时间

- 命令识别: < 100ms
- 截图操作: < 1s
- 页面跳转: < 500ms
- 自动发送: < 500ms
- AI 分析: 5-10s

### 总耗时

从说话到看到分析报告: **7-12秒**

## 常见问题排查

### 问题 1: 命令未被识别

**症状**: 说了关键词但没有任何反应

**检查**:
```javascript
// 在浏览器控制台执行
console.log('Testing command recognition');
const text = '看看大棚';
const keywords = ['看看大棚', '查看大棚', '大棚情况'];
console.log('Match:', keywords.some(k => text.includes(k)));
```

**可能原因**:
- 语音识别不准确
- 关键词不匹配
- 代码未正确部署

### 问题 2: 生成了设备控制命令

**症状**: 看到设备控制 JSON 而不是截图

**检查**:
```javascript
// 查看控制台是否有这条日志
// [RealtimeVoiceOrb] Snapshot command detected
```

**可能原因**:
- 命令拦截代码未生效
- `response.cancel` 未发送
- 系统指令未更新

**解决**:
1. 确认 `components/realtime-voice-orb.tsx` 已更新
2. 重启开发服务器
3. 清除浏览器缓存

### 问题 3: 截图失败

**症状**: 提示"未找到监控画面"

**检查**:
```javascript
// 在监控页面控制台执行
const video = document.querySelector('video');
console.log('Video element:', video);
console.log('Video width:', video?.videoWidth);
console.log('Video height:', video?.videoHeight);
console.log('Video paused:', video?.paused);
```

**可能原因**:
- 不在监控页面
- 视频未加载
- 视频元素选择器错误

### 问题 4: 未自动跳转

**症状**: 截图成功但没有跳转

**检查**:
```javascript
// 查看 sessionStorage
console.log(sessionStorage.getItem('xiaozhi_snapshot_data'));
```

**可能原因**:
- `navigateToAIAssistantWithSnapshot` 未执行
- 路由配置问题

### 问题 5: 未自动发送分析

**症状**: 跳转成功但没有自动发送

**检查**:
```javascript
// 在 AI 助手页面控制台执行
import { getSnapshotDataFromSession } from '@/lib/xiaozhi/monitor-snapshot';
const data = getSnapshotDataFromSession();
console.log('Snapshot data:', data);
```

**可能原因**:
- `useEffect` 未触发
- 数据已过期（超过5分钟）
- 数据格式错误

## 回归测试清单

在修改代码后，确保以下功能仍然正常：

- [ ] 普通语音对话功能
- [ ] 设备控制命令（"打开风扇"等）
- [ ] 定时任务命令（"5分钟后关闭水泵"）
- [ ] 页面导航命令（"打开数据看板"）
- [ ] 语音识别准确性
- [ ] 语音合成播报
- [ ] 实时转录显示
- [ ] 错误处理和提示

## 自动化测试脚本

### 命令识别测试

```typescript
// test/voice-commands.test.ts
import { processVoiceCommand, isSpecialCommand } from '@/lib/xiaozhi/voice-commands';

describe('Voice Commands', () => {
  test('should recognize snapshot commands', async () => {
    const commands = [
      '看看大棚',
      '查看大棚',
      '草莓长得怎么样',
      '截图分析',
    ];
    
    for (const cmd of commands) {
      expect(isSpecialCommand(cmd)).toBe(true);
      const result = await processVoiceCommand(cmd);
      expect(result.recognized).toBe(true);
      expect(result.action).toBe('snapshot_analysis');
    }
  });
  
  test('should not recognize normal commands', () => {
    const commands = [
      '打开风扇',
      '关闭水泵',
      '今天天气怎么样',
    ];
    
    for (const cmd of commands) {
      expect(isSpecialCommand(cmd)).toBe(false);
    }
  });
});
```

### 截图功能测试

```typescript
// test/monitor-snapshot.test.ts
import { captureMonitorSnapshot } from '@/lib/xiaozhi/monitor-snapshot';

describe('Monitor Snapshot', () => {
  test('should capture snapshot when video exists', async () => {
    // Mock video element
    const mockVideo = document.createElement('video');
    mockVideo.videoWidth = 1920;
    mockVideo.videoHeight = 1080;
    document.body.appendChild(mockVideo);
    
    const result = await captureMonitorSnapshot();
    
    expect(result.success).toBe(true);
    expect(result.imageData).toBeDefined();
    expect(result.imageData).toContain('data:image/jpeg');
    
    document.body.removeChild(mockVideo);
  });
  
  test('should fail when video does not exist', async () => {
    const result = await captureMonitorSnapshot();
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('未找到监控画面，请先打开监控页面');
  });
});
```

## 测试报告模板

```markdown
# 语音助手截图命令测试报告

**测试日期**: YYYY-MM-DD
**测试人员**: [姓名]
**版本**: [版本号]

## 测试环境

- 浏览器: Chrome 120.0
- 操作系统: Windows 11
- 服务器: localhost:3000

## 测试结果

### 场景 1: 正常流程
- 状态: ✅ 通过
- 耗时: 8秒
- 备注: 无

### 场景 2: 关键词变体
- 状态: ✅ 通过
- 测试命令数: 9
- 成功率: 100%

### 场景 3: 非特殊命令
- 状态: ✅ 通过
- 备注: 普通命令正常处理

### 场景 4: 错误处理
- 状态: ✅ 通过
- 备注: 错误提示正确

## 问题记录

无

## 总结

所有测试场景通过，功能正常。
```

## 下一步

测试通过后：

1. ✅ 提交代码
2. ✅ 更新文档
3. ✅ 通知团队
4. ✅ 部署到生产环境

---

**祝测试顺利！** 🎉
