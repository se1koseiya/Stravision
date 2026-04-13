# AI语音助手智能断开功能

## 功能说明

当用户对AI语音助手说出告别语或表示不需要时，语音助手会自动识别并智能断开连接。

## 支持的断开命令

用户可以说以下任何一句话来断开语音助手：

### 直接告别
- "再见"
- "拜拜"
- "下次再聊"

### 表示不需要
- "不需要你了"
- "不用了"
- "够了"
- "可以了"

### 结束对话
- "退出"
- "关闭"
- "结束对话"
- "挂断"
- "停止"

### 礼貌告别
- "谢谢你"
- "辛苦了"
- "休息吧"

## 工作流程

1. 用户说出断开命令（如"不需要你了"）
2. 语音助手识别到断开命令
3. 语音助手回复："好的，再见！有需要随时叫我。"
4. 等待1.5秒让用户听到告别语
5. 自动断开语音连接

## 技术实现

### 修改的文件

1. `lib/xiaozhi/voice-commands.ts`
   - 添加了断开命令关键词列表
   - 在 `processVoiceCommand` 函数中添加断开命令检测
   - 在 `VoiceCommandResult` 接口中添加 `shouldDisconnect` 字段
   - 更新 `isSpecialCommand` 函数包含断开命令

2. `components/realtime-voice-orb.tsx`
   - 在用户转录完成事件中添加断开命令检测
   - 当检测到断开命令时，取消AI响应并执行特殊命令处理
   - 如果命令结果包含 `shouldDisconnect` 标志，延迟1.5秒后自动断开
   - 更新系统提示，告知AI不要响应断开命令

### 关键代码逻辑

```typescript
// 检测断开命令
const disconnectKeywords = ['不需要你了', '不用了', '再见', '拜拜', ...];
const isDisconnectCommand = disconnectKeywords.some(keyword => text.toLowerCase().includes(keyword));

// 处理断开命令
if (isDisconnectCommand) {
  return {
    recognized: true,
    action: 'disconnect',
    response: '好的，再见！有需要随时叫我。',
    shouldDisconnect: true,
  };
}

// 在语音助手中执行断开
if (result.shouldDisconnect) {
  setTimeout(() => {
    disconnect();
  }, 1500); // 等待1.5秒让用户听到告别语
}
```

## 用户体验

- 自然流畅：用户可以用自然语言结束对话
- 礼貌回应：语音助手会礼貌地告别
- 智能识别：支持多种表达方式
- 平滑过渡：有足够时间听到告别语后再断开

## 注意事项

- 断开命令是系统级特殊命令，AI不会生成响应
- 断开后用户可以随时点击语音球重新连接
- 断开命令优先级高于其他命令
