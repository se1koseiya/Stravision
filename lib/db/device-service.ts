import { initDB, query, execute } from "./database"

export interface SensorData {
  temperature: number
  humidity: number
  light: number
  co2: number
  soil_moisture: number
  earth_n: number
  earth_p: number
  earth_k: number
  rainfall: number
}

export interface SensorReading extends SensorData {
  id: number
  device_id: string
  created_at: number
}

/**
 * 保存传感器读数
 */
export async function saveSensorReading(data: SensorData) {
  await initDB()
  await execute(
    `INSERT INTO sensor_readings (
       temperature, humidity, light, co2,
       soil_moisture, earth_n, earth_p, earth_k, rainfall,
       created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      data.temperature,
      data.humidity,
      data.light,
      data.co2,
      data.soil_moisture,
      data.earth_n,
      data.earth_p,
      data.earth_k,
      data.rainfall,
      Date.now()
    ]
  )
}

/**
 * 获取传感器历史数据
 * @param type 数据类型 (temperature, humidity, etc.)
 * @param range 时间范围 (1h, 1d, 7d)
 */
export async function getSensorHistory(type: string, range: string) {
  await initDB()
  let startTime = Date.now()
  let interval = 0 // 聚合间隔（秒），0表示不聚合
  
  switch (range) {
    case '10m':
      startTime -= 10 * 60 * 1000
      break
    case '1h':
      startTime -= 60 * 60 * 1000
      break
    case '7h':
      startTime -= 7 * 60 * 60 * 1000
      interval = 5 * 60 // 5分钟聚合一次
      break
    case '1d':
      startTime -= 24 * 60 * 60 * 1000
      interval = 30 * 60 // 30分钟聚合一次
      break
    case '7d':
      startTime -= 7 * 24 * 60 * 60 * 1000
      interval = 4 * 60 * 60 // 4小时聚合一次
      break
    default:
      startTime -= 60 * 60 * 1000
  }

  // 映射前端字段名到数据库列名
  const colMap: Record<string, string> = {
    'temperature': 'temperature',
    'humidity': 'humidity',
    'light': 'light',
    'co2': 'co2',
    'soilMoisture': 'soil_moisture',
    'fertility': 'earth_n', // 特殊处理，稍后计算
    'nitrogen': 'earth_n',
    'phosphorus': 'earth_p',
    'potassium': 'earth_k',
    'rainfall': 'rainfall'
  }

  // 严格白名单校验：未在 colMap 中的 type 一律拒绝，避免列名被拼接进 SQL 文本
  const col = colMap[type]
  if (!col) {
    return []
  }

  // 如果是 fertility，需要取 NPK 三个字段来计算
  if (type === 'fertility') {
    const rows = await query<any>(
      `SELECT created_at as timestamp, earth_n, earth_p, earth_k
       FROM sensor_readings
       WHERE created_at > $1
       ORDER BY created_at ASC`,
      [startTime]
    )
    
    // 降采样
    const filteredRows = downsample(rows, interval)
    
    return filteredRows.map(row => {
      // N: 0-200 -> 0-100%
      const nScore = Math.min(100, (row.earth_n / 200) * 100)
      // P: 0-100 -> 0-100%
      const pScore = Math.min(100, (row.earth_p / 100) * 100)
      // K: 0-300 -> 0-100%
      const kScore = Math.min(100, (row.earth_k / 300) * 100)
      const fertility = (nScore + pScore + kScore) / 3
      return {
        timestamp: Number(row.timestamp),
        value: Number(fertility.toFixed(1))
      }
    })
  }

  // 常规查询
  const queryStr = `
    SELECT created_at as timestamp, ${col} as value
    FROM sensor_readings 
    WHERE created_at > $1
    ORDER BY created_at ASC
  `
  
  const rows = await query<{ timestamp: number; value: number }>(queryStr, [startTime])
  
  const result = downsample(rows, interval)
  
  // Format values to fixed precision
  return result.map(item => {
    let val = Number(item.value)
    // Fix legacy data scaling for soil moisture (if > 100, it's likely unscaled 212 instead of 21.2)
    if ((type === 'soilMoisture' || type === 'earth_water') && val > 100) {
      val = val / 10
    }
    return {
      ...item,
      timestamp: Number(item.timestamp),
      value: Number(val.toFixed(1))
    }
  })
}

// 简单的降采样/抽稀函数
function downsample(data: any[], intervalSeconds: number) {
  if (intervalSeconds <= 0 || data.length < 50) return data
  
  const result = []
  let lastTime = 0
  
  for (const item of data) {
    if (item.timestamp - lastTime >= intervalSeconds * 1000) {
      result.push(item)
      lastTime = item.timestamp
    }
  }
  
  return result
}

/**
 * 清理旧的传感器数据 (保留最近7天)
 */
export async function cleanupOldSensorData() {
  await initDB()
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  const result = await execute("DELETE FROM sensor_readings WHERE created_at < $1", [sevenDaysAgo])
  if (result.rowCount > 0) {
    console.log(`[System] Cleaned up ${result.rowCount} old sensor records.`)
  }
}

/**
 * 清除所有传感器数据（用于重置或修复数据）
 */
export async function clearAllSensorData() {
  await initDB()
  const result = await execute("DELETE FROM sensor_readings")
  console.log(`[System] Cleared all ${result.rowCount} sensor records.`)
}

// ─── 指标元信息（单位 + 中文名 + 列名映射）───
const METRIC_META: Record<string, { unit: string; label: string; col: string }> = {
  temperature:  { unit: '°C',  label: '温度',   col: 'temperature' },
  humidity:     { unit: '%',   label: '湿度',   col: 'humidity' },
  light:        { unit: 'lux', label: '光照',   col: 'light' },
  co2:          { unit: 'ppm', label: 'CO2',   col: 'co2' },
  soilMoisture: { unit: '%',   label: '土壤湿度', col: 'soil_moisture' },
  nitrogen:     { unit: 'mg/kg', label: '氮含量', col: 'earth_n' },
  phosphorus:   { unit: 'mg/kg', label: '磷含量', col: 'earth_p' },
  potassium:    { unit: 'mg/kg', label: '钾含量', col: 'earth_k' },
  rainfall:     { unit: 'mm',  label: '雨量',   col: 'rainfall' },
}

/**
 * 查询多个传感器指标的历史数据（供 AI 工具调用）
 *
 * 与 getSensorHistory 的区别：
 * - 一次查询多个指标，减少 DB 往返
 * - 返回结构含统计摘要（min/max/avg/latest），AI 无需自己计算
 * - 自动降采样，避免返回过多数据点
 *
 * @param metrics 指标列表（如 ['temperature', 'humidity']）
 * @param range 时间范围（10m/1h/7h/1d/7d）
 */
export async function getMultiSensorHistory(
  metrics: string[],
  range: string = '1h'
): Promise<{
  range: string;
  metrics: Array<{
    key: string;
    label: string;
    unit: string;
    points: Array<{ timestamp: number; value: number }>;
    stats: { min: number; max: number; avg: number; latest: number; count: number };
  }>;
}> {
  await initDB()

  // 时间范围 → 起始时间 + 降采样间隔
  let startTime = Date.now()
  let interval = 0
  switch (range) {
    case '10m': startTime -= 10 * 60 * 1000; break
    case '1h':  startTime -= 60 * 60 * 1000; break
    case '7h':  startTime -= 7 * 60 * 60 * 1000;  interval = 5 * 60; break
    case '1d':  startTime -= 24 * 60 * 60 * 1000; interval = 30 * 60; break
    case '7d':  startTime -= 7 * 24 * 60 * 60 * 1000; interval = 4 * 60 * 60; break
    default:    startTime -= 60 * 60 * 1000
  }

  const results: any[] = []

  for (const metric of metrics) {
    const meta = METRIC_META[metric]
    if (!meta) continue // 严格白名单

    // fertility 需要综合计算 NPK
    if (metric === 'fertility') {
      // 取 N/P/K 三个字段，计算综合肥力
      const rows = await query(
        `SELECT earth_n, earth_p, earth_k, created_at
         FROM sensor_readings
         WHERE created_at >= $1
         ORDER BY created_at ASC`,
        [startTime]
      )
      const points = rows.map((r: any) => ({
        timestamp: Number(r.created_at),
        value: Number((Number(r.earth_n) + Number(r.earth_p) + Number(r.earth_k)).toFixed(1))
      }))
      const sampled = downsample(points, interval)
      results.push({
        key: 'fertility',
        label: '综合肥力',
        unit: 'mg/kg',
        points: sampled,
        stats: calcStats(sampled.map(p => p.value))
      })
      continue
    }

    const rows = await query(
      `SELECT ${meta.col} as value, created_at
       FROM sensor_readings
       WHERE created_at >= $1 AND ${meta.col} IS NOT NULL
       ORDER BY created_at ASC`,
      [startTime]
    )

    let points = rows.map((r: any) => ({
      timestamp: Number(r.created_at),
      value: Number(Number(r.value).toFixed(1))
    }))

    // 旧数据土壤湿度缩放修复
    if (metric === 'soilMoisture') {
      points = points.map(p => ({
        timestamp: p.timestamp,
        value: p.value > 100 ? Number((p.value / 10).toFixed(1)) : p.value
      }))
    }

    const sampled = downsample(points, interval)
    results.push({
      key: metric,
      label: meta.label,
      unit: meta.unit,
      points: sampled,
      stats: calcStats(sampled.map(p => p.value))
    })
  }

  return { range, metrics: results }
}

/** 计算统计摘要 */
function calcStats(values: number[]): { min: number; max: number; avg: number; latest: number; count: number } {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, latest: 0, count: 0 }
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const sum = values.reduce((a, b) => a + b, 0)
  const avg = sum / values.length
  const latest = values[values.length - 1]
  return {
    min: Number(min.toFixed(1)),
    max: Number(max.toFixed(1)),
    avg: Number(avg.toFixed(1)),
    latest: Number(latest.toFixed(1)),
    count: values.length
  }
}
