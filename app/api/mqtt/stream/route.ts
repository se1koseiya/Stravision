/**
 * SSE (Server-Sent Events) API Route for Real-time Device Data Streaming
 * 
 * This endpoint provides a Server-Sent Events stream that pushes real-time
 * device data from the MQTT service to connected clients.
 * 
 * Endpoint: GET /api/mqtt/stream
 * Response Type: text/event-stream
 */

import { NextRequest } from 'next/server'
import { MQTTService, DeviceData } from '@/lib/mqtt-service'

/**
 * SSE Message Types
 */
interface SSEMessage {
  type: 'connected' | 'data' | 'error'
  data?: DeviceData
  error?: string
  timestamp: number
}

/**
 * Verify JWT token from request headers (optional)
 * 
 * @param {NextRequest} request - The incoming request
 * @returns {boolean} True if authentication is disabled or token is valid
 */
function verifyAuthentication(request: NextRequest): boolean {
  // Check if authentication is required
  const requireAuth = process.env.MQTT_SSE_REQUIRE_AUTH === 'true'
  
  if (!requireAuth) {
    return true // Authentication not required
  }

  // Get authorization header
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  // Extract token
  const token = authHeader.substring(7)
  
  // TODO: Implement JWT verification using lib/auth.ts getJwtSecret()
  // For now, just check if token exists
  return token.length > 0
}

/**
 * GET Handler for SSE Stream
 * 
 * Creates a Server-Sent Events stream that:
 * 1. Verifies authentication (if required)
 * 2. Checks MQTT connection status
 * 3. Establishes connection and sends initial message
 * 4. Sends latest device data if available
 * 5. Subscribes to MQTT data updates and streams them to client
 * 6. Handles connection cleanup on client disconnect
 * 
 * @param {NextRequest} request - The incoming request
 * @returns {Response} SSE stream response
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication (optional)
    if (!verifyAuthentication(request)) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        component: 'SSE-Stream',
        message: 'Unauthorized SSE connection attempt'
      }))

      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Get MQTT service instance
    const mqttService = MQTTService.getInstance()

    // Connect to MQTT if not already connected
    if (!mqttService.isConnected()) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        component: 'SSE-Stream',
        message: 'MQTT not connected, attempting to connect...'
      }))

      try {
        await mqttService.connect()
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          component: 'SSE-Stream',
          message: 'MQTT connection established successfully'
        }))
      } catch (error) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          component: 'SSE-Stream',
          message: 'Failed to connect to MQTT service',
          error: error instanceof Error ? error.message : String(error)
        }))

        return new Response(
          JSON.stringify({ error: 'Failed to connect to MQTT service' }),
          { 
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Set up SSE response headers
    const responseHeaders = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for nginx
    })

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Helper function to send SSE message
        const sendSSE = (message: SSEMessage) => {
          try {
            const data = JSON.stringify(message)
            const encoder = new TextEncoder()
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          } catch (error) {
            console.error(JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'ERROR',
              component: 'SSE-Stream',
              message: 'Error encoding SSE message',
              error: error instanceof Error ? error.message : String(error)
            }))
          }
        }

        // Log connection
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          component: 'SSE-Stream',
          message: 'Client connected to SSE stream'
        }))

        // Send initial connection message
        sendSSE({
          type: 'connected',
          timestamp: Date.now()
        })

        // Send latest data if available
        const latestData = mqttService.getLatestData()
        if (latestData) {
          sendSSE({
            type: 'data',
            data: latestData,
            timestamp: Date.now()
          })
        }

        // Subscribe to MQTT data updates
        const unsubscribe = mqttService.subscribeToData((deviceData: DeviceData) => {
          try {
            sendSSE({
              type: 'data',
              data: deviceData,
              timestamp: Date.now()
            })
          } catch (error) {
            console.error(JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'ERROR',
              component: 'SSE-Stream',
              message: 'Error sending data to SSE client',
              error: error instanceof Error ? error.message : String(error)
            }))
          }
        })

        // Store unsubscribe function for cleanup
        // @ts-ignore - Attach to controller for cleanup
        controller.unsubscribe = unsubscribe
      },

      cancel(controller) {
        // Clean up when client disconnects
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'INFO',
          component: 'SSE-Stream',
          message: 'Client disconnected from SSE stream'
        }))

        // Unsubscribe from MQTT data updates
        // @ts-ignore
        if (controller.unsubscribe) {
          // @ts-ignore
          controller.unsubscribe()
        }
      }
    })

    return new Response(stream, { headers: responseHeaders })

  } catch (error) {
    // Catch any unexpected errors
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      component: 'SSE-Stream',
      message: 'Unexpected error in SSE stream handler',
      error: error instanceof Error ? error.message : String(error)
    }))

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
