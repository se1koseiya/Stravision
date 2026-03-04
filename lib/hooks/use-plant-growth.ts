import { useState, useEffect, useCallback } from 'react'
import type { PlantAnalysisResult } from '@/lib/types/plant-growth-types'

export function usePlantGrowth() {
    const [plantData, setPlantData] = useState<PlantAnalysisResult | null>(null)
    const [lastAnalyzed, setLastAnalyzed] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchPlantData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetch('/api/plant-growth')
            const data = await response.json()

            if (data.success) {
                setPlantData(data.data)
                setLastAnalyzed(data.lastAnalyzed)
            } else {
                setError(data.error || 'Failed to fetch plant data')
            }
        } catch (err: any) {
            setError(err.message || 'Network error')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchPlantData()

        // Poll for updates every 30 seconds
        const interval = setInterval(fetchPlantData, 30000)

        return () => clearInterval(interval)
    }, [fetchPlantData])

    const refresh = useCallback(() => {
        return fetchPlantData()
    }, [fetchPlantData])

    return {
        plantData,
        lastAnalyzed,
        loading,
        error,
        refresh
    }
}
