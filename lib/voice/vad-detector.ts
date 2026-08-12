/**
 * 语音活动检测（Voice Activity Detection）—— Silero VAD 版本
 *
 * 参考 AsLive 项目的 Silero VAD 方案，使用 @ricky0123/vad-web（WASM 移植）：
 * - 基于 ONNX 神经网络，准确率远超能量阈值
 * - 自带 AudioWorklet 音频采集，不阻塞主线程
 * - onSpeechEnd 直接返回 Float32Array 音频数据，级联架构无需 MediaRecorder
 *
 * 若 Silero VAD 模型加载失败（网络/WASM 不支持），自动降级到能量阈值 VAD。
 * 仅在客户端使用。
 */

import { MicVAD } from "@ricky0123/vad-web";
import type { VadConfig } from "./voice-config";

export type VadState = "silence" | "speech";

export interface VadCallbacks {
  /** 检测到开始说话 */
  onSpeechStart?: () => void;
  /** 检测到说话结束（静音持续达标），audio 为完整语音的 PCM Float32 数据 */
  onSpeechEnd?: (audio: Float32Array) => void;
  /** 每帧语音概率回调（用于 UI 可视化，可选） */
  onLevel?: (prob: number, state: VadState) => void;
  /** VAD 误触发（说话太短被丢弃） */
  onMisfire?: () => void;
}

export interface VadRuntime {
  /** 重置状态（下一轮聆听开始） */
  reset: () => void;
  /** 暂停 VAD（保留模型状态） */
  pause: () => void;
  /** 恢复 VAD */
  resume: () => void;
  /** 销毁 VAD，释放资源 */
  cleanup: () => void;
  /** 设置打断模式（true=AI说话中，需更高阈值避免TTS回声；false=正常聆听） */
  setInterruptMode?: (active: boolean) => void;
}

// ---------------------------------------------------------------------------
// 降级方案：能量阈值 VAD（ScriptProcessor + Web Audio 滤波器链 + 瞬态噪声检测）
// ---------------------------------------------------------------------------

