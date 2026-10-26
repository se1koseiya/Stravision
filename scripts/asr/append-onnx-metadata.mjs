/**
 * 给 FunASR 导出的 ONNX 追加 sherpa-onnx 需要的 metadata —— 零依赖实现。
 *
 * ── 为什么要手搓 protobuf ────────────────────────────────────────
 * 常规做法是 `python onnx.load() → metadata_props.add() → save()`，但本机 pip 装不上 onnx
 * （索引拉不到包），而这里要补的只是几个字符串键值对。
 *
 * 关键事实：ONNX 的 `ModelProto.metadata_props` 是 **field 14, repeated, length-delimited**，
 * 而 protobuf 的 repeated 字段**不要求连续、不要求顺序** —— 解析器会把末尾追加的条目
 * 直接追加进列表。所以根本不必把 238MB 的图解析成对象（那样要 2~3GB 内存），
 * 只需要按 wire format 拼几段字节 append 到文件尾。
 *
 * ── 必须补的三样（缺一样都不行）─────────────────────────────────
 * · lfr_window_size / lfr_window_shift —— FunASR 训练的 LFR 堆叠参数（7/6），
 *   缺了特征维度对不上；sherpa 从 metadata 读，不从 config.yaml 读。
 * · neg_mean / inv_stddev —— 来自 am.mvn 的 CMVN。FunASR 的 onnx 导出**不含** CMVN，
 *   sherpa 在 C++ 侧做归一化。缺了不会崩，但识别结果是乱码（最容易踩的坑）。
 * · vocab_size —— sherpa 用来校验 tokens.txt 行数与 logits 维度。缺了 Init 直接失败。
 *
 * 用法：
 *   node scripts/asr/append-onnx-metadata.mjs data/models/asr/funasr-paraformer
 */

import fs from "node:fs"
import path from "node:path"

const MODEL_PROTO_METADATA_PROPS_FIELD = 14
const WIRE_TYPE_LENGTH_DELIMITED = 2

/* ── protobuf 编码小工具 ─────────────────────────────────────── */

function encodeVarint(value) {
  const bytes = []
  let v = value
  while (v > 0x7f) {
    bytes.push((v & 0x7f) | 0x80)
    v = Math.floor(v / 128)
  }
  bytes.push(v & 0x7f)
  return Buffer.from(bytes)
}

/** string 字段： tag = (field << 3) | 2 */
function encodeStringField(fieldNumber, str) {
  const body = Buffer.from(str, "utf8")
  return Buffer.concat([encodeVarint((fieldNumber << 3) | WIRE_TYPE_LENGTH_DELIMITED), encodeVarint(body.length), body])
}

/** StringStringEntryProto { key = 1, value = 2 } */
function encodeEntry(key, value) {
  const inner = Buffer.concat([encodeStringField(1, key), encodeStringField(2, value)])
  return Buffer.concat([
    encodeVarint((MODEL_PROTO_METADATA_PROPS_FIELD << 3) | WIRE_TYPE_LENGTH_DELIMITED),
    encodeVarint(inner.length),
    inner,
  ])
}

/* ── 读取 FunASR 的配套文件 ──────────────────────────────────── */

function loadCmvn(amMvnPath) {
  const lines = fs.readFileSync(amMvnPath, "utf8").split(/\r?\n/)
  const rows = []
  for (const line of lines) {
    if (!line.startsWith("<LearnRateCoef>")) continue
    // 形如：<LearnRateCoef> 0 [ 0 ... -8.3 ] <BiasLearnRateCoef> 0 [ ... ]
    const values = line.split(/\s+/).slice(3, -1)
    rows.push(values.join(","))
  }
  if (rows.length < 2) throw new Error(`am.mvn 解析失败：只解析到 ${rows.length} 行`)
  return { negMean: rows[0], invStddev: rows[1] }
}

