# 天气 API 优化说明

## 问题
之前每个页面都独立调用 `useWeather` hook，导致：
- Dashboard 页面请求一次 API
- Monitor 页面请求一次 API  
- Weather Card 组件请求一次 API
- 浪费 API 配额，增加响应时间

## 解决方案
创建全局的 `WeatherContext`，整个应用共享同一份天气数据。

## 实现细节

### 1. WeatherContext (`lib/contexts/weather-context.tsx`)
- 在应用根部创建 Context Provider
- 只请求一次 API
- 每 30 分钟自动刷新数据
- 提供 `refetch()` 方法手动刷新

### 2. 根布局更新 (`app/layout.tsx`)
```tsx
<WeatherProvider>
  {children}
</WeatherProvider>
```

### 3. 页面和组件更新
所有需要天气数据的地方改用：
```tsx
const { weatherData, loading, error } = useWeatherContext()
```

替代原来的：
```tsx
const { weatherData, loading, error } = useWeather()
```

## 优化效果

### 之前
- 3 个页面/组件 = 3 次 API 请求
- 每次切换页面都重新请求
- 浪费配额

### 现在
- 整个应用 = 1 次 API 请求
- 所有页面共享数据
- 30 分钟自动刷新
- 节省 66% 的 API 调用

## 使用的文件

### 新增
- `lib/contexts/weather-context.tsx` - 天气数据 Context

### 修改
- `app/layout.tsx` - 添加 WeatherProvider
- `app/dashboard/page.tsx` - 使用 useWeatherContext
- `app/monitor/page.tsx` - 使用 useWeatherContext
- `components/weather-card.tsx` - 使用 useWeatherContext

### 保留（未使用）
- `lib/hooks/use-weather.ts` - 保留以备将来需要独立使用

## 数据流

```
App Start
    ↓
WeatherProvider (Root Layout)
    ↓
Fetch API (一次)
    ↓
    ├─→ Dashboard Page
    ├─→ Monitor Page
    └─→ Weather Card Component
    
所有组件共享同一份数据
```

## 注意事项
- 如果需要手动刷新天气数据，可以调用 `refetch()` 方法
- 数据会自动每 30 分钟刷新一次
- 如果 API 请求失败，所有组件都会收到错误状态
