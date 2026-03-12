/**
 * 测试腾讯地图天气API
 * 运行: node test-tencent-weather.js
 */

require('dotenv').config({ path: '.env' })
const crypto = require('crypto')

const TENCENT_MAP_KEY = process.env.TENCENT_MAP_KEY
const TENCENT_MAP_SK = process.env.TENCENT_MAP_SK

// 宁波的经纬度
const lat = 29.8114472174
const lon = 121.5631929886

console.log('=== 腾讯地图天气API测试 ===\n')
console.log('配置信息:')
console.log('- KEY:', TENCENT_MAP_KEY ? `${TENCENT_MAP_KEY.substring(0, 10)}...` : '未配置')
console.log('- SK:', TENCENT_MAP_SK ? `${TENCENT_MAP_SK.substring(0, 10)}...` : '未配置')
console.log('- 位置:', `${lat}, ${lon}`)
console.log()

if (!TENCENT_MAP_KEY) {
  console.error('错误: 未配置 TENCENT_MAP_KEY')
  process.exit(1)
}

// 生成签名
function generateSignature(path, params, sk) {
  const sortedKeys = Object.keys(params).sort()
  const paramStr = sortedKeys.map(key => `${key}=${params[key]}`).join('&')
  const str = `${path}?${paramStr}${sk}`
  return crypto.createHash('md5').update(str).digest('hex')
}

async function testTencentWeather() {
  const location = `${lat},${lon}`
  const path = '/ws/weather/v1/'
  
  const params = {
    location,
    key: TENCENT_MAP_KEY
  }
  
  // 如果配置了SK，生成签名
  if (TENCENT_MAP_SK) {
    params.sig = generateSignature(path, params, TENCENT_MAP_SK)
    console.log('已生成签名:', params.sig.substring(0, 10) + '...')
  }
  
  const queryString = new URLSearchParams(params).toString()
  const url = `https://apis.map.qq.com${path}?${queryString}`
  
  console.log('请求URL:', url.replace(TENCENT_MAP_KEY, 'KEY_HIDDEN'))
  console.log()
  
  try {
    console.log('发送请求...')
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })
    
    console.log('响应状态:', response.status, response.statusText)
    
    const data = await response.json()
    
    console.log('\n=== 响应数据 ===')
    console.log(JSON.stringify(data, null, 2))
    
    if (data.status === 0) {
      console.log('\n✅ 成功获取天气数据!')
      const realtime = data.result.realtime[0]
      console.log('- 地点:', `${realtime.province} ${realtime.city} ${realtime.district}`)
      console.log('- 温度:', realtime.infos.temperature + '°C')
      console.log('- 天气:', realtime.infos.weather)
      console.log('- 湿度:', realtime.infos.humidity + '%')
      console.log('- 风向:', realtime.infos.wind_direction)
      console.log('- 风力:', realtime.infos.wind_power_v2)
      console.log('- 气压:', realtime.infos.air_pressure + 'hPa')
      console.log('- 更新时间:', realtime.update_time)
    } else {
      console.error('\n❌ API返回错误:')
      console.error('- 状态码:', data.status)
      console.error('- 错误信息:', data.message)
    }
  } catch (error) {
    console.error('\n❌ 请求失败:', error.message)
    console.error(error)
  }
}

testTencentWeather()
