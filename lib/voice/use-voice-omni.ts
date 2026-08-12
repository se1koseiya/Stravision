"use client";

/**
 * Omni 一体化架构 Hook（备选架构）
 *
 * 从原 realtime-voice-orb.tsx 内联逻辑抽取，行为保持不变：
 * 麦克风 PCM16 → WebSocket(ws-server.js / pages/api/xiaozhi/realtime)
 * → qwen3-omni-flash-realtime（ASR+LLM+TTS 三合一）→ PCM24 播放。
 *
 * 与级联架构共享 VoiceController 契约，可由配置层切换。
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import type {
  ChatMessage,
  DeviceCommand,
  NavigateCommand,
  QuotaInfo,
  ScheduleTaskCommand,
  VoiceController,
  VoiceControllerOptions,
  VoiceStatus,
} from "./voice-types";
import {
  AudioCapture,
  AudioPlayer,
  createEventId,
  executeDeviceCommand,
  executeScheduleTask,
  fetchQuota,
} from "./voice-utils";
import { getVoiceConfig, type VoiceConfig } from "./voice-config";

const DEFAULT_INSTRUCTIONS =
  "你是莓小智，一个专业、友好的AI语音助手。用中文简洁回答问题。重要：当你需要输出JSON命令时（如设备控制、定时任务、页面导航），请将JSON放在回复末尾，但在语音朗读时完全跳过JSON部分，只朗读自然语言描述。绝不要朗读任何包含大括号、引号、冒号等JSON符号的内容。";

export function useVoiceOmni(
  options: VoiceControllerOptions & { config?: VoiceConfig; enabled?: boolean }
): VoiceController {
  const {
    instructions = DEFAULT_INSTRUCTIONS,
    systemPrompt,
    voice,
    autoConnect = false,
    deviceData,
    autoExecuteCommands = true,
    onStatusChange,
    onTranscript,
    onError,
    onDeviceCommand,
    onScheduleTask,
    onNavigate,
    onQuotaExceeded,
    config: configOverride,
    enabled = true,
  } = options;

  // 从 config 读取运行时参数（音色优先用 options.voice，回退到 config.voice）
  const configRef = useRef<VoiceConfig>(configOverride ?? getVoiceConfig());
  configRef.current = configOverride ?? getVoiceConfig();
  // 每次读取最新配置，避免 initBackendConfig 异步写入后闭包过期
  const effectiveVoice = voice ?? getVoiceConfig().voice;

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isUserSpeaking, setIsUserSpeaking] = useState(true);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);

  // statusRef 保存最新 status，避免 ws.onclose 等回调中闭包过期问题
  const statusRef = useRef<VoiceStatus>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTranscriptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCommandsRef = useRef("");
  const lastUserTranscriptRef = useRef("");
  const prevRelayStatesRef = useRef("");

  // transcript/isUserSpeaking 的 ref，避免 ws.onmessage 闭包捕获过期 state
  const transcriptRef = useRef("");
  const isUserSpeakingRef = useRef(false);
  transcriptRef.current = transcript;
  isUserSpeakingRef.current = isUserSpeaking;

  // 用于在事件回调中调用最新的 disconnect / interrupt（避免闭包过期）
  const disconnectRef = useRef<() => void>(() => {});

  const refreshQuota = useCallback(async () => {
    const quota = await fetchQuota();
    setQuotaInfo(quota);
    return quota;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refreshQuota();
  }, [refreshQuota, enabled]);

  const enhancedInstructions = useMemo(() => {
    const baseInstructions = systemPrompt || instructions;
    if (!deviceData) return baseInstructions;
    const relayStatus = (val: number) => (val === 1 ? "开启" : "关闭");
    const deviceInfo = `

## 当前设备数据（实时）
- 温度: ${deviceData.temperature?.toFixed(1) ?? "--"}°C
- 湿度: ${deviceData.humidity?.toFixed(1) ?? "--"}%
- 光照: ${deviceData.light ?? "--"} lux
- CO₂: ${deviceData.co2 ?? "--"} ppm
- 土壤温度: ${deviceData.earth_temp?.toFixed(1) ?? "--"}°C
- 土壤湿度: ${deviceData.earth_water?.toFixed(1) ?? "--"}%
- 土壤EC: ${deviceData.earth_ec ?? "--"} μS/cm
- 土壤氮(N): ${deviceData.earth_n ?? "--"} mg/kg
- 土壤磷(P): ${deviceData.earth_p ?? "--"} mg/kg
- 土壤钾(K): ${deviceData.earth_k ?? "--"} mg/kg

## 设备状态
- 水泵(Relay5): ${relayStatus(deviceData.relay5)}
- 风扇(Relay6): ${relayStatus(deviceData.relay6)}
- 植物全光谱补光灯(Relay7): ${relayStatus(deviceData.relay7)}
- 光照植物补光灯(Relay8): ${relayStatus(deviceData.relay8)}
- RGB灯: R=${deviceData.led1 ?? 0}, G=${deviceData.led2 ?? 0}, B=${deviceData.led3 ?? 0}

## 设备控制能力
你可以控制以下设备，当用户要求控制设备时，请在回复中包含JSON命令：

1. 继电器控制（水泵/风扇/植物全光谱补光灯/光照植物补光灯）:
\`\`\`json
{"action":"toggle_relay","device":5,"value":1}
\`\`\`
- device: 5=水泵, 6=风扇, 7=植物全光谱补光灯, 8=光照植物补光灯
- value: 1=开启, 0=关闭

2. RGB灯颜色控制:
\`\`\`json
{"action":"set_led","r":255,"g":100,"b":50}
\`\`\`
- r/g/b: 0-255

3. 摄像头云台控制（步进电机）:
\`\`\`json
{"action":"control_camera","direction":1}
\`\`\`
- direction: 0=停止, 1=左移, 2=右移

4. 摄像头云台复位居中:
\`\`\`json
{"action":"reset_camera"}
\`\`\`

## 定时任务能力
\`\`\`json
{"action":"schedule_task","title":"任务名称","cron":"0 8 * * *","task_action":"toggle_relay","device":6,"value":1}
\`\`\`
- cron: Cron表达式; delay_seconds: 延迟秒数; task_action: toggle_relay|set_led; params: LED参数

## 页面导航能力
\`\`\`json
{"action":"navigate","page":"dashboard"}
\`\`\`
可用页面: dashboard,monitor,device-control,ai-assistant,profile,settings

**重要语音输出规则（必须严格遵守）**：
1. JSON命令放在回复末尾，朗读时完全跳过
2. 任何含 {}"": 符号的内容都不要朗读
3. 只用自然、流畅的中文语音描述

## 特殊命令处理规则
当用户说"再见/拜拜/不需要你了"等结束词，或"看看大棚/草莓长得怎么样"等截图命令时，系统自动处理，你不需要响应。`;
    return `${baseInstructions}${deviceInfo}`;
  }, [instructions, systemPrompt, deviceData]);

  // 设备状态变化时更新会话指令
  useEffect(() => {
    if (!enabled) return;
    if (!deviceData) return;
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    if (status === "idle" || status === "connecting") return;

    const currentRelayStates = `${deviceData.relay5}-${deviceData.relay6}-${deviceData.relay7}-${deviceData.relay8}`;
    if (currentRelayStates === prevRelayStatesRef.current) return;
    // 首次记录设备状态时不发送 session.update（session.created 已发送完整配置）
    if (prevRelayStatesRef.current === "") {
      prevRelayStatesRef.current = currentRelayStates;
      return;
    }
    prevRelayStatesRef.current = currentRelayStates;

    const sessionUpdateMsg = {
      event_id: createEventId(),
      type: "session.update",
      session: { instructions: enhancedInstructions, voice: effectiveVoice },
    };
    wsRef.current.send(JSON.stringify(sessionUpdateMsg));
  }, [deviceData, status, enhancedInstructions, effectiveVoice, enabled]);

  const updateStatus = useCallback(
    (newStatus: VoiceStatus) => {
      statusRef.current = newStatus;
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );

  const handleError = useCallback(
    (error: string) => {
      console.error("[VoiceOmni]", error);
      updateStatus("error");
      onError?.(error);
      toast.error(error);
    },
    [updateStatus, onError]
  );

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const handleServerEvent = useCallback(
    (event: any) => {
      switch (event.type) {
        case "session.created": {
          const sessionUpdateMsg = {
            event_id: createEventId(),
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              voice: effectiveVoice,
              input_audio_format: "pcm",
              output_audio_format: "pcm",
              instructions: enhancedInstructions,
              // 开启输入音频转写，否则收不到 conversation.item.input_audio_transcription.* 事件
              input_audio_transcription: {
                model: "qwen3-asr-flash-realtime",
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                silence_duration_ms: 450,
                // 自动生成响应 + 支持语音打断（AI 朗读时用户开口立即打断）
                create_response: true,
                interrupt_response: true,
              },
            },
          };
          sendMessage(sessionUpdateMsg);

          // 每次新建 AudioCapture，避免旧实例 AudioContext 已关闭导致重连失败
          if (audioCaptureRef.current) {
            try { audioCaptureRef.current.stop(); } catch {}
            audioCaptureRef.current = null;
          }
          // binaryMode=false: OpenAI/DashScope realtime 协议要求 JSON+base64，
          // 不能用二进制帧（否则音频数据为空，识别全错）
          const capture = new AudioCapture((data) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  event_id: createEventId(),
                  type: "input_audio_buffer.append",
                  audio: data as string,
                })
              );
            }
          }, false);
          audioCaptureRef.current = capture;
          capture.start();
          break;
        }

        case "session.updated":
          updateStatus("listening");
          break;

        case "input_audio_buffer.speech_started":
          updateStatus("listening");
          setIsUserSpeaking(true);
          setTranscript("");
          audioPlayerRef.current?.clear();
          break;

        case "input_audio_buffer.speech_stopped":
          break;

        case "conversation.item.input_audio_transcription.completed": {
          if (event.transcript) {
            setIsUserSpeaking(true);
            setTranscript(event.transcript);

            const text = event.transcript.trim();
            if (text) {
              lastUserTranscriptRef.current = text;

              const snapshotKeywords = [
                "看看大棚", "查看大棚", "大棚情况", "草莓长得怎么样", "草莓生长",
                "监控画面", "截图分析", "拍个照", "看一下大棚", "大棚里", "草莓", "长势", "生长情况",
              ];
              const isSnapshotCommand = snapshotKeywords.some((k) =>
                text.toLowerCase().includes(k)
              );

              const disconnectKeywords = [
                "不需要你了", "不用了", "再见", "拜拜", "退出", "结束对话", "挂断",
                "够了", "可以了", "谢谢你", "辛苦了", "休息吧", "下次再聊",
              ];
              const isDisconnectCommand = disconnectKeywords.some((k) =>
                text.toLowerCase().includes(k)
              );

              if (isDisconnectCommand) {
                (window as any).__pendingDisconnect = true;
              }

              if (isSnapshotCommand) {
                sendMessage({ type: "response.cancel" });
                sendMessage({ type: "input_audio_buffer.clear" });

                setHistory((prev) => [
                  ...prev,
                  { id: createEventId(), role: "user", content: text },
                ]);

                (async () => {
                  try {
                    const { processVoiceCommand } = await import(
                      "@/lib/xiaozhi/voice-commands"
                    );
                    const result = await processVoiceCommand(text);
                    if (result.recognized && result.response) {
                      setHistory((prev) => [
                        ...prev,
                        { id: createEventId(), role: "assistant", content: result.response! },
                      ]);
                    }
                  } catch (error) {
                    console.error("Snapshot command error:", error);
                  }
                })();

                setTranscript("");
                return;
              }
            }

            onTranscript?.(event.transcript, true);
          }
          break;
        }

        case "response.created":
          if (isUserSpeakingRef.current && transcriptRef.current) {
            setHistory((prev) => [
              ...prev,
              { id: createEventId(), role: "user", content: transcriptRef.current },
            ]);
            setTranscript("");
          }
          updateStatus("processing");
          setIsUserSpeaking(false);
          break;

        case "response.audio_transcript.delta":
          if (event.delta) {
            setIsUserSpeaking(false);
            setTranscript((prev) => prev + event.delta);
            pendingCommandsRef.current += event.delta;
          }
          break;

        case "response.audio_transcript.done":
          if (event.transcript) {
            onTranscript?.(event.transcript, false);
            if (!pendingCommandsRef.current) {
              pendingCommandsRef.current = event.transcript;
            }
          }
          break;

        case "response.audio.delta":
          if (event.delta) {
            updateStatus("speaking");
            audioPlayerRef.current?.playPCM16(event.delta);
          }
          break;

        case "response.done": {
          updateStatus("listening");

          if (transcriptRef.current) {
            setHistory((prev) => [
              ...prev,
              { id: createEventId(), role: "assistant", content: transcriptRef.current },
            ]);
            setTranscript("");
          }

          if ((window as any).__pendingDisconnect) {
            (window as any).__pendingDisconnect = false;
            setTimeout(() => disconnectRef.current(), 2000);
            pendingCommandsRef.current = "";
            break;
          }

          if (autoExecuteCommands && pendingCommandsRef.current) {
            const commandsText = pendingCommandsRef.current;
            const deviceMatches = [
              ...commandsText.matchAll(
                /\{[^{}]*"action"\s*:\s*"(?:toggle_relay|set_led|control_camera|reset_camera)"[^{}]*\}/g
              ),
            ];
            const scheduleMatches = [
              ...commandsText.matchAll(
                /\{[^{}]*"action"\s*:\s*"schedule_task"[^}]*\}/g
              ),
            ];
            const navigateMatches = [
              ...commandsText.matchAll(
                /\{[^{}]*"action"\s*:\s*"navigate"[^{}]*\}/g
              ),
            ];

            if (
              deviceMatches.length > 0 ||
              scheduleMatches.length > 0 ||
              navigateMatches.length > 0
            ) {
              (async () => {
                setIsExecutingCommand(true);
                for (const match of deviceMatches) {
                  try {
                    const cmd = JSON.parse(match[0]) as DeviceCommand;
                    onDeviceCommand?.(cmd);
                    const result = await executeDeviceCommand(cmd);
                    if (result.success) toast.success(result.message);
                    else toast.error(`执行失败: ${result.message}`);
                  } catch {
                    /* ignore */
                  }
                }
                for (const match of scheduleMatches) {
                  try {
                    let jsonStr = match[0];
                    if (jsonStr.includes('"params"') && !jsonStr.includes("}}")) {
                      const start = commandsText.indexOf(match[0]);
                      const end = commandsText.indexOf("}}", start);
                      if (end > start) jsonStr = commandsText.slice(start, end + 2);
                    }
                    const cmd = JSON.parse(jsonStr) as ScheduleTaskCommand;
                    onScheduleTask?.(cmd);
                    const result = await executeScheduleTask(cmd);
                    if (result.success) toast.success(result.message);
                    else toast.error(`创建失败: ${result.message}`);
                  } catch {
                    /* ignore */
                  }
                }
                for (const match of navigateMatches) {
                  try {
                    const cmd = JSON.parse(match[0]) as NavigateCommand;
                    toast.success(`正在跳转...`);
                    onNavigate?.(cmd);
                  } catch {
                    /* ignore */
                  }
                }
                setIsExecutingCommand(false);
              })();
            }
            pendingCommandsRef.current = "";
          }

          refreshQuota();
          break;
        }

        case "quota_warning":
          toast.warning("语音对话额度即将用完");
          if (event.quota) setQuotaInfo(event.quota);
          break;

        case "error": {
          const errorMsg = event?.error?.message || event?.message || "Unknown error";
          if (errorMsg.includes("Quota")) {
            toast.error("语音对话额度已用完");
            onQuotaExceeded?.();
            if (wsRef.current) {
              wsRef.current.close();
              wsRef.current = null;
            }
            updateStatus("idle");
          } else {
            handleError(errorMsg);
          }
          break;
        }
      }
    },
    [
      updateStatus,
      onTranscript,
      onDeviceCommand,
      onScheduleTask,
      onNavigate,
      handleError,
      autoExecuteCommands,
      refreshQuota,
      onQuotaExceeded,
      sendMessage,
      voice,
      enhancedInstructions,
    ]
  );

  const connect = useCallback(async () => {
    // 清理可能残留的旧连接（CONNECTING/CLOSING 状态也一并关闭）
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    const quota = await refreshQuota();
    if (quota && !quota.can_use) {
      if (quota.membership === "free") {
        toast.error("AI助手功能仅限Pro及以上会员使用");
      } else {
        toast.error("今日语音对话额度已用完，请明天再来");
      }
      onQuotaExceeded?.();
      return;
    }

    updateStatus("connecting");

    try {
      if (!audioPlayerRef.current) audioPlayerRef.current = new AudioPlayer();
      audioPlayerRef.current.init();

      // 模型和端点由 WS 代理从 voice_config 读取，客户端不再硬编码
      // 仅传 model 参数用于客户端覆盖（此处不传，让代理用 admin 配置的 omni.model）
      let wsUrl: string;
      const explicitProxy = process.env.NEXT_PUBLIC_XIAOZHI_WS_PROXY?.trim();

      if (explicitProxy) {
        wsUrl = explicitProxy;
      } else {
        const wsHost = window.location.host;
        if (window.location.protocol === "http:") {
          wsUrl = `ws://${window.location.hostname}:3002`;
        } else {
          wsUrl = `wss://${wsHost}/ws/voice`;
        }
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          handleServerEvent(data);
        } catch (e) {
          console.error("[VoiceOmni] Parse error:", e);
        }
      };

      ws.onerror = () => {
        handleError("连接错误，请检查网络");
      };

      ws.onclose = () => {
        // 使用 statusRef 读取最新状态，避免闭包过期
        if (statusRef.current !== "idle" && statusRef.current !== "error") {
          updateStatus("idle");
        }
        audioCaptureRef.current?.stop();
        audioCaptureRef.current = null;
        // 清理 wsRef，允许下次重连
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      };
    } catch {
      handleError("初始化失败");
    }
  }, [
    refreshQuota,
    updateStatus,
    handleError,
    onQuotaExceeded,
    handleServerEvent,
  ]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      // 先移除回调，避免 close 触发 onclose 里的状态覆盖
      try {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    audioCaptureRef.current?.stop();
    audioCaptureRef.current = null;
    audioPlayerRef.current?.stop();
    updateStatus("idle");
    setTranscript("");
  }, [updateStatus]);

  // 保持 ref 指向最新 disconnect，供 handleServerEvent 的延迟断开使用
  disconnectRef.current = disconnect;

  const toggleConnection = useCallback(async () => {
    if (status === "idle" || status === "error") {
      await connect();
    } else {
      disconnect();
    }
  }, [status, connect, disconnect]);

  const interrupt = useCallback(() => {
    sendMessage({ type: "response.cancel" });
    sendMessage({ type: "input_audio_buffer.clear" });
    audioPlayerRef.current?.clear();
    updateStatus("listening");
  }, [sendMessage, updateStatus]);

  useEffect(() => {
    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (clearTranscriptTimeoutRef.current) clearTimeout(clearTranscriptTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (autoConnect && status === "idle") {
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, enabled]);

  // 未启用时返回静态 idle 控制器，确保纯模式切换（不混用任何副作用）
  if (!enabled) {
    return {
      status: "idle" as VoiceStatus,
      transcript: "",
      history: [],
      isUserSpeaking: false,
      isExecutingCommand: false,
      quotaInfo: null,
      connect: async () => {},
      disconnect: () => {},
      toggleConnection: async () => {},
      interrupt: () => {},
      refreshQuota: async () => null,
    };
  }

  return {
    status,
    transcript,
    history,
    isUserSpeaking,
    isExecutingCommand,
    quotaInfo,
    connect,
    disconnect,
    toggleConnection,
    interrupt,
    refreshQuota,
  };
}
