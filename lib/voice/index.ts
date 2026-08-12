/**
 * 语音控制器统一入口（纯 Omni 架构）
 *
 * 直接使用阿里云实时全模态模型（Qwen-Omni-Realtime 系列），
 * ASR + LLM + TTS 一体化，低延迟、支持语音打断。
 *
 * UI 层通过 VoiceController 契约使用，无需感知底层协议。
 */

"use client";

import { useEffect } from "react";
import type { VoiceController, VoiceControllerOptions } from "./voice-types";
import { getVoiceConfig, initBackendConfig } from "./voice-config";
import { useVoiceOmni } from "./use-voice-omni";

export function useVoiceController(options: VoiceControllerOptions): VoiceController {
  // 纯 Omni 架构：始终启用一体化实时模型，autoConnect 由 Hook 内部处理
  const config = getVoiceConfig();
  const controller = useVoiceOmni({ ...options, config, enabled: true });

  // 首次挂载时异步拉取后端 admin 配置（仅当 localStorage 未保存用户偏好时注入默认值）
  useEffect(() => {
    initBackendConfig();
  }, []);

  return controller;
}

// 类型再导出，便于上层统一从 @/lib/voice 引入
export type {
  VoiceController,
  VoiceControllerOptions,
  VoiceStatus,
  QuotaInfo,
  DeviceCommand,
  NavigateCommand,
  ScheduleTaskCommand,
  AICommand,
  ChatMessage,
} from "./voice-types";
export {
  getVoiceConfig,
  saveVoiceConfig,
  onVoiceConfigChange,
  fetchBackendVoiceConfig,
  initBackendConfig,
  type VoiceConfig,
  type VoiceArchitecture,
  type VadConfig,
} from "./voice-config";
