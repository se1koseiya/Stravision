"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { WeatherData } from '@/lib/hooks/use-weather'

interface WeatherContextType {
  weatherData: WeatherData | null
  loading: boolean
  error: string | null
  locationSource: 'gps' | 'ip' | 'default' | null
  refetch: () => void
  requestLocation: () => void
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined)

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [locationSource, setLocationSource] = useState<'gps' | 'ip' | 'default' | null>(null)
  const [gpsAttempted, setGpsAttempted] = useState(false)

  // Request user's geolocation
  const requestLocation = () => {
    if ('geolocation' in navigator) {
      console.log('[WeatherContext] Requesting GPS location...')
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('[WeatherContext] GPS location obtained:', position.coords.latitude, position.coords.longitude)
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          })
          setGpsAttempted(true)
        },
        (error) => {
          console.warn('[WeatherContext] Geolocation error:', error.message, '- will use IP fallback')
          setLocation(null)
          setGpsAttempted(true)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // Cache for 5 minutes
        }
      )
    } else {
      console.warn('[WeatherContext] Geolocation not available - will use IP fallback')
      setGpsAttempted(true)
    }
  }

  // Get user's geolocation on mount
  useEffect(() => {
    requestLocation()
  }, [])

  const fetchWeather = async () => {
    // Wait for GPS attempt to complete before fetching
    if (!gpsAttempted) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Build URL with three-tier location strategy
      let url = '/api/weather'
      let source: 'gps' | 'ip' | 'default' = 'default'

      if (location) {
        // Priority 1: Use GPS coordinates
        url += `?lat=${location.lat}&lon=${location.lon}`
        source = 'gps'
        console.log('[WeatherContext] Using GPS location:', location.lat, location.lon)
      } else {
        // Priority 2: Use IP geolocation
        url += '?useIP=true'
        source = 'ip'
        console.log('[WeatherContext] Using IP geolocation fallback')
        
        // Attempt to get client's public IP to assist server-side detection
        // This helps when the server is behind a proxy or in a different location
        try {
          const ipRes = await fetch('https://api.ipify.org?format=json', { 
            signal: AbortSignal.timeout(2000) // 2s timeout to avoid blocking
          })
          if (ipRes.ok) {
            const ipData = await ipRes.json()
            if (ipData.ip) {
              url += `&clientIp=${ipData.ip}`
              console.log('[WeatherContext] Detected client IP:', ipData.ip)
            }
          }
        } catch (e) {
          // Ignore IP fetch errors, server will try to detect from headers
          console.warn('[WeatherContext] Could not detect client IP:', e)
        }
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch weather data')
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Use location source from API response if available
      setLocationSource(data.locationSource || source)
      setWeatherData(data)
      console.log('[WeatherContext] Weather data fetched for:', data.location?.name, '(source:', data.locationSource || source + ')')
    } catch (err) {
      console.error('[WeatherContext] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeather()

    // Refresh weather data every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000)

    return () => clearInterval(interval)
  }, [location, gpsAttempted])

  return (
    <WeatherContext.Provider value={{
      weatherData,
      loading,
      error,
      locationSource,
      refetch: fetchWeather,
      requestLocation
    }}>
      {children}
    </WeatherContext.Provider>
  )
}

export function useWeatherContext() {
  const context = useContext(WeatherContext)
  if (context === undefined) {
    throw new Error('useWeatherContext must be used within a WeatherProvider')
  }
  return context
}
