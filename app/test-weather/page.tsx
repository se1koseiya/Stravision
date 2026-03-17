'use client'

import { useState, useEffect } from 'react'

export default function TestWeatherPage() {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [weatherData, setWeatherData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取用户位置
  const getLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          })
        },
        (error) => {
          setError(`定位失败: ${error.message}`)
        }
      )
    } else {
      setError('浏览器不支持定位功能')
    }
  }

  // 获取天气数据
  const fetchWeather = async () => {
    if (!location) {
      setError('请先获取位置')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/weather?lat=${location.lat}&lon=${location.lon}`)
      const data = await response.json()

      if (data.error || data._error) {
        throw new Error(data.error || data._error)
      }

      setWeatherData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取天气失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getLocation()
  }, [])

  useEffect(() => {
    if (location) {
      fetchWeather()
    }
  }, [location])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          腾讯地图天气API测试
        </h1>

        {/* 位置信息 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
            当前位置
          </h2>
          {location ? (
            <div className="space-y-2">
              <p className="text-gray-700 dark:text-gray-300">
                纬度: <span className="font-mono">{location.lat.toFixed(6)}</span>
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                经度: <span className="font-mono">{location.lon.toFixed(6)}</span>
              </p>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">正在获取位置...</p>
          )}
          <button
            onClick={getLocation}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            重新获取位置
          </button>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <p className="text-gray-700 dark:text-gray-300">正在加载天气数据...</p>
          </div>
        )}

        {/* 天气数据 */}
        {weatherData && (
          <div className="space-y-6">
            {/* 数据来源 */}
            <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 px-4 py-3 rounded">
              数据来源: <span className="font-bold">{weatherData.locationSource}</span>
            </div>

            {/* 当前天气 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
                {weatherData.location?.name} - 实时天气
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">温度</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {weatherData.current?.temp_c}°C
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">天气</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {weatherData.current?.condition?.text}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">湿度</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {weatherData.current?.humidity}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">风向</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {weatherData.current?.wind_dir}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">风速</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {weatherData.current?.wind_kph} km/h
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">能见度</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {weatherData.current?.vis_km} km
                  </p>
                </div>
              </div>
            </div>

            {/* 未来天气预报 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
                未来天气预报
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weatherData.forecast?.forecastday?.map((day: any, index: number) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <p className="font-semibold text-gray-900 dark:text-white mb-2">
                      {day.date} {day.week}
                    </p>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700 dark:text-gray-300">
                        白天: {day.day?.condition?.text}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">
                        夜间: {day.night?.weather}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">
                        温度: {day.day?.mintemp_c}°C ~ {day.day?.maxtemp_c}°C
                      </p>
                      {day.sunrise && (
                        <p className="text-gray-700 dark:text-gray-300">
                          日出: {day.sunrise} | 日落: {day.sunset}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 原始数据 */}
            <details className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <summary className="text-xl font-semibold cursor-pointer text-gray-800 dark:text-white">
                查看原始数据
              </summary>
              <pre className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 rounded overflow-auto text-xs">
                {JSON.stringify(weatherData, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* 刷新按钮 */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={fetchWeather}
            disabled={!location || loading}
            className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '加载中...' : '刷新天气'}
          </button>
        </div>
      </div>
    </div>
  )
}
