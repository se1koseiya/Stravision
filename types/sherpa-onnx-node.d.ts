/**
 * sherpa-onnx-node 的最小类型声明
 *
 * 上游包只发 CommonJS + .node 原生 addon，不带 .d.ts（`types.js` 是运行时对象，
 * 不是声明文件），TS 严格模式下 `import("sherpa-onnx-node")` 会报 TS7016。
 * 这里只声明本项目实际用到的离线识别那一小块 —— 不追求覆盖全 API，
 * 多出来的能力等真用到时再补，避免维护一份会漂的镜像。
 *
 * 参考：https://github.com/k2-fsa/sherpa-onnx（nodejs-addon-examples）
 */
declare module "sherpa-onnx-node" {
  export interface OfflineParaformerModelConfig {
    model: string
  }

  export interface OfflineModelConfig {
    paraformer?: OfflineParaformerModelConfig
    tokens: string
    numThreads?: number
    provider?: "cpu" | "cuda" | "coreml" | string
    debug?: number
  }

  export interface FeatureConfig {
    sampleRate?: number
    featureDim?: number
  }

  export interface OfflineRecognizerConfig {
    featConfig?: FeatureConfig
    modelConfig: OfflineModelConfig
  }

  export interface OfflineStream {
    acceptWaveform(obj: { samples: Float32Array; sampleRate: number }): void
  }

  export class OfflineRecognizer {
    constructor(config: OfflineRecognizerConfig)
    createStream(): OfflineStream
    decodeAsync(stream: OfflineStream): Promise<void>
    getResult(stream: OfflineStream): { text?: string }
  }
}