function startEnergyVad(
  stream: MediaStream,
  config: VadConfig,
  callbacks: VadCallbacks
): VadRuntime {
  console.warn("[VAD] 使用能量阈值 VAD（降级模式 + 降噪链）");
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(stream);

  // === Web Audio 滤波器链：仅做频率过滤，不做动态压缩（压缩器会放大背景噪声） ===
  // 1. 高通滤波器 (100Hz)：过滤空调、风扇、桌面振动等低频嗡嗡声
  const highpass = audioContext.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 100;
  highpass.Q.value = 0.7;

  // 2. 低通滤波器 (7500Hz)：过滤高频电磁干扰、电流声，保留语音主要频段
  const lowpass = audioContext.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 7500;
  lowpass.Q.value = 0.7;

  // 节点链：source → highpass → lowpass → processor → silentSink
  // 帧大小 512 samples @ 16kHz = 32ms/帧
  const processor = audioContext.createScriptProcessor(512, 1, 1);
  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(processor);

  // 连接到零增益节点而非 destination，避免麦克风声音播放到扬声器（回声）
  const silentSink = audioContext.createGain();
  silentSink.gain.value = 0;
  processor.connect(silentSink);
  silentSink.connect(audioContext.destination);

  const silenceDurationMs = config.silenceDurationMs;
  const speechStartMs = config.speechStartMs;
  const minSpeechMs = config.minSpeechMs;
  const maxSpeechMs = config.maxSegmentMs;

  // === 自适应噪声底（带硬性上限，防止阈值失控） ===
  let noiseFloor = 0.006; // 初始噪声底（安静房间典型值）
  const noiseAlpha = 0.05; // 噪声底更新速率
  const NOISE_FLOOR_MAX = 0.025; // 噪声底硬性上限
  const SPEECH_THRESHOLD_MIN = 0.025; // 语音阈值绝对下限
  const SPEECH_THRESHOLD_MAX = 0.12; // 语音阈值绝对上限
  const SILENCE_THRESHOLD_MIN = 0.015; // 静音阈值绝对下限

  // === 启动校准：前 30 帧（~960ms）快速采集环境噪声，不触发语音检测 ===
  let calibrationFrames = 30;
  let calibrationMaxEnergy = 0;

  // === 瞬态噪声检测 ===
  let prevEnergy = 0;
  let transientCount = 0;
  const transientRatio = 10.0;
  const transientMaxFrames = 3;

  let isSpeaking = false;
  let speechFrames: Float32Array[] = [];
  let silenceStart = 0;
  let speechStart = 0;
  let speechFrameCount = 0;
  let speechStartTime = 0;
  let paused = false;
  let interruptMode = false;
  let hangoverCount = 0;
  const hangoverMax = 4; // 4帧×32ms=128ms 容忍

  const processFrame = (input: Float32Array) => {
    if (paused) return;

    // 计算 RMS 能量
    let sum = 0;
    for (let i = 0; i < input.length; i++) {
      sum += input[i] * input[i];
    }
    const rms = Math.sqrt(sum / input.length);
    const energy = Math.min(1, rms);

    // === 启动校准阶段：快速采集环境噪声 ===
    if (calibrationFrames > 0) {
      calibrationFrames--;
      calibrationMaxEnergy = Math.max(calibrationMaxEnergy, energy);
      // 快速更新噪声底
      noiseFloor = noiseFloor * 0.7 + energy * 0.3;
      if (calibrationFrames === 0) {
        // 校准结束：噪声底设为校准期间最大能量的 1.2 倍（留安全余量），但不超过上限
        noiseFloor = Math.min(NOISE_FLOOR_MAX, Math.max(noiseFloor, calibrationMaxEnergy * 1.2));
        console.log(`[VAD] 校准完成: noiseFloor=${noiseFloor.toFixed(4)}, maxEnergy=${calibrationMaxEnergy.toFixed(4)}`);
      }
      prevEnergy = energy;
      return; // 校准期间不触发语音检测
    }

    // === 瞬态噪声检测 ===
    let isTransient = false;
    if (prevEnergy > 0.003 && energy > prevEnergy * transientRatio) {
      transientCount++;
      isTransient = true;
    } else if (transientCount > 0) {
      transientCount--;
    } else {
      transientCount = 0;
    }
    if (transientCount > transientMaxFrames) {
      isTransient = false;
      transientCount = 0;
    }

    // === 双阈值滞回（hysteresis） ===
    // 开始说话：需要较高阈值（防误触发）
    // 结束说话：用较低阈值（防过早切断），且阈值基于噪声底但有硬性上下限
    const cappedNoiseFloor = Math.min(noiseFloor, NOISE_FLOOR_MAX);
    // 打断模式：AI 朗读时用户开口需能及时打断。阈值略高于正常聆听以过滤 TTS 回声，
    // 但不要过高（原 0.2/0.1 导致用户说多大声都打断不了）。0.12/0.06 兼顾灵敏与防回声。
    const speechThreshold = interruptMode
      ? 0.12
      : Math.max(SPEECH_THRESHOLD_MIN, Math.min(SPEECH_THRESHOLD_MAX, cappedNoiseFloor * 3.5));
    const silenceThresholdValue = interruptMode
      ? 0.06
      : Math.max(SILENCE_THRESHOLD_MIN, cappedNoiseFloor * 2.0);

    const now = Date.now();

    if (!isSpeaking) {
      // 仅在能量低于语音阈值时更新噪声底（确认为环境噪声）
      if (!isTransient && energy < speechThreshold) {
        noiseFloor = noiseFloor * (1 - noiseAlpha) + energy * noiseAlpha;
      }

      if (!isTransient && energy > speechThreshold) {
        if (speechStart === 0) speechStart = now;
        if (now - speechStart >= speechStartMs) {
          isSpeaking = true;
          speechFrames = [input.slice()];
          speechFrameCount = 1;
          speechStartTime = now;
          hangoverCount = 0;
          console.log(`[VAD] onSpeechStart (e=${energy.toFixed(3)}, spkT=${speechThreshold.toFixed(3)}, nf=${noiseFloor.toFixed(4)})`);
          callbacks.onSpeechStart?.();
        } else {
          speechFrames.push(input.slice());
        }
      } else if (!isTransient) {
        speechStart = 0;
        speechFrames = [];
      }
    } else {
      speechFrames.push(input.slice());
      speechFrameCount++;

      // 安全机制：说话超过 maxSpeechMs 强制断句
      const speechDur = now - speechStartTime;
      const forceEnd = speechDur >= maxSpeechMs;

      if (energy < silenceThresholdValue || forceEnd) {
        if (silenceStart === 0) silenceStart = now;
        hangoverCount = 0;
        if (forceEnd || now - silenceStart >= silenceDurationMs) {
          isSpeaking = false;
          silenceStart = 0;
          speechStart = 0;

          const totalFrames = speechFrameCount;
          const frameSize = speechFrames[0]?.length ?? 512;
          const merged = new Float32Array(totalFrames * frameSize);
          let offset = 0;
          for (const frame of speechFrames) {
            merged.set(frame, offset);
            offset += frame.length;
          }
          speechFrames = [];

          const speechDurationMs = (totalFrames * frameSize) / 16;
          console.log(`[VAD] onSpeechEnd (frames=${totalFrames}, dur=${speechDurationMs}ms, e=${energy.toFixed(3)}, silT=${silenceThresholdValue.toFixed(3)}, force=${forceEnd})`);
          if (speechDurationMs >= minSpeechMs) {
            callbacks.onSpeechEnd?.(merged);
          } else {
            console.log(`[VAD] Misfire (dur=${speechDurationMs}ms < ${minSpeechMs}ms)`);
            callbacks.onMisfire?.();
          }
          speechFrameCount = 0;
        }
      } else if (hangoverCount < hangoverMax) {
        hangoverCount++;
      } else {
        silenceStart = 0;
        hangoverCount = 0;
      }
    }

    prevEnergy = energy;
  };

  processor.onaudioprocess = (e) => {
    processFrame(e.inputBuffer.getChannelData(0));
  };

  return {
    reset: () => {
      isSpeaking = false;
      silenceStart = 0;
      speechStart = 0;
      speechFrames = [];
      speechFrameCount = 0;
      speechStartTime = 0;
      interruptMode = false;
      transientCount = 0;
      prevEnergy = 0;
      hangoverCount = 0;
      // 不重新校准，保留启动时建立的噪声底（避免每轮对话增加延迟）
    },
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
    },
    setInterruptMode: (active: boolean) => {
      interruptMode = active;
    },
    cleanup: () => {
      paused = true;
      try {
        processor.disconnect();
        lowpass.disconnect();
        highpass.disconnect();
        source.disconnect();
        silentSink.disconnect();
        audioContext.close();
      } catch {}
    },
  };
}

