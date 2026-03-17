
export type ThresholdLevel = 'normal' | 'warning' | 'critical';

export interface ThresholdRule {
    min?: number;
    max?: number;
    criticalMin?: number;
    criticalMax?: number;
}

export const SENSOR_THRESHOLDS: Record<string, ThresholdRule> = {
    temperature: {
        min: 10,
        max: 30,
        criticalMin: 0,
        criticalMax: 40
    },
    humidity: {
        min: 40,
        max: 80,
        criticalMin: 20,
        criticalMax: 90
    },
    co2: {
        max: 1500,
        criticalMax: 3000
    },
    light: {
        min: 2000, // Lux
        criticalMin: 500
    },
    soilMoisture: {
        min: 40,
        max: 85,
        criticalMin: 10,
        criticalMax: 95
    },
    // NPK values usually have optimal ranges, assuming generic values for now
    nitrogen: {
        min: 50,
        max: 200,
        criticalMin: 20
    },
    phosphorus: {
        min: 30,
        max: 100,
        criticalMin: 10
    },
    potassium: {
        min: 100,
        max: 300,
        criticalMin: 40
    },
    fertility: { // EC
        min: 500,
        max: 2000,
        criticalMin: 100,
        criticalMax: 3000
    },
    rainfall: {
        // Usually cumulative, maybe warning if too high in short period?
        // Leaving empty implies always normal for now, or define limits if needed.
        criticalMax: 50 // Example: > 50mm might be critical
    }
};

export function getThresholdLevel(type: string, value: number): ThresholdLevel {
    const rule = SENSOR_THRESHOLDS[type];
    if (!rule) return 'normal';

    // Critical checks
    if (rule.criticalMax !== undefined && value >= rule.criticalMax) return 'critical';
    if (rule.criticalMin !== undefined && value <= rule.criticalMin) return 'critical';

    // Warning checks
    if (rule.max !== undefined && value >= rule.max) return 'warning';
    if (rule.min !== undefined && value <= rule.min) return 'warning';

    return 'normal';
}