function loadLfr(configPath) {
  const text = fs.readFileSync(configPath, "utf8")
  const m = text.match(/lfr_m:\s*(\d+)/)
  const n = text.match(/lfr_n:\s*(\d+)/)
  if (!m || !n) throw new Error("config.yaml 里没找到 lfr_m / lfr_n")
  return { windowSize: Number(m[1]), windowShift: Number(n[1]) }
}

/** ModelScope 的 tokens.json 是数组，index 即 token id → 转 sherpa 的 "token id" 每行格式 */
function ensureTokensTxt(dir) {
  const txt = path.join(dir, "tokens.txt")
  if (fs.existsSync(txt)) return { path: txt, count: fs.readFileSync(txt, "utf8").split("\n").filter(Boolean).length }

  const jsonPath = path.join(dir, "tokens.json")
  if (!fs.existsSync(jsonPath)) throw new Error("既没有 tokens.txt 也没有 tokens.json")
  const tokens = JSON.parse(fs.readFileSync(jsonPath, "utf8"))
  const lines = tokens.map((t, i) => `${t} ${i}`)
  fs.writeFileSync(txt, lines.join("\n") + "\n", "utf8")
  return { path: txt, count: lines.length }
}

/* ── 读已有 metadata（只解析顶层，跳过 graph）────────────────────
   目的仅是幂等：重复跑不要重复追加。这里做一次轻量扫描：
   顶层字段按 tag 顺序解析，graph(7) 等大字段直接跳过。 */
function hasMetadataKey(filePath, key) {
  const fd = fs.openSync(filePath, "r")
  try {
    const size = fs.fstatSync(fd).size
    const headSize = Math.min(size, 8 * 1024 * 1024) // metadata 通常在开头，8MB 足够
    const buf = Buffer.alloc(headSize)
    fs.readSync(fd, buf, 0, headSize, 0)

    const needle = Buffer.from(key, "utf8")
    // 粗糙但够用：key 作为 UTF-8 出现在前 8MB 且紧跟在 metadata_props 的 tag 之后
    return buf.includes(needle)
  } finally {
    fs.closeSync(fd)
  }
}

/* ── 主流程 ─────────────────────────────────────────────────── */

function main() {
  const dir = path.resolve(process.argv[2] || "data/models/asr/funasr-paraformer")
  const srcCandidates = ["model_quant.onnx", "model.onnx", "model.int8.onnx"]
  const srcName = srcCandidates.find((f) => fs.existsSync(path.join(dir, f)))
  if (!srcName) throw new Error(`目录里没有 onnx 模型：${dir}`)

  const src = path.join(dir, srcName)
  const dst = path.join(dir, "model.int8.onnx")

  const { negMean, invStddev } = loadCmvn(path.join(dir, "am.mvn"))
  const { windowSize, windowShift } = loadLfr(path.join(dir, "config.yaml"))
  const tokens = ensureTokensTxt(dir)

  console.log(
    `[asr] lfr=${windowSize}/${windowShift}  vocab=${tokens.count}  ` +
      `cmvn_dim=${negMean.split(",").length}  源=${srcName} (${(fs.statSync(src).size / 1e6).toFixed(1)}MB)`
  )

  if (src === dst && hasMetadataKey(dst, "vocab_size")) {
    console.log("[asr] 已存在 metadata，跳过")
    return
  }

  if (src !== dst) {
    fs.copyFileSync(src, dst)
  }

  const entries = {
    lfr_window_size: String(windowSize),
    lfr_window_shift: String(windowShift),
    neg_mean: negMean,
    inv_stddev: invStddev,
    vocab_size: String(tokens.count),
    model_type: "paraformer",
    version: "1",
    model_author: "iic",
    description: "Chinese Paraformer (FunASR onnx export, sherpa-onnx compatible)",
  }

  const payload = Buffer.concat(Object.entries(entries).map(([k, v]) => encodeEntry(k, v)))
  fs.appendFileSync(dst, payload)

  console.log(
    `[asr] 已追加 ${Object.keys(entries).length} 条 metadata (+${payload.length}B) → ${path.basename(dst)} ` +
      `(${(fs.statSync(dst).size / 1e6).toFixed(1)}MB)`
  )
}

main()
