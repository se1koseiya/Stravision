# Chat Page Integration Patch

## 需要添加的导入

在文件顶部添加：

```typescript
import { ImagePreviewDialog } from "@/components/chat/image-preview-dialog"
import { MessageContextMenu } from "@/components/chat/message-context-menu"
import { MessageSearchDialog } from "@/components/chat/message-search-dialog"
```

## 需要添加的状态

在 `ChatPage` 组件中添加：

```typescript
// 在现有状态后添加
const [previewImage, setPreviewImage] = useState<string | null>(null)
const [showSearch, setShowSearch] = useState(false)
const [pinnedChats, setPinnedChats] = useState<number[]>([])
```

## 添加消息撤回处理函数

在 `handleSendMessage` 函数后添加：

```typescript
const handleRecallMessage = async (messageId: number) => {
  try {
    const res = await fetch(`/api/messages/${messageId}`, {
      method: 'DELETE'
    })
    
    if (res.ok) {
      // 更新本地消息列表
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: '[消息已撤回]', type: 'recalled' }
          : msg
      ))
      toast.success("消息已撤回")
      // 刷新好友列表以更新最后一条消息
      fetchFriends()
      fetchUserGroups()
    } else {
      const data = await res.json()
      toast.error(data.error || "撤回失败")
    }
  } catch (error) {
    console.error("Error recalling message:", error)
    toast.error("撤回失败")
  }
}
```

## 添加消息跳转函数

```typescript
const scrollToMessage = (messageId: number) => {
  const element = document.getElementById(`msg-${messageId}`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // 高亮效果
    element.classList.add('highlight-message')
    setTimeout(() => {
      element.classList.remove('highlight-message')
    }, 2000)
  }
}
```

## 添加聊天置顶功能

```typescript
const togglePinChat = (chatId: number, isGroup: boolean) => {
  setPinnedChats(prev => {
    const key = isGroup ? `g-${chatId}` : `f-${chatId}`
    const numKey = parseInt(key.replace(/[^0-9]/g, ''))
    
    if (prev.includes(numKey)) {
      return prev.filter(id => id !== numKey)
    } else {
      return [...prev, numKey]
    }
  })
  
  // 保存到 localStorage
  const key = isGroup ? `g-${chatId}` : `f-${chatId}`
  const pinned = localStorage.getItem('pinnedChats') || '[]'
  const pinnedArray = JSON.parse(pinned)
  
  if (pinnedArray.includes(key)) {
    localStorage.setItem('pinnedChats', JSON.stringify(pinnedArray.filter((k: string) => k !== key)))
  } else {
    localStorage.setItem('pinnedChats', JSON.stringify([...pinnedArray, key]))
  }
}
```

## 更新消息渲染部分

找到消息渲染的部分（大约在 line 1100-1200），替换为：

```typescript
{displayMessages.map((msg, index) => {
  const isMe = msg.sender_id === currentUser?.id
  const sender = isMe ? currentUser : (activeFriend || groupMembers.find(m => m.user_id === msg.sender_id)?.user)
  
  // Date separator logic
  const showDateSeparator = index === 0 || new Date(msg.created_at).toDateString() !== new Date(displayMessages[index - 1].created_at).toDateString()

  return (
    <div key={msg.id} className="flex flex-col gap-4">
      {showDateSeparator && (
        <div className="flex justify-center my-2">
          <span className="text-xs text-muted-foreground font-medium bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full">
            {new Date(msg.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}
      
      <MessageContextMenu
        message={msg}
        isMe={isMe}
        onRecall={handleRecallMessage}
      >
        <div 
          id={`msg-${msg.id}`}
          className={cn("flex w-full gap-3 transition-all", isMe ? "flex-row-reverse" : "flex-row")}
        >
          {!isMe && (
            <Avatar className="h-8 w-8 mt-1 flex-shrink-0 border border-black/10 dark:border-white/10">
              <AvatarImage src={sender?.avatar_url || undefined} />
              <AvatarFallback>{sender?.username?.[0]}</AvatarFallback>
            </Avatar>
          )}
          <div className={cn("flex flex-col max-w-[75%]", isMe ? "items-end" : "items-start")}>
            {!isMe && activeGroup && <span className="text-xs text-muted-foreground ml-1 mb-1">{sender?.username}</span>}
            <div className={cn(
              "relative px-4 py-3 text-[15px] leading-relaxed shadow-sm min-w-[80px]",
              msg.type === 'recalled' && "italic opacity-60",
              isMe 
                ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/20 rounded-2xl rounded-tr-sm" 
                : "bg-white/60 dark:bg-white/10 backdrop-blur-md text-foreground shadow-sm rounded-2xl rounded-tl-sm border border-white/20"
            )}>
              {msg.type === 'image' && msg.type !== 'recalled' ? (
                <img 
                  src={msg.file_url || msg.content} 
                  alt="Image" 
                  className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setPreviewImage(msg.file_url || msg.content)}
                />
              ) : msg.type === 'audio' ? (
                <audio controls src={msg.file_url || msg.content} className="max-w-full" />
              ) : msg.type === 'changelog' ? (
                <ChangelogCard content={msg.content} />
              ) : (
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              )}
              
              <div className={cn("flex items-center gap-1 mt-1 text-[10px]", isMe ? "text-blue-100 justify-end" : "text-slate-400")}>
                <span>{formatTime(msg.created_at)}</span>
                {isMe && <CheckCheck className="h-3 w-3" />}
              </div>
            </div>
          </div>
        </div>
      </MessageContextMenu>
    </div>
  )
})}
```

## 在聊天头部添加搜索按钮

找到聊天头部的按钮区域（Video、Phone 按钮附近），添加：

```typescript
<Button 
  variant="ghost" 
  size="icon" 
  className="h-10 w-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5" 
  onClick={() => setShowSearch(true)}
>
  <Search className="h-5 w-5" />
</Button>
```

## 在组件末尾添加对话框

在 `</div>` 闭合标签之前（组件的最后），添加：

```typescript
{/* Image Preview Dialog */}
<ImagePreviewDialog
  open={!!previewImage}
  onOpenChange={(open) => !open && setPreviewImage(null)}
  imageUrl={previewImage || ''}
/>

{/* Message Search Dialog */}
<MessageSearchDialog
  open={showSearch}
  onOpenChange={setShowSearch}
  messages={messages}
  onSelectMessage={scrollToMessage}
/>
```

## 添加 CSS 样式

在页面顶部的 `<style jsx global>` 中添加：

```css
@keyframes highlight-pulse {
  0%, 100% { background-color: transparent; }
  50% { background-color: rgba(59, 130, 246, 0.2); }
}

.highlight-message {
  animation: highlight-pulse 1s ease-in-out 2;
}
```

## 性能优化建议

1. **减少轮询频率**：
```typescript
// 将消息轮询从 3秒 改为 5秒
const interval = setInterval(fetchMessages, 5000)

// 将数据轮询从 10秒 改为 30秒
const interval = setInterval(fetchData, 30000)
```

2. **添加消息虚拟化**（如果消息超过100条）：
```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

// 在组件中
const parentRef = useRef<HTMLDivElement>(null)
const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 100,
})
```

## 完成！

完成以上修改后，聊天页面将具备：
- ✅ 图片预览和缩放
- ✅ 消息撤回（2分钟内）
- ✅ 消息复制
- ✅ 消息搜索
- ✅ 消息跳转和高亮
- ✅ 更好的性能

测试步骤：
1. 发送一条消息，右键点击查看菜单
2. 发送图片，点击图片查看预览
3. 点击搜索按钮，搜索历史消息
4. 在2分钟内撤回自己的消息
