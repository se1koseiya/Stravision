/**
 * Custom Hook for Weather Data
 * 
 * Fetches weather data from WeatherAPI.com using geolocation
 */

import { useState, useEffect } from 'react'

export interface WeatherDay {
  date: string
  day: {
    maxtemp_c: number
    mintemp_c: number
    avgtemp_c: number
    condition: {
      text: string
      icon: string
      code: number
    }
    maxwind_kph: number
    avghumidity: number
    totalprecip_mm: number
    daily_chance_of_rain: number
  }
}

export interface WeatherData {
  location: {
    name: string
    region: string
    country: string
    lat: number
    lon: number
    localtime: string
  }
  current: {
    temp_c: number
    condition: {
      text: string
      icon: string
      code: number
    }
    wind_kph: number
    wind_dir: string
    pressure_mb: number
    humidity: number
    uv: number
    vis_km: number
  }
  forecast: {
    forecastday: WeatherDay[]
  }
}

export function useWeather() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)

  // Get user's geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          })
        },
        (error) => {
          console.warn('[useWeather] Geolocation error:', error)
          // Continue without geolocation (will use default location)
          setLocation(null)
        }
      )
    }
  }, [])

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true)
        setError(null)

        // Build URL with location if available
        let url = '/api/weather'
        if (location) {
          url += `?lat=${location.lat}&lon=${location.lon}`
        } else {
          // If no location (GPS denied/unavailable), ask API to try IP-based detection
          url += '?useIP=true'
        }

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error('Failed to fetch weather data')
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        setWeatherData(data)
      } catch (err) {
        console.error('[useWeather] Error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()

    // Refresh weather data every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000)

    return () => clearInterval(interval)
  }, [location])

  return { weatherData, loading, error }
}
