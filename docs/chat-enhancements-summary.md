# Chat 功能增强总结

## 新增组件

### 1. ImagePreviewDialog (图片预览)
**文件**: `components/chat/image-preview-dialog.tsx`

**功能**:
- 点击图片消息可放大查看
- 支持缩放（放大/缩小）
- 支持下载图片
- 优雅的黑色背景和动画效果

**使用方法**:
```tsx
const [previewImage, setPreviewImage] = useState<string | null>(null)

// 在消息渲染中
{msg.type === 'image' && (
  <img 
    src={msg.file_url} 
    onClick={() => setPreviewImage(msg.file_url)}
    className="cursor-pointer hover:opacity-90"
  />
)}

<ImagePreviewDialog
  open={!!previewImage}
  onOpenChange={(open) => !open && setPreviewImage(null)}
  imageUrl={previewImage || ''}
/>
```

### 2. MessageContextMenu (消息右键菜单)
**文件**: `components/chat/message-context-menu.tsx`

**功能**:
- 右键点击消息显示菜单
- 复制消息内容
- 撤回消息（2分钟内，仅自己的消息）
- 自动判断是否可撤回

**使用方法**:
```tsx
<MessageContextMenu
  message={msg}
  isMe={isMe}
  onRecall={handleRecallMessage}
  onCopy={(content) => console.log('Copied:', content)}
>
  <div className="message-bubble">
    {msg.content}
  </div>
</MessageContextMenu>
```

### 3. MessageSearchDialog (消息搜索)
**文件**: `components/chat/message-search-dialog.tsx`

**功能**:
- 搜索历史消息
- 高亮显示匹配的关键词
- 点击搜索结果跳转到对应消息
- 实时搜索过滤

**使用方法**:
```tsx
const [showSearch, setShowSearch] = useState(false)

<MessageSearchDialog
  open={showSearch}
  onOpenChange={setShowSearch}
  messages={messages}
  onSelectMessage={(msgId) => {
    // 滚动到对应消息
    document.getElementById(`msg-${msgId}`)?.scrollIntoView()
  }}
/>
```

## 集成到现有聊天页面

### 步骤 1: 导入组件
```tsx
import { ImagePreviewDialog } from "@/components/chat/image-preview-dialog"
import { MessageContextMenu } from "@/components/chat/message-context-menu"
import { MessageSearchDialog } from "@/components/chat/message-search-dialog"
```

### 步骤 2: 添加状态
```tsx
const [previewImage, setPreviewImage] = useState<string | null>(null)
const [showSearch, setShowSearch] = useState(false)
```

### 步骤 3: 实现撤回功能
```tsx
const handleRecallMessage = async (messageId: number) => {
  try {
    const res = await fetch(`/api/messages/${messageId}`, {
      method: 'DELETE'
    })
    if (res.ok) {
      setMessages(prev => prev.filter(m => m.id !== messageId))
      toast.success("消息已撤回")
    }
  } catch (error) {
    toast.error("撤回失败")
  }
}
```

### 步骤 4: 更新消息渲染
```tsx
{displayMessages.map((msg) => {
  const isMe = msg.sender_id === currentUser?.id
  
  return (
    <MessageContextMenu
      key={msg.id}
      message={msg}
      isMe={isMe}
      onRecall={handleRecallMessage}
    >
      <div id={`msg-${msg.id}`} className="message-container">
        {msg.type === 'image' ? (
          <img
            src={msg.file_url}
            onClick={() => setPreviewImage(msg.file_url)}
            className="cursor-pointer hover:opacity-90 transition-opacity"
          />
        ) : (
          <div>{msg.content}</div>
        )}
      </div>
    </MessageContextMenu>
  )
})}
```

### 步骤 5: 添加搜索按钮
```tsx
<Button
  size="icon"
  variant="ghost"
  onClick={() => setShowSearch(true)}
>
  <Search className="h-5 w-5" />
</Button>
```

## 需要的 API 端点

### 撤回消息
```typescript
// app/api/messages/[id]/route.ts
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const messageId = parseInt(params.id)
  // 验证消息所有权和时间限制
  // 删除消息或标记为已撤回
  return Response.json({ success: true })
}
```

## 性能优化建议

1. **虚拟滚动**: 对于超过100条消息的聊天，使用虚拟滚动
2. **消息分页**: 按需加载历史消息
3. **图片懒加载**: 使用 `loading="lazy"` 属性
4. **WebSocket**: 替代轮询实现实时通信

## 下一步改进

- [ ] 消息引用回复
- [ ] @提及功能
- [ ] 消息转发
- [ ] 聊天置顶
- [ ] 消息已读回执
- [ ] 在线状态显示
- [ ] 语音消息转文字
- [ ] 消息加密
