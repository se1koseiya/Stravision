"use client"

import { memo, useRef, useState, useCallback, useEffect } from "react"
import { Tooltip } from "antd"
import { cn } from "@/lib/utils"
import { captureScreen } from "@/app/ai-assistant/_utils/screenshot"
import { IconClose, IconEmotionHappy, IconPaperclip, IconPhone, IconScissors, IconVideo } from "@/components/icon";

export interface SendMessageFn {
  (params: { text?: string; file?: File; replyTo?: number }): void
}

interface ChatInputBarProps {
  isMobile: boolean
  isRecording: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onCancelRecording?: () => void
  onSend: SendMessageFn
  onTyping: () => void
}

const ICON_STROKE = 1.75
const TOOL_ICON_SIZE = 22

/* ========== Emoji 数据 ========== */

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "常用",
    emojis: "😀 😂 🤣 😊 😍 🥰 😘 😎 🤔 🤗 😭 😡 🥺 😴 🤯 👍 👎 👏 🙏 💪 🎉 🔥 💯 ❤️ 💔 ✅ ❌".split(" "),
  },
  {
    label: "表情",
    emojis: "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕".split(" "),
  },
  {
    label: "手势",
    emojis: "👍 👎 👊 ✊ 🤛 🤜 👏 🙌 👐 🤲 🙏 🤝 💪 ✌️ 🤞 🤟 🤘 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤙 💪 🦾 🦿 🦵 🦶 👂 👃 🧠 🦷 🦴 👀 👁️ 👅 👄 💋 🩸".split(" "),
  },
  {
    label: "动物",
    emojis: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🦟 🦗 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🐃 🐂 🐄 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🦮 🐈 🐓 🦃 🦚 🦜 🦢 🦩 🕊️ 🐇 🦝 🦨 🦡 🦦 🦥 🐁 🐀 🐿️".split(" "),
  },
  {
    label: "食物",
    emojis: "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🦴 🌭 🍔 🍟 🍕 🥪 🥙 🧆 🌮 🌯 🫔 🥗 🥘 🫕 🥫 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍙 🍚 🍘 🍥 🥠 🍮 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯".split(" "),
  },
  {
    label: "活动",
    emojis: "⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🎣 🤿 🎽 🎿 🛷 🥌 🎯 🪀 🎮 🕹️ 🎲 🧩 🎀 🎗️ 🎫 🎖️ 🏆 🥇 🥈 🥉 ⚖️ 🎵 🎶 🎼 🎤 🎧 🎺 🎷 🎸 🎹 🎻 🥁 🪘 🎬 🎥 📸 📹 🎞️ 💿 📀 📻 📺 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 💽 💾 💿 📼 🧮 🔬 🔭 📡".split(" "),
  },
  {
    label: "旅行",
    emojis: "🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🚚 🚛 🚜 🦯 🦽 🦼 🛴 🚲 🛵 🏍️ 🛺 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩️ 💺 🛰️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ ⛽ 🚧 🚦 🚥 🚏 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ ⛺ 🌄 🌅 🌠 🎇 🎆 🌇🌆 🏙️ 🌃 🌌 🌉 🌁".split(" "),
  },
  {
    label: "物品",
    emojis: "⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 🕹️ 🗜️ 💽 💾 💿 📼 📷 📸 📹 🎥 📽️ 🎞️ 📞 ☎️ 📟 📠 📺 📻 🎙️ 🎚️ 🎛️ 🧭 ⏱️ ⏲️ ⏰ 🕰️ ⌛ ⏳ 📡 🔋 🔌 💡 🔦 🕯️ 🪔 🧯 🛢️ 💸 💵 💴 💶 💷 🪙 💰 💳 💎 ⚖️ 🪜 🧰 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪓 🪚 🔩 ⚙️ 🪤 🧱 ⛓️ 🧲 🔫 💣 🧨 🪓 🔪 🗡️ ⚔️ 🛡️ 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 💈".split(" "),
  },
  {
    label: "符号",
    emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤".split(" "),
  },
]

/* ========== 主组件 ========== */