/**
 * 创建并启动 Silero VAD。若模型加载失败，自动降级到能量阈值 VAD。
 *
 * @param stream 来自 getUserMedia 的 MediaStream（与 AudioCapture 共享，避免重复采集）
 * @param config VAD 参数（部分映射到 Silero VAD 的阈值参数）
 * @param callbacks 回调
 */
export async function startVad(
  stream: MediaStream,
  config: VadConfig,
  callbacks: VadCallbacks
): Promise<VadRuntime> {
  // 将项目 VAD 配置映射到 Silero VAD 参数
  const positiveThreshold = Math.max(0.3, Math.min(0.85, config.silenceThreshold * 10 + 0.3));
  const negativeThreshold = positiveThreshold - 0.15;

  const preSpeechPadFrames = Math.max(1, Math.floor(config.speechStartMs / 32));
  const minSpeechFrames = Math.max(1, Math.floor(config.minSpeechMs / 32));
  const redeemedSpeechFrames = Math.max(4, Math.floor(config.silenceDurationMs / 32));

  // Silero VAD 的 onnxruntime-web simd-threaded WASM 在无 SharedArrayBuffer 环境下
  // 即使 numThreads=1 也会静默失败（模型加载成功但推理不工作）。
  // 因此必须检测 crossOriginIsolated，不可用时直接使用能量 VAD。
  if (typeof crossOriginIsolated === "undefined" || !crossOriginIsolated) {
    console.warn("[VAD] crossOriginIsolated=false，使用能量阈值 VAD（Silero 需要 COEP/COOP 头）");
    return startEnergyVad(stream, config, callbacks);
  }

  try {
    const vad = await MicVAD.new({
      stream,
      // 资源路径：从 public/vad/ 加载 ONNX 模型、worklet 和 WASM 运行时
      baseAssetPath: "/vad/",
      onnxWASMBasePath: "/vad/",
      positiveSpeechDetectionThreshold: positiveThreshold,
      negativeSpeechDetectionThreshold: negativeThreshold,
      preSpeechPadFrames,
      minSpeechFrames,
      redeemedSpeechFrames,
      autoEnd: false,
      onSpeechStart: () => {
        console.log("[VAD] Silero onSpeechStart");
        callbacks.onSpeechStart?.();
      },
      onSpeechEnd: (audio: Float32Array) => {
        console.log("[VAD] Silero onSpeechEnd, audio length:", audio.length);
        callbacks.onSpeechEnd?.(audio);
      },
      onVADMisfire: () => {
        console.log("[VAD] Silero onVADMisfire");
        callbacks.onMisfire?.();
      },
      onSpeechProbChange: (prob: number) => {
        callbacks.onLevel?.(prob, prob > positiveThreshold ? "speech" : "silence");
      },
    });

    console.log("[VAD] Silero VAD 加载成功，模型已就绪");
    vad.start();

    let paused = false;

    return {
      reset: () => {
        if (paused) return;
        vad.pause();
        vad.start();
      },
      pause: () => {
        if (!paused) {
          vad.pause();
          paused = true;
        }
      },
      resume: () => {
        if (paused) {
          vad.start();
          paused = false;
        }
      },
      setInterruptMode: (_active: boolean) => {
        // Silero VAD 的神经网络对 TTS 回声有更好的过滤能力，无需特殊处理
      },
      cleanup: () => {
        if (!paused) {
          vad.pause();
          paused = true;
        }
      },
    };
  } catch (err) {
    console.warn("[VAD] Silero VAD 加载失败，降级到能量阈值 VAD:", err);
    return startEnergyVad(stream, config, callbacks);
  }
}
