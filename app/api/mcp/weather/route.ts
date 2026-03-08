import { NextRequest, NextResponse } from "next/server"

// 城市名称到经纬度的映射（常用城市）
const CITY_COORDS: Record<string, string> = {
  "北京": "116.4074,39.9042",
  "上海": "121.4737,31.2304",
  "广州": "113.2644,23.1291",
  "深圳": "114.0579,22.5431",
  "杭州": "120.1551,30.2741",
  "成都": "104.0668,30.5728",
  "重庆": "106.5516,29.5630",
  "武汉": "114.3055,30.5931",
  "西安": "108.9398,34.3416",
  "南京": "118.7969,32.0603",
  "天津": "117.2010,39.0842",
  "苏州": "120.5954,31.2989",
  "长沙": "112.9388,28.2282",
  "郑州": "113.6254,34.7466",
  "东莞": "113.7518,23.0209",
  "青岛": "120.3826,36.0671",
  "沈阳": "123.4328,41.8045",
  "宁波": "121.5440,29.8683",
  "昆明": "102.8329,24.8801",
  "合肥": "117.2272,31.8206"
}

// 彩云天气 API
async function getCaiyunWeather(location: string, token: string) {
  try {
    // 如果 location 是城市名，转换为经纬度
    const coords = CITY_COORDS[location] || location
    
    const url = `https://api.caiyunapp.com/v2.6/${token}/${coords}/weather.json`
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status === "ok") {
      const result = data.result
      return {
        provider: "caiyun",
        location: location,
        realtime: {
          temperature: result.realtime.temperature,
          humidity: result.realtime.humidity,
          skycon: result.realtime.skycon,
          precipitation: result.realtime.precipitation.local.intensity,
          wind: result.realtime.wind
        },
        forecast: result.daily
      }
    }
    throw new Error(data.error || "获取天气失败")
  } catch (error) {
    throw error
  }
}

// 高德天气 API
async function getGaodeWeather(city: string, key: string) {
  try {
    const url = `https://restapi.amap.com/v3/weather/weatherInfo?city=${encodeURIComponent(city)}&key=${key}&extensions=all`
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status === "1") {
      return {
        provider: "gaode",
        city: data.forecasts[0].city,
        realtime: data.forecasts[0].casts[0],
        forecast: data.forecasts[0].casts
      }
    }
    throw new Error(data.info || "获取天气失败")
  } catch (error) {
    throw error
  }
}

// 和风天气 API
async function getHefengWeather(location: string, key: string) {
  try {
    // 实时天气
    const nowUrl = `https://devapi.qweather.com/v7/weather/now?location=${location}&key=${key}`
    const nowResponse = await fetch(nowUrl)
    const nowData = await nowResponse.json()
    
    // 7天预报
    const forecastUrl = `https://devapi.qweather.com/v7/weather/7d?location=${location}&key=${key}`
    const forecastResponse = await fetch(forecastUrl)
    const forecastData = await forecastResponse.json()
    
    if (nowData.code === "200" && forecastData.code === "200") {
      return {
        provider: "hefeng",
        realtime: nowData.now,
        forecast: forecastData.daily
      }
    }
    throw new Error("获取天气失败")
  } catch (error) {
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { provider, location, city, apiKey } = body

    if (!apiKey) {
      return NextResponse.json({ error: "缺少 API Key" }, { status: 400 })
    }

    let weatherData

    switch (provider) {
      case "caiyun":
        // 彩云天气支持城市名或经纬度
        const caiyunLocation = city || location || "北京"
        weatherData = await getCaiyunWeather(caiyunLocation, apiKey)
        break
      
      case "gaode":
        if (!city) {
          return NextResponse.json({ error: "缺少城市名称" }, { status: 400 })
        }
        weatherData = await getGaodeWeather(city, apiKey)
        break
      
      case "hefeng":
        // 和风天气支持城市名或 location ID
        const hefengLocation = city || location || "北京"
        weatherData = await getHefengWeather(hefengLocation, apiKey)
        break
      
      default:
        return NextResponse.json({ error: "不支持的天气服务商" }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: weatherData })
  } catch (error: any) {
    console.error("Weather API error:", error)
    return NextResponse.json(
      { error: error.message || "获取天气数据失败" },
      { status: 500 }
    )
  }
}
