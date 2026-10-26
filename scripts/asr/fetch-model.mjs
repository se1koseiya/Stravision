/**
 * 下载并准备好语音识别模型（Paraformer 中文 · sherpa-onnx 格式）
 *
 * 用法：pnpm asr:model
 *
 * ── 为什么不从 GitHub 下 ─────────────────────────────────────
 * sherpa-onnx 官方打包的模型只在 GitHub Releases 与 HuggingFace，国内直连基本拿不到
 * （实测 code=000，各种 ghproxy 镜像也全挂）。ModelScope 直连有 7~16MB/s，
 * 而它上面有 FunASR 官方的同源 ONNX 导出 —— 只是缺 sherpa 需要的元数据，
 * 所以本脚本 = 下载 + 补元数据，产物与官方包等价。
 *
 * 产物：data/models/asr/funasr-paraformer/model.int8.onnx (+ tokens.txt)
 */

import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"

const REPO = "iic/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-onnx"
const BASE = `https://www.modelscope.cn/models/${REPO}/resolve/master`
const FILES = ["model_quant.onnx", "tokens.json", "am.mvn", "config.yaml"]

const TARGET = path.resolve(process.argv[2] || "data/models/asr/funasr-paraformer")

async function download(name) {
  const dst = path.join(TARGET, name)
  if (fs.existsSync(dst) && fs.statSync(dst).size > 1024) {
    console.log(`  跳过 ${name}（已存在 ${(fs.statSync(dst).size / 1e6).toFixed(1)}MB）`)
    return
  }
  const url = `${BASE}/${name}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${name} 下载失败：HTTP ${res.status}`)

  const total = Number(res.headers.get("content-length") || 0)
  const chunks = []
  let received = 0
  let lastPrint = 0

  for await (const chunk of res.body) {
    chunks.push(chunk)
    received += chunk.length
    if (total && Date.now() - lastPrint > 800) {
      const pct = ((received / total) * 100).toFixed(0)
      process.stdout.write(`\r  ${name}  ${pct}%  (${(received / 1e6).toFixed(1)}/${(total / 1e6).toFixed(1)}MB)`)
      lastPrint = Date.now()
    }
  }
  fs.writeFileSync(dst, Buffer.concat(chunks))
  process.stdout.write(`\r  ${name}  完成 (${(received / 1e6).toFixed(1)}MB)\n`)
}

async function main() {
  fs.mkdirSync(TARGET, { recursive: true })
  console.log(`[asr:model] 目标目录 ${TARGET}`)
  console.log(`[asr:model] 源 ${REPO}（ModelScope）`)

  for (const name of FILES) {
    await download(name)
  }

  console.log("[asr:model] 补 sherpa 元数据（CMVN / LFR / vocab）…")
  execFileSync(process.execPath, [path.join("scripts", "asr", "append-onnx-metadata.mjs"), TARGET], {
    stdio: "inherit",
  })

  const model = path.join(TARGET, "model.int8.onnx")
  console.log(`[asr:model] ✅ 就绪：${model}  (${(fs.statSync(model).size / 1e6).toFixed(1)}MB)`)
  console.log("[asr:model] 重启 dev 后，/api/ai/asr 会自动加载（首次约 2~3s）")
}

main().catch((err) => {
  console.error("[asr:model] ❌", err.message)
  process.exit(1)
})
