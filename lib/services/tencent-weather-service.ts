/**
 * 腾讯地图天气服务
 * 文档: https://lbs.qq.com/service/webService/webServiceGuide/weatherinfo
 */

import crypto from 'crypto'

interface TencentWeatherParams {
  location: string // 经纬度，格式: "纬度,经度"
  key: string
  sig?: string // 签名（如果配置了SK）
}

interface TencentWeatherResponse {
  status: number
  message: string
  request_id: string
  result?: {
    realtime: Array<{
      province: string
      city: string
      district: string
      adcode: number
      update_time: string
      infos: {
        weather: string
        temperature: number
        wind_direction: string
        wind_power: string
        wind_power_v2: string
        humidity: number
        air_pressure: number
      }
    }>
  }
}

/**
 * 生成腾讯地图API签名
 */
function generateSignature(path: string, params: Record<string, string>, sk: string): string {
  // 1. 对参数按key进行字典排序
  const sortedKeys = Object.keys(params).sort()
  
  // 2. 拼接参数
  const paramStr = sortedKeys.map(key => `${key}=${params[key]}`).join('&')
  
  // 3. 拼接请求路径和参数
  const str = `${path}?${paramStr}${sk}`
  
  // 4. MD5加密
  return crypto.createHash('md5').update(str).digest('hex')
}

/**
 * 获取腾讯地图天气数据
 */
export async function getTencentWeather(
  lat: number,
  lon: number,
  key: string,
  sk?: string
): Promise<TencentWeatherResponse> {
  const location = `${lat},${lon}`
  const path = '/ws/weather/v1/'
  
  const params: Record<string, string> = {
    location,
    key
  }
  
  // 如果配置了SK，生成签名
  if (sk) {
    params.sig = generateSignature(path, params, sk)
  }
  
  const queryString = new URLSearchParams(params).toString()
  const url = `https://apis.map.qq.com${path}?${queryString}`
  
  console.log('[Tencent Weather] Request URL:', url.replace(key, 'KEY_HIDDEN'))
  
  const response = await fetch(url, {
    next: { revalidate: 1800 }, // 30分钟缓存
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  })
  
  console.log('[Tencent Weather] Response status:', response.status)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Tencent Weather] Error response:', errorText)
    throw new Error(`Tencent Weather API request failed: ${response.status}`)
  }
  
  const data = await response.json()
  console.log('[Tencent Weather] Response data:', JSON.stringify(data).substring(0, 200))
  
  if (data.status !== 0) {
    console.error('[Tencent Weather] API error:', data.status, data.message)
    throw new Error(`Tencent Weather API error: ${data.message}`)
  }
  
  return data
}

/**
 * 将腾讯天气代码映射到通用代码
 * 注意：腾讯实时天气API返回的是中文描述，不是代码
 * 这个函数保留用于未来可能的扩展
 */
export function mapTencentWeatherCode(code: string): number {
  // 腾讯实时天气API不返回代码，这里保留用于未来扩展
  return 1000
}
