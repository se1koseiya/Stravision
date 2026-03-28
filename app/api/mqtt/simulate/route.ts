import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { MQTTService } from '@/lib/mqtt-service'

interface SimulateDataRequest {
  temperature?: number
  humidity?: number
  light?: number
  co2?: number
  earth_temp?: number
  earth_water?: number
  earth_ec?: number
  earth_n?: number
  earth_p?: number
  earth_k?: number
  relay5?: number
  relay6?: number
  relay7?: number
  relay8?: number
  led1?: number
  led2?: number
  led3?: number
  led4?: number
  stepper_position?: number
  stepper_direction?: number
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: SimulateDataRequest = await req.json()

    const mqttService = MQTTService.getInstance()

    if (!mqttService.isConnected()) {
      try {
        await mqttService.connect()
      } catch (error) {
        return NextResponse.json(
          { success: false, message: 'Failed to connect to MQTT service' },
          { status: 503 }
        )
      }
    }

    const simulatedData = {
      temperature: body.temperature ?? 250,
      humidity: body.humidity ?? 550,
      light: body.light ?? 12000,
      co2: body.co2 ?? 380,
      earth_temp: body.earth_temp ?? 200,
      earth_water: body.earth_water ?? 45,
      earth_ec: body.earth_ec ?? 1200,
      earth_n: body.earth_n ?? 25,
      earth_p: body.earth_p ?? 15,
      earth_k: body.earth_k ?? 30,
      relay5: body.relay5 ?? 0,
      relay6: body.relay6 ?? 0,
      relay7: body.relay7 ?? 0,
      relay8: body.relay8 ?? 0,
      led1: body.led1 ?? 0,
      led2: body.led2 ?? 0,
      led3: body.led3 ?? 0,
      led4: body.led4 ?? 0,
      stepper_position: body.stepper_position ?? 350,
      stepper_direction: body.stepper_direction ?? 0,
      timestamp: Date.now()
    }

    const topic = 'meimefarm/sensor/node0701'
    const payload = JSON.stringify(simulatedData)

    return new Promise((resolve) => {
      const client = (mqttService as any).client
      if (!client) {
        resolve(NextResponse.json(
          { success: false, message: 'MQTT client not available' },
          { status: 500 }
        ))
        return
      }

      client.publish(topic, payload, { qos: 1 }, (error: Error | null) => {
        if (error) {
          resolve(NextResponse.json(
            { success: false, message: `Failed to publish: ${error.message}` },
            { status: 500 }
          ))
        } else {
          resolve(NextResponse.json({
            success: true,
            message: 'Simulated data published successfully',
            topic,
            data: simulatedData,
            timestamp: Date.now()
          }))
        }
      })
    })

  } catch (error: any) {
    console.error('MQTT Simulate API Error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
