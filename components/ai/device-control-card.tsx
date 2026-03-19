"use client"

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Cpu, Zap, Lightbulb, Fan, Droplets, Camera, CheckCircle2, Power, Terminal } from 'lucide-react';

interface DeviceControlCardProps {
  command: any;
  timestamp?: string;
  status?: 'pending' | 'executed' | 'failed';
  className?: string;
}

export function DeviceControlCard({ command, timestamp, status = 'executed', className }: DeviceControlCardProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Determine icon and title based on action/device
  let Icon = Terminal;
  let title = "设备控制指令";
  let deviceName = "system";

  if (command.action === 'toggle_relay') {
    Icon = Power;
    if (command.device === 5) { title = "水泵控制"; Icon = Droplets; deviceName = "water-pump"; }
    else if (command.device === 6) { title = "风扇控制"; Icon = Fan; deviceName = "fan"; }
    else if (command.device === 7) { title = "补光灯电源"; Icon = Zap; deviceName = "grow-light"; }
    else if (command.device === 8) { title = "白灯控制"; Icon = Lightbulb; deviceName = "white-light"; }
  } else if (command.action === 'set_led') {
    title = "RGB补光灯调节";
    Icon = Lightbulb;
    deviceName = "rgb-light";
  } else if (command.action === 'control_camera') {
    title = "云台控制";
    Icon = Camera;
    deviceName = "camera";
  }

  // Format time
  const timeStr = timestamp || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const jsonStr = JSON.stringify(command, null, 2);

  // Typewriter effect
  useEffect(() => {
    let currentIndex = 0;
    setDisplayedText('');
    setIsTyping(true);

    const typingInterval = setInterval(() => {
      if (currentIndex < jsonStr.length) {
        setDisplayedText(jsonStr.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, 20); // 打字速度：20ms per character

    return () => clearInterval(typingInterval);
  }, [jsonStr]);

  // Cursor blink effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 530);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className={cn(
      "w-full max-w-2xl my-4 rounded-xl overflow-hidden shadow-lg font-sans",
      "bg-[#1e1e1e] border border-[#3a3a3a]",
      className
    )}>
      {/* Terminal Toolbar */}
      <div className="flex items-center justify-between h-9 px-4 bg-[#2d2d2d]">
        {/* Traffic Lights */}
        <div className="flex items-center gap-2">
          <button className="w-3 h-3 rounded-full bg-[#ff5f56] hover:brightness-110 transition-all" />
          <button className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:brightness-110 transition-all" />
          <button className="w-3 h-3 rounded-full bg-[#27c93f] hover:brightness-110 transition-all" />
        </div>

        {/* Terminal Title */}
        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <Icon size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold text-white/90">{deviceName}@iot-hub</span>
        </div>

        {/* Status Badge */}
        {status === 'executed' && (
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
            <CheckCircle2 size={12} />
            <span>已执行</span>
          </div>
        )}
      </div>

      {/* Terminal Body */}
      <div className="bg-[#1e1e1e] p-4 min-h-[120px] max-h-[300px] overflow-y-auto font-mono text-sm">
        {/* Command Prompt */}
        <div className="flex items-center mb-2 text-xs">
          <span className="text-[#00ff9c] font-bold">root</span>
          <span className="text-white/50 mx-1">@</span>
          <span className="text-[#0066ff] font-bold">{deviceName}</span>
          <span className="text-white/50 mx-1">:</span>
          <span className="text-[#ff00ff]">~</span>
          <span className="text-white/70 mx-1">$</span>
          <span className="text-white/90">execute</span>
        </div>

        {/* JSON Output with Typewriter Effect */}
        <div className="relative">
          <pre className="text-xs leading-relaxed text-[#00ff9c] whitespace-pre-wrap break-words">
            {displayedText}
            {isTyping && cursorVisible && (
              <span className="inline-block w-2 h-4 bg-white ml-0.5 animate-pulse" />
            )}
          </pre>
        </div>

        {/* Execution Result */}
        {!isTyping && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-400">✓</span>
              <span className="text-white/70">Command executed successfully at {timeStr}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
