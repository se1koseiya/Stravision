/**
 * Weather API Route
 * 
 * 优先级顺序:
 * 1. 腾讯地图天气API (需配置 TENCENT_MAP_KEY)
 * 2. xxapi.cn (需配置 WEATHER_API_KEY)
 * 3. tianqiapi.com (需配置 TIANQI_APPID)
 * 4. Mock数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTencentWeather, mapTencentWeatherCode } from '@/lib/services/tencent-weather-service'

function mapWeatherToCode(wea: string): number {
  if (!wea) return 1000
  const map: Record<string, number> = {
    '晴': 1000, '多云': 1003, '阴': 1009, '阵雨': 1063, '雷阵雨': 1087,
    '小雨': 1183, '中雨': 1189, '大雨': 1195, '暴雨': 1195,
    '小雪': 1213, '中雪': 1219, '大雪': 1225, '暴雪': 1225,
    '雾': 1135, '霾': 1030, '沙尘暴': 1030,
  }
  for (const [key, code] of Object.entries(map)) {
    if (wea.includes(key)) return code
  }
  return 1000
}

function parseTemp(temp: string | number): number {
  if (typeof temp === 'number') return temp
  if (!temp) return 0
  return parseInt(String(temp).replace(/[℃°]/g, ''), 10) || 0
}

function parseWindSpeed(ws: string): number {
  if (!ws) return 0
  if (ws.includes('km/h')) return parseInt(ws, 10) || 0
  const map: Record<string, number> = {
    '0级': 2, '1级': 5, '2级': 10, '3级': 15, '4级': 25,
    '5级': 35, '6级': 45, '7级': 55, '8级': 70,
  }
  for (const [k, v] of Object.entries(map)) {
    if (ws.includes(k)) return v
  }
  return 10
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const city = searchParams.get('city') || '宁波'
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  // 1. 优先使用腾讯地图天气API (如果配置了 key 且有经纬度)
  const tencentKey = process.env.TENCENT_MAP_KEY
  const tencentSk = process.env.TENCENT_MAP_SK
  
  console.log('[Weather API] Request params:', { city, lat, lon })
  console.log('[Weather API] Tencent config:', { 
    hasKey: !!tencentKey, 
    hasSk: !!tencentSk,
    keyPrefix: tencentKey?.substring(0, 10)
  })
  
  if (tencentKey && lat && lon) {
    try {
      console.log('[Weather API] Trying Tencent Map API for', lat, lon)
      const data = await getTencentWeather(parseFloat(lat), parseFloat(lon), tencentKey, tencentSk)
      
      if (data.status === 0 && data.result?.realtime?.[0]) {
        const realtime = data.result.realtime[0]
        const infos = realtime.infos
        
        // 解析风力等级为风速 (km/h)
        const windPowerMap: Record<string, number> = {
          '0级': 2, '1级': 5, '2级': 10, '3级': 15, '4级': 25,
          '5级': 35, '6级': 45, '7级': 55, '8级': 70,
        }
        const windSpeed = windPowerMap[infos.wind_power_v2] || 10
        
        const response = {
          location: {
            name: realtime.city,
            region: realtime.province,
            district: realtime.district,
            country: '中国',
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            localtime: realtime.update_time
          },
          current: {
            temp_c: infos.temperature,
            condition: {
              text: infos.weather,
              code: mapWeatherToCode(infos.weather)
            },
            wind_kph: windSpeed,
            wind_dir: infos.wind_direction,
            wind_speed: infos.wind_power_v2,
            pressure_mb: infos.air_pressure,
            humidity: infos.humidity,
            vis_km: 10, // 腾讯API不提供能见度，使用默认值
            visibility: '10km'
          },
          forecast: {
            forecastday: [] // 腾讯实时天气API不提供预报，需要单独调用预报接口
          },
          locationSource: 'tencent'
        }
        
        console.log('[Weather API] Tencent Map API success for', realtime.city)
        return NextResponse.json(response)
      }
    } catch (e) {
      console.error('[Weather API] Tencent Map API failed:', e)
      // 继续尝试其他API
    }
  }

  // 2. 尝试使用 xxapi (如果配置了 key)
  const xxKey = process.env.WEATHER_API_KEY
  if (xxKey) {
    try {
      // xxapi 必传 city 和 key
      const url = `https://v2.xxapi.cn/api/weather?city=${encodeURIComponent(city)}&key=${xxKey}`
      const res = await fetch(url, {
        next: { revalidate: 1800 }, // 30分钟缓存
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      
      if (res.ok) {
        const json = await res.json()
        if (json.code === 200 && json.data && Array.isArray(json.data.data)) {
          const d = json.data
          const days = d.data
          const today = days[0] || {}
          
          // xxapi 没有直接的实况温度，取今日最高最低的平均值，或者根据时间取
          // 简单的平均值策略
          const tMax = parseFloat(today.tempMax)
          const tMin = parseFloat(today.tempMin)
          const currentTemp = Math.round((tMax + tMin) / 2)
          
          // 判断当前是白天还是晚上
          const hour = new Date().getHours()
          const isDay = hour >= 6 && hour < 18
          const currentConditionText = isDay ? today.textDay : today.textNight
          
          const response = {
            location: {
              name: d.city?.CityZHNorm || d.city?.NameZHNorm || city,
              region: d.city?.Adm2NameZH || '',
              country: '中国',
              lat: parseFloat(d.city?.Latitude || '0'),
              lon: parseFloat(d.city?.Longitude || '0'),
              localtime: new Date().toISOString()
            },
            current: {
              temp_c: isNaN(currentTemp) ? 0 : currentTemp,
              condition: {
                text: currentConditionText || '未知',
                code: mapWeatherToCode(currentConditionText || '')
              },
              wind_kph: parseFloat(today.windSpeedDay || '0'),
              wind_dir: isDay ? today.windDirDay : today.windDirNight,
              wind_speed: isDay ? today.windScaleDay : today.windScaleNight,
              pressure_mb: parseFloat(today.pressure || '1013'),
              humidity: parseFloat(today.humidity || '60'),
              vis_km: parseFloat(today.vis || '10'),
              sunrise: today.sunrise,
              sunset: today.sunset,
              rain_pcpn: today.precip
            },
            forecast: {
              forecastday: days.map((day: any) => ({
                date: day.fxDate,
                day: {
                  maxtemp_c: parseFloat(day.tempMax),
                  mintemp_c: parseFloat(day.tempMin),
                  avgtemp_c: (parseFloat(day.tempMax) + parseFloat(day.tempMin)) / 2,
                  condition: {
                    text: day.textDay,
                    code: mapWeatherToCode(day.textDay)
                  },
                  maxwind_kph: parseFloat(day.windSpeedDay || '0'),
                  avghumidity: parseFloat(day.humidity || '0'),
                  daily_chance_of_rain: day.textDay?.includes('雨') ? 60 : 0
                },
                night: {
                  weather: day.textNight,
                  temperature: parseFloat(day.tempMin),
                  wind_direction: day.windDirNight
                },
                wind: day.windDirDay,
                wind_speed: day.windScaleDay
              }))
            },
            locationSource: 'xxapi'
          }
          
          console.log('[Weather API] xxapi success for', city)
          return NextResponse.json(response)
        } else {
          console.warn('[Weather API] xxapi returned error or empty data:', json.msg)
        }
      }
    } catch (e) {
      console.error('[Weather API] xxapi failed:', e)
    }
  }

  // 3. 降级使用 tianqiapi (原有逻辑)
  try {
    const appid = process.env.TIANQI_APPID
    const appsecret = process.env.TIANQI_APPSECRET
    
    if (!appid || !appsecret) {
      console.log('[Weather API] No backup credentials (TIANQI), using mock')
      return NextResponse.json(generateMockResponse(city))
    }
    
    // ... Tianqi API logic ...
    // 并行请求两个接口
    const [realtimeRes, weekRes] = await Promise.all([
      fetch(`http://gfeljm.tianqiapi.com/free/v2030?appid=${appid}&appsecret=${appsecret}&city=${encodeURIComponent(city)}&hours=1&aqi=1&unescape=1`, {
        next: { revalidate: 300 },
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }),
      fetch(`http://v1.yiketianqi.com/free/week?appid=${appid}&appsecret=${appsecret}&city=${encodeURIComponent(city)}&unescape=1`, {
        next: { revalidate: 1800 },
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
    ])
    
    const realtime = realtimeRes.ok ? await realtimeRes.json() : null
    const week = weekRes.ok ? await weekRes.json() : null
    
    if ((!realtime || realtime.errcode) && (!week || week.errcode)) {
      return NextResponse.json({
        ...generateMockResponse(city),
        _error: realtime?.errmsg || week?.errmsg || 'API failed'
      })
    }
    
    console.log('[Weather API] tianqiapi success for', city)
    
    const data = realtime || {}
    const weekData = week?.data || []
    
    const response = {
      location: {
        name: data.city || week?.city || city,
        region: data.city || week?.city || city,
        country: data.country || '中国',
        lat: 29.87,
        lon: 121.55,
        localtime: `${data.date || ''} ${data.update_time || ''}`.trim() || new Date().toISOString()
      },
      current: {
        temp_c: parseTemp(data.tem),
        condition: {
          text: data.wea || '未知',
          code: mapWeatherToCode(data.wea),
          wea_img: data.wea_img
        },
        wind_kph: parseWindSpeed(data.win_meter || data.win_speed),
        wind_dir: data.win,
        wind_speed: data.win_speed,
        pressure_mb: parseInt(data.pressure || '1013', 10),
        humidity: parseInt((data.humidity || '65').replace('%', ''), 10),
        visibility: data.visibility,
        vis_km: parseFloat((data.visibility || '10').replace('km', '')) || 10,
        air: data.air,
        air_pm25: data.air_pm25,
        air_level: data.air_level,
        air_tips: data.air_tips,
        sunrise: data.sunrise,
        sunset: data.sunset,
        rain_pcpn: data.rain_pcpn
      },
      forecast: {
        forecastday: weekData.length > 0 ? weekData.map((d: any) => ({
          date: d.date,
          day: {
            maxtemp_c: parseTemp(d.tem_day),
            mintemp_c: parseTemp(d.tem_night),
            avgtemp_c: (parseTemp(d.tem_day) + parseTemp(d.tem_night)) / 2,
            condition: {
              text: d.wea,
              code: mapWeatherToCode(d.wea),
              wea_img: d.wea_img
            },
            maxwind_kph: parseWindSpeed(d.win_speed),
            avghumidity: 65,
            daily_chance_of_rain: d.wea?.includes('雨') ? 60 : 0
          },
          night: {
            weather: d.wea,
            temperature: parseTemp(d.tem_night),
            wind_direction: d.win
          },
          wind: d.win,
          wind_speed: d.win_speed
        })) : [{
          date: data.date,
          day: {
            maxtemp_c: parseTemp(data.tem1),
            mintemp_c: parseTemp(data.tem2),
            avgtemp_c: (parseTemp(data.tem1) + parseTemp(data.tem2)) / 2,
            condition: { text: data.wea_day || data.wea, code: mapWeatherToCode(data.wea) }
          },
          night: { weather: data.wea_night, temperature: parseTemp(data.tem2) }
        }]
      },
      hours: (data.hours || []).map((h: any) => ({
        time: h.hours,
        temp_c: parseTemp(h.tem),
        condition: { text: h.wea, wea_img: h.wea_img, code: mapWeatherToCode(h.wea) },
        wind_dir: h.win,
        wind_speed: h.win_speed,
        visibility: h.vis,
        aqi: h.aqi
      })),
      alarm: data.alarm || [],
      aqi: data.aqi || null,
      locationSource: 'tianqiapi'
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('[Weather API] Error:', error)
    return NextResponse.json({
      ...generateMockResponse(city),
      _error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

function generateMockResponse(city: string) {
  const now = new Date()
  
  // 生成7天预报
  const forecast = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    const weathers = ['晴', '多云', '阴', '小雨', '晴', '多云', '晴']
    const wea = weathers[i % 7]
    const baseTemp = 8 + Math.sin(i * 0.5) * 3
    forecast.push({
      date: d.toISOString().split('T')[0],
      day: {
        maxtemp_c: Math.round(baseTemp + 5 + Math.random() * 3),
        mintemp_c: Math.round(baseTemp - 2 + Math.random() * 2),
        avgtemp_c: Math.round(baseTemp + 2),
        condition: { text: wea, code: mapWeatherToCode(wea) },
        maxwind_kph: 10 + Math.round(Math.random() * 10),
        avghumidity: 60 + Math.round(Math.random() * 20),
        daily_chance_of_rain: wea.includes('雨') ? 60 : 0
      },
      night: { weather: '多云', temperature: Math.round(baseTemp - 2), wind_direction: '东北风' },
      wind: '东北风',
      wind_speed: '2-3级'
    })
  }
  
  // 生成24小时预报
  const hours = []
  for (let i = 0; i < 24; i++) {
    const h = new Date(now)
    h.setHours(now.getHours() + i)
    const temp = 8 + Math.sin((h.getHours() - 6) * Math.PI / 12) * 4
    hours.push({
      time: i === 0 ? '现在' : `${h.getHours().toString().padStart(2, '0')}:00`,
      temp_c: Math.round(temp),
      condition: { text: '多云', code: 1003 },
      wind_dir: '东北风',
      wind_speed: '2级',
      aqi: '优'
    })
  }
  
  return {
    location: { name: city, region: '浙江省', country: '中国', lat: 29.87, lon: 121.55, localtime: now.toISOString() },
    current: {
      temp_c: 8,
      condition: { text: '多云', code: 1003 },
      wind_kph: 12, wind_dir: '东北风', wind_speed: '3级',
      pressure_mb: 1018, humidity: 72, visibility: '10km', vis_km: 10,
      air: '42', air_pm25: '14', air_level: '优', air_tips: '空气很好，可以外出活动',
      sunrise: '06:45', sunset: '17:30'
    },
    forecast: { forecastday: forecast },
    hours,
    locationSource: 'mock',
    _notice: 'Please configure WEATHER_API_KEY in .env.local'
  }
}
