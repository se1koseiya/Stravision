'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Zap, CheckCircle, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  agentId: string;
  agentName: string;
  agentType: 'planner' | 'executor' | 'validator' | 'coordinator' | 'user';
  content: string;
  timestamp: number;
  status?: 'thinking' | 'sent';
}

const AGENT_CONFIG = {
  planner: {
    icon: Brain,
    color: 'bg-blue-500',
    name: '规划器',
  },
  executor: {
    icon: Zap,
    color: 'bg-green-500',
    name: '执行器',
  },
  validator: {
    icon: CheckCircle,
    color: 'bg-purple-500',
    name: '验证器',
  },
  coordinator: {
    icon: Bot,
    color: 'bg-orange-500',
    name: '协调器',
  },
  user: {
    icon: User,
    color: 'bg-gray-500',
    name: '用户',
  },
};

export function AgentCollaborationChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      agentId: 'user',
      agentName: '用户',
      agentType: 'user',
      content: '帮我分析一下当前大棚的环境状况，并给出优化建议',
      timestamp: Date.now() - 10000,
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // 模拟 Agent 协作
    if (messages.length === 1 && !isProcessing) {
      setIsProcessing(true);
      simulateAgentCollaboration();
    }
  }, [messages, isProcessing]);

  const simulateAgentCollaboration = async () => {
    const agentMessages: Omit<Message, 'id'>[] = [
      {
        agentId: 'planner',
        agentName: '任务规划器',
        agentType: 'planner',
        content: '收到任务。我将把这个任务分解为以下步骤：\n1. 获取当前环境数据\n2. 分析数据趋势\n3. 生成优化建议\n4. 验证建议的可行性',
        timestamp: Date.now(),
      },
      {
        agentId: 'executor',
        agentName: '数据执行器',
        agentType: 'executor',
        content: '正在获取环境数据...\n\n✓ 温度: 25.3°C\n✓ 湿度: 68%\n✓ 光照: 45000 lux\n✓ CO2: 420 ppm\n\n数据获取完成，传递给分析器。',
        timestamp: Date.now(),
      },
      {
        agentId: 'planner',
        agentName: '分析规划器',
        agentType: 'planner',
        content: '基于数据分析：\n\n📊 温度偏高（建议23-24°C）\n📊 湿度适中（理想范围）\n📊 光照充足\n📊 CO2浓度正常\n\n建议：降低温度2度，可以提高草莓品质。',
        timestamp: Date.now(),
      },
      {
        agentId: 'validator',
        agentName: '建议验证器',
        agentType: 'validator',
        content: '验证优化建议...\n\n✓ 温度调整范围合理\n✓ 不会影响其他参数\n✓ 符合草莓生长最佳条件\n✓ 预计能耗增加5%（可接受）\n\n建议可行，推荐执行。',
        timestamp: Date.now(),
      },
      {
        agentId: 'coordinator',
        agentName: '协调器',
        agentType: 'coordinator',
        content: '📋 任务总结：\n\n经过多 Agent 协作分析，建议将大棚温度从25.3°C降低到23.5°C。\n\n执行方式：\n• 增加通风频率\n• 调整遮阳网开度\n• 优化喷雾降温\n\n预期效果：\n• 提高草莓品质\n• 降低病害风险\n• 能耗增加可控\n\n是否执行此优化方案？',
        timestamp: Date.now(),
      },
    ];

    for (const msg of agentMessages) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setMessages(prev => [
        ...prev,
        {
          ...msg,
          id: `msg-${Date.now()}`,
          timestamp: Date.now(),
        },
      ]);
    }
    
    setIsProcessing(false);
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="h-4 w-4" />
          Agent 协作对话
          {isProcessing && (
            <Badge variant="secondary" className="ml-auto">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2" />
              处理中
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message, index) => {
                const config = AGENT_CONFIG[message.agentType];
                const Icon = config.icon;
                const isUser = message.agentType === 'user';
                
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.1 }}
                    className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <Avatar className={`${config.color} flex-shrink-0`}>
                      <AvatarFallback className="bg-transparent">
                        <Icon className="h-4 w-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Message */}
                    <div className={`flex-1 ${isUser ? 'flex flex-col items-end' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">{message.agentName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString('zh-CN')}
                        </span>
                      </div>
                      
                      <div
                        className={`rounded-lg p-3 max-w-[80%] ${
                          isUser
                            ? 'bg-blue-500 text-white'
                            : 'bg-muted text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      
                      {message.status === 'thinking' && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span>思考中...</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
