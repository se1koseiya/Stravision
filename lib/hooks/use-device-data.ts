/**
 * Custom Hook for Device Data via SSE
 *
 * Manages EventSource connection to receive real-time device data
 * from the MQTT backend via Server-Sent Events.
 *
 * Refactored to use DeviceContext to share a single connection across the app.
 * Also exposes the device registry list and custom device data.
 */

import { useDeviceContext } from '@/lib/contexts/device-context'

// Re-export types for backward compatibility
export type {
  DeviceData,
  ConnectionStatus,
  RegistryDevice,
  DeviceType,
  DeviceConfig,
  DeviceMetric,
} from '@/lib/contexts/device-context'

export function useDeviceData() {
  return useDeviceContext()
}
