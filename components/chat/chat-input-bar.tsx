"use client"

import { memo, useRef, useState, useCallback, useEffect } from "react"
import { Tooltip } from "antd"
import { Smile, Paperclip, Scissors, Phone, Video, X } from "lucide-react"
import { cn } from "@/lib/utils"

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

/* ========== 截图工具 ========== */

async function captureScreenshot(): Promise<File | null> {
  try {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert("当前浏览器不支持截图功能，请使用 Chrome / Edge 浏览器")
      return null
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "always" } as MediaTrackConstraints,
      audio: false,
    })

    const track = stream.getVideoTracks()[0]
    const video = document.createElement("video")
    video.srcObject = stream
    video.muted = true

    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        video.play().then(() => resolve())
      }
    })

    // 等待一帧确保画面就绪
    await new Promise((r) => requestAnimationFrame(r))
    await new Promise((r) => setTimeout(r, 200))

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(video, 0, 0)

    track.stop()
    stream.getTracks().forEach((t) => t.stop())

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    )
    if (!blob) return null

    return new File([blob], `screenshot-${Date.now()}.png`, { type: "image/png" })
  } catch (e) {
    // 用户取消或权限拒绝
    return null
  }
}

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

  // 截图
  const handleScreenshot = useCallback(async () => {
    setCapturing(true)
    const file = await captureScreenshot()
    setCapturing(false)
    if (file) {
      onSend({ file })
    }
  }, [onSend])

  const toggleRecording = () => {
    if (isRecording) {
      onStopRecording()
    } else {
      onStartRecording()
    }
  }

  return (
    <div className="shrink-0 bg-white border-t border-black/[0.06] relative">
      {/* Emoji 浮动面板 */}
      {emojiOpen && (
        <div
          ref={emojiPanelRef}
          className="absolute bottom-full left-4 mb-2 z-50 bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-black/[0.06] p-2"
        >
          {/* Emoji 网格 */}
          <div className="w-[340px] h-[200px] overflow-y-auto px-1" data-lenis-prevent>
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertEmoji(emoji)}
                  className="size-9 flex items-center justify-center rounded-lg hover:bg-black/[0.06] transition-colors text-[20px] leading-none"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          {/* 分类标签 */}
          <div className="flex items-center gap-1 border-t border-black/[0.06] pt-1.5 mt-1">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.label}
                onClick={() => setEmojiCategory(i)}
                className={cn(
                  "px-2 py-1 rounded-md text-[12px] transition-colors",
                  emojiCategory === i
                    ? "bg-[#e6f4ff] text-[#1677ff]"
                    : "text-[rgba(0,0,0,0.5)] hover:bg-black/[0.04]"
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
            <Smile size={TOOL_ICON_SIZE} strokeWidth={ICON_STROKE} />
          </ToolIconButton>
          <ToolIconButton title="发送文件/图片" onClick={() => fileInputRef.current?.click()}>
            <Paperclip size={TOOL_ICON_SIZE} strokeWidth={ICON_STROKE} />
          </ToolIconButton>
          <ToolIconButton title="截图" onClick={handleScreenshot} loading={capturing}>
            <Scissors size={TOOL_ICON_SIZE} strokeWidth={ICON_STROKE} />
          </ToolIconButton>
        </div>

        {/* 右工具：电话 / 视频 */}
        <div className="flex items-center gap-4">
          <ToolIconButton title="语音通话">
            <Phone size={TOOL_ICON_SIZE} strokeWidth={ICON_STROKE} />
          </ToolIconButton>
          <ToolIconButton title="视频通话">
            <Video size={TOOL_ICON_SIZE} strokeWidth={ICON_STROKE} />
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
          <div className="flex items-center gap-3 h-10 px-3 rounded-lg bg-[#f5f5f5]">
            <span className="flex items-center gap-1.5 text-[#ff4d4f] text-[13px]">
              <span className="size-2 rounded-full bg-[#ff4d4f] animate-pulse" />
              录音中...
            </span>
            <button
              onClick={onCancelRecording}
              className="ml-auto size-7 flex items-center justify-center rounded-full hover:bg-black/[0.06] text-[rgba(0,0,0,0.45)]"
            >
              <X size={16} />
            </button>
            <button
              onClick={toggleRecording}
              className="size-7 flex items-center justify-center rounded-full bg-[#ff4d4f] text-white"
            >
              <span className="size-2.5 rounded-full bg-white" />
            </button>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            rows={1}
            className="w-full resize-none bg-transparent border-0 outline-none text-[14px] text-[rgba(0,0,0,0.88)] placeholder:text-[rgba(0,0,0,0.3)] leading-6 py-1 max-h-[120px]"
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
            ? "text-[#1677ff] bg-[#e6f4ff]"
            : "text-[rgba(0,0,0,0.55)] hover:text-[rgba(0,0,0,0.8)] hover:bg-black/[0.04]",
          loading && "opacity-50 cursor-wait"
        )}
      >
        {children}
      </button>
    </Tooltip>
  )
}

export const ChatInputBar = memo(ChatInputBarInner)
