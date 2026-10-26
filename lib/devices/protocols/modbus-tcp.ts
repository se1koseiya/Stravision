/**
 * Modbus TCP 协议适配器（零依赖实现）
 *
 * 为什么手写：项目不允许为单个功能引入重依赖，而 Modbus TCP 的帧格式非常简单
 * （MBAP 7 字节头 + PDU），实现 FC1/3/5/6 足够覆盖绝大多数 PLC / 采集卡 / 变频器。
 *
 * 只支持 TCP（502 端口）。串口 RTU 需要网关转 TCP，这是工业现场的通行做法。
 */

import net from 'node:net'
import type {
  ConnectionRecord,
  ProtocolAdapter,
  ProtocolMeta,
  SendContext,
  SendResult,
  TestResult,
} from './types'
import { cfgNum, cfgStr } from './types'

export const MODBUS_META: ProtocolMeta = {
  id: 'modbus_tcp',
  name: 'Modbus TCP',
  summary: '工业现场最常见的协议，直接读写 PLC / 采集卡 / 变频器的寄存器与线圈。',
  inbound: false,
  outbound: true,
  inboundHint: 'Modbus 是「平台主动读写」模型，设备不会主动上报；如需采集请用动作读取寄存器或改用网关上报',
  fields: [
    { key: 'host', label: '设备 IP', type: 'text', required: true, placeholder: '192.168.1.10' },
    { key: 'port', label: '端口', type: 'number', default: 502 },
    { key: 'unitId', label: '从站地址（Unit ID）', type: 'number', default: 1, help: '多数 PLC 为 1；串口转 TCP 网关常用 1-247' },
    { key: 'probeRegister', label: '测试寄存器地址', type: 'number', default: 0, help: '点「测试连接」时读取这个保持寄存器' },
    { key: 'timeoutMs', label: '超时（毫秒）', type: 'number', default: 5000 },
  ],
}

interface MbResponse {
  unitId: number
  pdu: Buffer
}

/**
 * 发一帧 Modbus TCP 请求，返回响应 PDU。
 * 超时、连接失败、异常码（PDU[0] & 0x80）都抛错，由调用方转成用户可读文案。
 */
export function modbusRequest(
  host: string,
  port: number,
  unitId: number,
  pdu: Buffer,
  timeoutMs: number
): Promise<MbResponse> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    let settled = false
    let buffer = Buffer.alloc(0)

    const finish = (err: Error | null, res?: MbResponse) => {
      if (settled) return
      settled = true
      socket.destroy()
      if (err) reject(err)
      else if (res) resolve(res)
    }

    socket.setTimeout(timeoutMs)
    socket.on('timeout', () => finish(new Error(`Modbus 响应超时（${timeoutMs}ms）`)))
    socket.on('error', (e) => finish(e instanceof Error ? e : new Error(String(e))))
    socket.on('close', () => finish(new Error('Modbus 连接被对端关闭')))

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk])
      if (buffer.length < 8) return
      const protocolId = buffer.readUInt16BE(2)
      const length = buffer.readUInt16BE(4) // unitId + PDU 长度
      if (protocolId !== 0) return finish(new Error('响应不是 Modbus TCP 帧'))
      if (buffer.length < 6 + length) return
      const respUnit = buffer.readUInt8(6)
      const respPdu = buffer.subarray(7, 6 + length)
      if (respPdu.length === 0) return finish(new Error('Modbus 响应为空'))
      if ((respPdu[0] & 0x80) !== 0) {
        const code = respPdu[1]
        return finish(new Error(`Modbus 异常码 ${code}（${describeException(code)}）`))
      }
      finish(null, { unitId: respUnit, pdu: respPdu })
    })

    socket.connect(port, host, () => {
      const txId = Math.floor(Math.random() * 0xffff)
      const header = Buffer.alloc(7)
      header.writeUInt16BE(txId, 0)
      header.writeUInt16BE(0, 2)
      header.writeUInt16BE(pdu.length + 1, 4)
      header.writeUInt8(unitId, 6)
      socket.write(Buffer.concat([header, pdu]))
    })
  })
}

function describeException(code: number): string {
  const map: Record<number, string> = {
    1: '非法功能码',
    2: '非法数据地址',
    3: '非法数据值',
    4: '从站设备故障',
    5: '确认（处理中）',
    6: '从站设备忙',
    8: '存储奇偶校验错',
    10: '网关路径不可用',
    11: '网关目标无响应',
  }
  return map[code] || '未知异常'
}

function encodeUint16(value: number, dataType: string): number {
  if (dataType === 'int16') {
    const v = Math.round(value)
    if (v < -32768 || v > 32767) throw new Error('值超出 int16 范围（-32768 ~ 32767）')
    return v < 0 ? v + 0x10000 : v
  }
  const v = Math.round(value)
  if (v < 0 || v > 65535) throw new Error('值超出 uint16 范围（0 ~ 65535）')
  return v
}