function ChatInputBarInner({
  isMobile: _isMobile,
  isRecording,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onSend,
  onTyping
}: ChatInputBarProps) {
  const [text, setText] = useState("")
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState(0)
  const [capturing, setCapturing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiPanelRef = useRef<HTMLDivElement>(null)
  const emojiBtnRef = useRef<HTMLButtonElement>(null)
  // 用 ref 保存最新 text，避免 insertEmoji 依赖 text 导致频繁重建
  const textRef = useRef("")
  useEffect(() => { textRef.current = text }, [text])

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend({ text: trimmed })
    setText("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [text, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    onTyping()
    const el = e.target
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 120) + "px"
  }

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onSend({ file })
    }
    e.target.value = ""
  }

  /**
   * 粘贴发图（2026-10-22）：截图后直接 Ctrl+V 是最常用的发图方式，
   * 旧实现只能点回形针选文件。这里抓 clipboard 里的 file 型 item。
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.kind !== "file") continue
      const file = item.getAsFile()
      if (!file) continue
      e.preventDefault()
      onSend({ file })
      return
    }
  }

  // 在光标位置插入 emoji（无依赖，稳定引用）
  const insertEmoji = useCallback((emoji: string) => {
    const el = textareaRef.current
    if (!el) {
      setText((prev) => prev + emoji)
      return
    }
    const start = el.selectionStart ?? textRef.current.length
    const end = el.selectionEnd ?? textRef.current.length
    const newText = textRef.current.slice(0, start) + emoji + textRef.current.slice(end)
    setText(newText)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + emoji.length, start + emoji.length)
    })
  }, [])

  // 点击外部关闭 emoji 面板
  useEffect(() => {
    if (!emojiOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        emojiPanelRef.current?.contains(target) ||
        emojiBtnRef.current?.contains(target)
      ) return
      setEmojiOpen(false)
    }
    // 延迟绑定，避免打开时的同一个 click 事件立即关闭
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("mousedown", handler)
    }
  }, [emojiOpen])

  // 截图（实现收敛到 app/ai-assistant/_utils/screenshot.ts，与工作台侧栏同源）
  const handleScreenshot = useCallback(async () => {
    setCapturing(true)
    const res = await captureScreen()
    setCapturing(false)
    if (res.ok) onSend({ file: res.file })
    else if (res.reason === "unsupported") alert("当前浏览器不支持截图功能，请使用 Chrome / Edge 浏览器")
    else if (res.reason === "failed") alert("截图失败，请重试")
    // cancelled：用户自己取消的，静默
  }, [onSend])

  const toggleRecording = () => {
    if (isRecording) {
      onStopRecording()
    } else {
      onStartRecording()
    }
  }

  return (
    <div className="shrink-0 bg-br-surface-2 relative">
      {/* Emoji 浮动面板 */}
      {emojiOpen && (
        <div
          ref={emojiPanelRef}
          className="absolute bottom-full left-4 mb-2 z-50 bg-br-surface rounded-xl shadow-br-lg border border-br-line p-2"
        >
          {/* Emoji 网格 */}
          <div className="w-[340px] h-[200px] overflow-y-auto px-1" data-lenis-prevent>
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertEmoji(emoji)}
                  className="size-9 flex items-center justify-center rounded-lg hover:bg-br-surface-4 transition-colors text-[20px] leading-none"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          {/* 分类标签 */}
          <div className="flex items-center gap-1 pt-2 mt-1">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.label}
                onClick={() => setEmojiCategory(i)}
                className={cn(
                  "px-2 py-1 rounded-lg text-[12px] transition-colors",
                  emojiCategory === i
                    ? "bg-br-brand-soft text-br-brand-ink"
                    : "text-br-text-3 hover:bg-br-surface-3"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 pt-2.5">
        {/* 左工具：表情 / 附件 / 剪刀 */}
        <div className="flex items-center gap-4">
          <ToolIconButton
            title="表情"
            active={emojiOpen}
            btnRef={emojiBtnRef}
            onClick={() => setEmojiOpen(prev => !prev)}
          >
            <IconEmotionHappy size={TOOL_ICON_SIZE} strokeWidth={ICON_STROKE} />
          </ToolIconButton>
          <ToolIconButton title="发送文件/图片" onClick={() => fileInputRef.current?.click()}>
            <IconPaperclip size={TOOL_ICON_SIZE} strokeWidth={ICON_STROKE} />
          </ToolIconButton>
          <ToolIconButton title="截图" onClick={handleScreenshot} loading={capturing}>
            <IconScissors size={TOOL_ICON_SIZE} strokeWidth={ICON_STROKE} />
          </ToolIconButton>
        </div>

        {/* 右工具：电话 / 视频 */}
        <div className="flex items-center gap-4">
          <ToolIconButton title="语音通话">
            <IconPhone size={TOOL_ICON_SIZE} strokeWidth={ICON_STROKE} />
          </ToolIconButton>
          <ToolIconButton title="视频通话">
            <IconVideo size={TOOL_ICON_SIZE} strokeWidth={ICON_STROKE} />
          </ToolIconButton>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={handleFilePick}
        />
      </div>

      {/* 输入区 */}
      <div className="px-4 pt-1.5 pb-3">
        {isRecording ? (
          <div className="flex items-center gap-3 h-10 px-3 rounded-lg bg-br-surface-3">
            <span className="flex items-center gap-1.5 text-br-danger text-[13px]">
              <span className="size-2 rounded-full bg-br-danger animate-pulse" />
              录音中...
            </span>
            <button
              onClick={onCancelRecording}
              className="ml-auto size-7 flex items-center justify-center rounded-full hover:bg-br-surface-4 text-br-text-3"
            >
              <IconClose size={16} />
            </button>
            <button
              onClick={toggleRecording}
              className="size-7 flex items-center justify-center rounded-full bg-br-danger text-white"
            >
              <span className="size-2.5 rounded-full bg-br-surface" />
            </button>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="输入消息…（Enter 发送，Shift+Enter 换行，可直接粘贴图片）"
            rows={1}
            className="w-full resize-none bg-transparent border-0 outline-none text-[14px] text-br-text-1 placeholder:text-br-text-3 leading-6 py-1 max-h-[120px]"
          />
        )}
      </div>
    </div>
  )
}

function ToolIconButton({
  title, onClick, children, active, loading, btnRef
}: {
  title: string
  onClick?: () => void
  children: React.ReactNode
  active?: boolean
  loading?: boolean
  btnRef?: React.RefObject<HTMLButtonElement | null>
}) {
  return (
    <Tooltip title={loading ? "截图中..." : title}>
      <button
        ref={btnRef}
        onClick={onClick}
        disabled={loading}
        className={cn(
          "size-8 flex items-center justify-center rounded-full transition-colors",
          active
            ? "text-br-brand-ink bg-br-brand-soft"
            : "text-br-text-2 hover:text-br-text-1 hover:bg-br-surface-3",
          loading && "opacity-50 cursor-wait"
        )}
      >
        {children}
      </button>
    </Tooltip>
  )
}

export const ChatInputBar = memo(ChatInputBarInner)
