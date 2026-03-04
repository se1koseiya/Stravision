// components/xiaozhi/XiaozhiPanel.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, Send, Minimize2, Radio, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

interface XiaozhiPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  status: "idle" | "connecting" | "listening" | "processing" | "speaking" | "error";
  onSendMessage: (text: string) => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
}

export function XiaozhiPanel({
  isOpen,
  onClose,
  messages,
  status,
  onSendMessage,
  onStartVoice,
  onStopVoice,
}: XiaozhiPanelProps) {
  const [inputValue, setInputValue] = React.useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 40, filter: "blur(20px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.8, y: 40, filter: "blur(20px)" }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className={cn(
            "fixed bottom-[110px] right-8 w-[380px] h-[520px] z-50 flex flex-col overflow-hidden",
            "rounded-[32px] border border-white/20 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)]",
            "bg-white/10 dark:bg-black/30 backdrop-blur-[40px] saturate-150"
          )}
        >
          {/* Header - Vision Pro Style */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shadow-inner",
                "bg-gradient-to-br from-white/20 to-white/5 border border-white/10"
              )}>
                <Sparkles className="w-4 h-4 text-white drop-shadow-md" />
              </div>
              <div>
                <h3 className="font-semibold text-white/90 text-base leading-tight">莓小智</h3>
                <p className="text-[10px] font-medium text-white/50 tracking-wide uppercase">AI Assistant</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors" 
              onClick={onClose}
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-2" ref={scrollRef}>
            <div className="space-y-6 pt-4 pb-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-[300px] text-white/30 space-y-4">
                   <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                     <Sparkles className="w-8 h-8 opacity-50" />
                   </div>
                   <p className="text-sm font-light">“你好，我是莓小智，我可以帮你管理大棚。”</p>
                </div>
              )}
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex w-full",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-5 py-3 text-sm leading-relaxed shadow-sm backdrop-blur-md",
                      msg.role === "user"
                        ? "bg-white/20 text-white rounded-[20px] rounded-tr-sm border border-white/10"
                        : "bg-black/20 text-white/90 rounded-[20px] rounded-tl-sm border border-white/5"
                    )}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              
              {/* Typing Indicator */}
              {(status === 'processing' || status === 'speaking') && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 pl-4"
                >
                  <div className="flex gap-1">
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-2 h-2 rounded-full bg-white/40" />
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 rounded-full bg-white/40" />
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 rounded-full bg-white/40" />
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Status Bar & Controls */}
          <div className="p-4 bg-gradient-to-t from-black/40 to-transparent">
             {/* Status Text */}
             <div className="flex items-center justify-center mb-3">
                <span className={cn(
                  "text-xs font-medium px-3 py-1 rounded-full backdrop-blur-md transition-colors duration-500",
                  status === 'listening' ? "bg-red-500/20 text-red-200 border border-red-500/30" :
                  status === 'speaking' ? "bg-green-500/20 text-green-200 border border-green-500/30" :
                  status === 'processing' ? "bg-blue-500/20 text-blue-200 border border-blue-500/30" :
                  "bg-white/10 text-white/50 border border-white/5"
                )}>
                  {status === 'listening' && "正在聆听..."}
                  {status === 'processing' && "思考中..."}
                  {status === 'speaking' && "正在回复..."}
                  {status === 'idle' && "等待唤醒"}
                </span>
             </div>

             {/* Input Area - Glass Capsule */}
             <div className="relative flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-[24px] p-1.5 pr-2 shadow-lg">
                <Button
                  size="icon"
                  className={cn(
                    "rounded-full h-9 w-9 transition-all duration-300 shadow-sm",
                    status === 'listening' 
                      ? "bg-red-500/80 hover:bg-red-500 text-white animate-pulse" 
                      : "bg-white/10 hover:bg-white/20 text-white"
                  )}
                  onClick={status === 'listening' ? onStopVoice : onStartVoice}
                >
                  {status === 'listening' ? <Radio className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息..."
                  className="flex-1 h-9 bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-white/30"
                />
                
                <Button 
                  size="icon" 
                  onClick={handleSend} 
                  disabled={!inputValue.trim()} 
                  className={cn(
                    "h-8 w-8 rounded-full transition-all",
                    inputValue.trim() 
                      ? "bg-white text-black hover:bg-white/90" 
                      : "bg-white/5 text-white/20"
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