const adapter: ProtocolAdapter = {
  meta: MODBUS_META,

  validate(config) {
    const errors: string[] = []
    const host = cfgStr(config, 'host').trim()
    if (!host) errors.push('设备 IP 必填')
    else if (!/^[a-zA-Z0-9.\-]+$/.test(host)) errors.push('设备 IP / 主机名格式不对（不要带 http://）')
    const port = cfgNum(config, 'port', 502, 1, 65535)
    if (port === 0) errors.push('端口必须在 1-65535')
    const unitId = cfgNum(config, 'unitId', 1, 0, 255)
    if (unitId < 1) errors.push('从站地址通常为 1-247')
    return errors
  },

  async test(connection): Promise<TestResult> {
    const started = Date.now()
    const host = cfgStr(connection.config, 'host').trim()
    const port = cfgNum(connection.config, 'port', 502, 1, 65535)
    const unitId = cfgNum(connection.config, 'unitId', 1, 0, 255)
    const probe = cfgNum(connection.config, 'probeRegister', 0, 0, 65535)
    const timeout = cfgNum(connection.config, 'timeoutMs', 5000, 500, 30000)
    const pdu = Buffer.from([0x03, (probe >> 8) & 0xff, probe & 0xff, 0x00, 0x01])
    try {
      const res = await modbusRequest(host, port, unitId, pdu, timeout)
      const value = res.pdu.length >= 4 ? res.pdu.readUInt16BE(2) : null
      return {
        ok: true,
        detail: `已连通 ${host}:${port}，寄存器 ${probe} = ${value}（${Date.now() - started}ms）`,
        extra: { register: probe, value },
      }
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : String(e) }
    }
  },

  async send(ctx: SendContext): Promise<SendResult> {
    const started = Date.now()
    const host = cfgStr(ctx.connection.config, 'host').trim()
    const port = cfgNum(ctx.connection.config, 'port', 502, 1, 65535)
    const defaultUnit = cfgNum(ctx.connection.config, 'unitId', 1, 0, 255)
    const timeout = cfgNum(ctx.connection.config, 'timeoutMs', 5000, 500, 30000)
    const spec = ctx.spec
    const register = spec.register
    if (register === undefined) {
      return { ok: false, error: '该动作没有配置寄存器地址' }
    }
    const unitId = spec.slaveId ?? defaultUnit
    const registerType = spec.registerType || 'holding'
    const rawValue = ctx.vars.value !== undefined ? ctx.vars.value : ctx.vars.params
    const request: Record<string, unknown> = { protocol: 'modbus_tcp', host, port, unitId, register, registerType }

    try {
      let pdu: Buffer
      if (registerType === 'coil') {
        const truthy = rawValue === true || rawValue === 1 || rawValue === '1' || rawValue === 'true' || rawValue === 'on'
        pdu = Buffer.from([0x05, (register >> 8) & 0xff, register & 0xff, truthy ? 0xff : 0x00, 0x00])
        request.value = truthy
      } else if (registerType === 'holding') {
        const num = Number(Array.isArray(rawValue) ? rawValue[0] : rawValue)
        if (!Number.isFinite(num)) throw new Error('该寄存器需要数值')
        const encoded = encodeUint16(num, spec.dataType || 'uint16')
        pdu = Buffer.from([0x06, (register >> 8) & 0xff, register & 0xff, (encoded >> 8) & 0xff, encoded & 0xff])
        request.value = num
      } else {
        return { ok: false, error: `暂不支持写入 ${registerType} 类型的寄存器（只支持 holding / coil）` }
      }

      await modbusRequest(host, port, unitId, pdu, timeout)
      return { ok: true, request, response: 'written', durationMs: Date.now() - started }
    } catch (e) {
      return { ok: false, request, error: e instanceof Error ? e.message : String(e), durationMs: Date.now() - started }
    }
  },
}

/** 读取保持寄存器（供轮询/采集使用） */
export async function readHoldingRegisters(
  connection: ConnectionRecord,
  start: number,
  count: number
): Promise<number[]> {
  const host = cfgStr(connection.config, 'host').trim()
  const port = cfgNum(connection.config, 'port', 502, 1, 65535)
  const unitId = cfgNum(connection.config, 'unitId', 1, 0, 255)
  const timeout = cfgNum(connection.config, 'timeoutMs', 5000, 500, 30000)
  if (count < 1 || count > 125) throw new Error('一次最多读 125 个寄存器')
  const pdu = Buffer.from([0x03, (start >> 8) & 0xff, start & 0xff, (count >> 8) & 0xff, count & 0xff])
  const res = await modbusRequest(host, port, unitId, pdu, timeout)
  const byteCount = res.pdu[1]
  const out: number[] = []
  for (let i = 0; i < Math.min(count, byteCount / 2); i++) {
    out.push(res.pdu.readUInt16BE(2 + i * 2))
  }
  return out
}

export default adapter
