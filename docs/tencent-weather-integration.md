# 腾讯地图天气API接入指南

## 概述

本项目已集成腾讯地图天气API，提供实时天气和未来7天天气预报功能。

## 功能特点

- 实时天气数据（温度、湿度、风向、风速、气压等）
- 支持经纬度定位
- 自动降级机制（腾讯地图 → xxapi → tianqiapi → Mock数据）
- 注意：腾讯地图实时天气API不包含预报数据，预报数据会从其他API获取

## 配置步骤

### 1. 注册腾讯地图开发者账号

访问 [腾讯位置服务](https://lbs.qq.com/) 注册账号

### 2. 创建应用并获取密钥

1. 登录 [控制台](https://lbs.qq.com/dev/console/application/mine)
2. 创建新应用
3. 添加 Key，选择 WebServiceAPI
4. 获取 Key 和 SK（可选，用于签名验证）

### 3. 配置环境变量

在 `.env` 或 `.env.local` 文件中添加：

```env
# 腾讯地图天气API
TENCENT_MAP_KEY=your_key_here
TENCENT_MAP_SK=your_sk_here  # 可选，用于签名验证
```

## API使用

### 请求示例

```javascript
// 使用经纬度获取天气（推荐，使用腾讯地图API）
const response = await fetch('/api/weather?lat=29.87&lon=121.55')

// 使用城市名获取天气（降级到其他API）
const response = await fetch('/api/weather?city=宁波')
```

### 响应格式

```json
{
  "location": {
    "name": "宁波市",
    "region": "浙江省",
    "district": "鄞州区",
    "country": "中国",
    "lat": 29.8114472174,
    "lon": 121.5631929886,
    "localtime": "2026-03-03 13:40"
  },
  "current": {
    "temp_c": 9,
    "condition": {
      "text": "多云",
      "code": 1003
    },
    "wind_kph": 15,
    "wind_dir": "北风",
    "wind_speed": "3级",
    "pressure_mb": 1023,
    "humidity": 66,
    "vis_km": 10,
    "visibility": "10km"
  },
  "forecast": {
    "forecastday": []
  },
  "locationSource": "tencent"
}
```

注意：腾讯地图实时天气API不提供预报数据，`forecast.forecastday` 将为空数组。如需预报数据，系统会自动降级到其他API。

## 在React组件中使用

### 使用WeatherContext

```tsx
import { useWeatherContext } from '@/lib/contexts/weather-context'

function MyComponent() {
  const { weatherData, loading, error, locationSource } = useWeatherContext()

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误: {error}</div>

  return (
    <div>
      <h2>{weatherData?.location?.name}</h2>
      <p>温度: {weatherData?.current?.temp_c}°C</p>
      <p>天气: {weatherData?.current?.condition?.text}</p>
      <p>数据来源: {locationSource}</p>
    </div>
  )
}
```

### 直接调用API

```tsx
'use client'

import { useState, useEffect } from 'react'

function WeatherWidget() {
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    // 获取用户位置
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords
      const response = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`)
      const data = await response.json()
      setWeather(data)
    })
  }, [])

  return (
    <div>
      {weather && (
        <>
          <h3>{weather.location.name}</h3>
          <p>{weather.current.temp_c}°C</p>
          <p>{weather.current.condition.text}</p>
        </>
      )}
    </div>
  )
}
```

## 测试

访问测试页面查看天气API是否正常工作：

```
http://localhost:3000/test-weather
```

该页面会：
1. 自动获取用户位置
2. 调用天气API
3. 显示实时天气和预报
4. 显示数据来源

## API降级策略

系统会按以下优先级尝试获取天气数据：

1. **腾讯地图天气API** - 需要经纬度参数，最准确
2. **xxapi.cn** - 需要城市名，备用方案
3. **tianqiapi.com** - 需要城市名，第二备用
4. **Mock数据** - 所有API都失败时返回模拟数据

## 天气代码映射

腾讯地图天气代码会自动映射到通用代码：

| 腾讯代码 | 天气现象 | 通用代码 |
|---------|---------|---------|
| 00 | 晴 | 1000 |
| 01 | 多云 | 1003 |
| 02 | 阴 | 1006 |
| 07 | 小雨 | 1189 |
| 08 | 中雨 | 1192 |
| 09 | 大雨 | 1195 |
| 14 | 小雪 | 1213 |
| 18 | 雾 | 1135 |
| ... | ... | ... |

完整映射请查看 `lib/services/tencent-weather-service.ts`

## 注意事项

1. 腾讯地图天气API需要经纬度参数才会被调用
2. 如果用户拒绝位置权限，系统会自动降级到其他API
3. 天气数据会缓存30分钟
4. 建议在生产环境配置 SK 以启用签名验证
5. 免费版API有调用次数限制，请查看腾讯地图控制台

## 相关文档

- [腾讯位置服务官网](https://lbs.qq.com/)
- [天气API文档](https://lbs.qq.com/service/webService/webServiceGuide/weatherinfo)
- [控制台](https://lbs.qq.com/dev/console/application/mine)

## 故障排查

### 问题：返回Mock数据

**原因**：
- 未配置 `TENCENT_MAP_KEY`
- 未提供经纬度参数
- API调用失败

**解决**：
1. 检查环境变量配置
2. 确保传递了 `lat` 和 `lon` 参数
3. 查看服务器日志了解具体错误

### 问题：定位失败

**原因**：
- 用户拒绝位置权限
- 浏览器不支持定位
- HTTPS要求（生产环境）

**解决**：
1. 引导用户授予位置权限
2. 提供手动选择城市的选项
3. 确保生产环境使用HTTPS

## 更新日志

### 2026-03-03
- ✅ 集成腾讯地图天气API
- ✅ 添加签名验证支持
- ✅ 创建测试页面
- ✅ 更新API降级策略
