# Chat 页面改进方案

## 当前功能
- ✅ 好友聊天
- ✅ 群组聊天  
- ✅ 好友请求
- ✅ 文件上传（图片、音频）
- ✅ 语音录制
- ✅ 表情和贴纸
- ✅ 输入状态显示
- ✅ 移动端适配

## 发现的问题

### 1. 性能问题
- 轮询频率过高（消息3秒、数据10秒）
- 没有使用 WebSocket 实时通信
- 消息列表可能导致内存泄漏

### 2. 用户体验问题
- 缺少消息发送失败重试
- 没有离线消息提示
- 缺少消息撤回功能
- 没有@提及功能
- 缺少消息搜索

### 3. 功能缺失
- 没有消息已读回执
- 缺少文件预览
- 没有消息转发
- 缺少聊天置顶
- 没有消息通知

## 建议的改进功能

### 高优先级
1. **WebSocket 实时通信** - 替代轮询
2. **消息已读状态** - 显示已读/未读
3. **消息撤回** - 2分钟内可撤回
4. **图片预览** - 点击放大查看
5. **消息搜索** - 搜索历史消息

### 中优先级
6. **@提及功能** - 群聊中@某人
7. **消息转发** - 转发到其他聊天
8. **聊天置顶** - 重要聊天置顶
9. **消息通知** - 浏览器通知
10. **在线状态** - 显示用户在线/离线

### 低优先级
11. **消息引用回复** - 引用某条消息回复
12. **语音消息转文字** - ASR转写
13. **消息加密** - 端到端加密
14. **聊天记录导出** - 导出为文件
15. **群公告** - 群组公告功能

## 实现建议

### WebSocket 集成
```typescript
// 使用现有的 ws-server.js
const ws = new WebSocket('ws://localhost:3001')

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.type === 'new_message') {
    setMessages(prev => [...prev, data.message])
  }
}
```

### 消息已读回执
```typescript
const markAsRead = async (messageId: number) => {
  await fetch(`/api/messages/${messageId}/read`, { method: 'POST' })
}
```

### 消息撤回
```typescript
const recallMessage = async (messageId: number) => {
  const message = messages.find(m => m.id === messageId)
  if (Date.now() - message.created_at < 120000) { // 2分钟内
    await fetch(`/api/messages/${messageId}`, { method: 'DELETE' })
  }
}
```

### 图片预览
```typescript
const [previewImage, setPreviewImage] = useState<string | null>(null)

// 在消息渲染中
{msg.type === 'image' && (
  <img 
    src={msg.file_url} 
    onClick={() => setPreviewImage(msg.file_url)}
    className="cursor-pointer"
  />
)}
```

### 消息搜索
```typescript
const [searchResults, setSearchResults] = useState<Message[]>([])

const searchMessages = async (query: string) => {
  const res = await fetch(`/api/messages/search?q=${query}&friendId=${activeFriend?.id}`)
  const data = await res.json()
  setSearchResults(data.messages)
}
```

## 下一步行动
1. 修复现有bug（如果有）
2. 实现 WebSocket 实时通信
3. 添加消息已读状态
4. 实现消息撤回功能
5. 添加图片预览功能
