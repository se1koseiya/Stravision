/**
 * MQTT Service Module
 * 
 * Singleton service that manages MQTT connection, message handling,
 * and provides interfaces for data subscription and control commands.
 */

import mqtt from 'mqtt'
import { MQTTConfig, getValidatedMQTTConfig } from './mqtt-config'
import { sendWeComNotification } from './notification-service'
import { saveSensorReading } from '@/lib/db/device-service'
import { AutomationEngine, AutomationContext } from './automation/engine'
import { getActiveRules, recordRuleExecution } from '@/lib/db/automation-service'
import { ChatService } from '@/lib/db/chat-service'
import { queryOne } from '@/lib/db/database'
import { getStepperPosition, updateStepperPosition } from './db/settings-service'

/**
 * Device Data Interface
 * Represents the structure of data received from IoT devices
 */
export interface DeviceData {
  temperature: number      // Temperature (°C * 10)
  humidity: number         // Humidity (% * 10)
  light: number           // Light intensity (lux)
  co2: number             // CO2 concentration (ppm)
  earth_temp: number      // Soil temperature (°C * 10)
  earth_water: number     // Soil moisture (%)
  earth_ec: number        // EC value (μS/cm)
  earth_n: number         // Nitrogen (mg/kg)
  earth_p: number         // Phosphorus (mg/kg)
  earth_k: number         // Potassium (mg/kg)
  relay5: number          // Relay 5 state (0/1)
  relay6: number          // Relay 6 state (0/1)
  relay7: number          // Relay 7 state (0/1)
  relay8: number          // Relay 8 state (0/1)
  led1: number            // LED 1 brightness (0-255)
  led2: number            // LED 2 brightness (0-255)
  led3: number            // LED 3 brightness (0-255)
  led4: number            // LED 4 brightness (0-255)
  // Spectral Data
  channel1?: number       // 415 nm Violet
  channel2?: number       // 445 nm Blue
  channel3?: number       // 480 nm Cyan
  channel4?: number       // 515 nm Green
  channel5?: number       // 555 nm Yellow-Green
  channel6?: number       // 590 nm Yellow
  channel7?: number       // 630 nm Orange
  channel8?: number       // 680 nm Red
  channel9?: number       // NIR
  channel10?: number      // Clear
  channel11?: number      // Flicker
  timestamp?: number      // Timestamp when data was received
  // Stepper Motor Data (步进电机 - 摄像头云台)
  stepper_direction?: number   // 远程控制运行方向: 0=停止, 1=正转/左移, 2=反转/右移 (node0815)
  stepper_mode?: number        // 工作模式: 6=通讯控制模式 (node0807)
  stepper_accel?: number       // 加速系数: 100-10000 (node0805)
  stepper_decel?: number       // 减速系数: 100-10000 (node0806)
  stepper_wait_time?: number   // 切换等待时间 (node0808)
  stepper_run_time?: number    // 运行时间: 100=1秒 (node0809)
  stepper_loop_count?: number  // 循环次数: 0=无限 (node0810)
  stepper_position?: number    // 当前软件记位脉冲数系统同步 (用于UI显示)
}

/**
 * Control Command Interface
 * Represents control commands to be sent to devices
 */
export interface ControlCommand {
  type: 'relay' | 'led' | 'stepper' | 'stepper_reset'
  relayNum?: number       // Relay number (5-8)
  newState?: number       // New relay state (0/1)
  led1?: number           // LED 1 brightness (0-255)
  led2?: number           // LED 2 brightness (0-255)
  led3?: number           // LED 3 brightness (0-255)
  led4?: number           // LED 4 brightness (0-255)
  // Stepper Motor Control (步进电机控制)
  stepper_direction?: number   // 运行方向: 0=停止, 1=正转, 2=反转
  stepper_pulses?: number      // 运行脉冲数 (决定距离 - node0817)
  stepper_mode?: number        // 模式设置: 1-26
  stepper_accel?: number       // 加速频率: 1-65535
  stepper_decel?: number       // 减速频率: 1-65535
  stepper_run_time?: number    // 运行时间 (100=1秒)
  stepper_loop_count?: number  // 循环次数: 0=无限循环
}

/**
 * Data Listener Callback Type
 */
type DataListener = (data: DeviceData) => void

/**
 * MQTTService Singleton Class
 * 
 * Manages MQTT connection lifecycle, message handling, and provides
 * interfaces for subscribing to device data and sending control commands.
 */
export class MQTTService {
  private static instance: MQTTService
  private client: mqtt.MqttClient | null = null
  private config: MQTTConfig
  private latestData: DeviceData | null = null
  private dataListeners: Set<DataListener> = new Set()
  private lastNotificationTime: Map<string, number> = new Map()
  private readonly NOTIFICATION_COOLDOWN = 30 * 60 * 1000 // 30 minutes
  private readonly ALERT_TIMEZONE = process.env.ALERT_TIMEZONE || 'Asia/Shanghai'
  
  // Lead Screw Slider Constants (丝杆滑台参数)
  private readonly STEPPER_MAX_RANGE_MM = 700
  private readonly STEPPER_PULSES_PER_10MM = 1600
  private readonly STEPPER_MAX_PULSES = (700 / 10) * 1600 // 112000 pulses
  private readonly STEPPER_DEFAULT_STEP = 1600 // 10mm default
  private cachedStepperPosition = 0

  private stepperInactivityTimer: NodeJS.Timeout | null = null
  private readonly STEPPER_AUTO_RESET_DELAY_MS = 5 * 60 * 1000 // 5分钟无操作自动复位到中间

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.config = getValidatedMQTTConfig()
    // Load initial stepper position from DB
    getStepperPosition().then(pos => {
      this.cachedStepperPosition = pos
      if (this.latestData) this.latestData.stepper_position = pos
    }).catch(err => {
      console.error('[MQTT] Failed to load initial stepper position:', err)
    })
  }

  /**
   * Get singleton instance of MQTTService
   * 
   * @returns {MQTTService} The singleton instance
   */
  public static getInstance(): MQTTService {
    if (!MQTTService.instance) {
      MQTTService.instance = new MQTTService()
    }
    return MQTTService.instance
  }

  /**
   * Connect to MQTT Broker
   * 
   * Establishes TLS/SSL connection to the MQTT broker using configured credentials.
   * Sets up event handlers for connection lifecycle events.
   * 
   * @returns {Promise<void>} Resolves when connection is established
   * @throws {Error} If connection fails after retries
   */
  public async connect(): Promise<void> {
    if (this.client && this.client.connected) {
      this.log('INFO', 'MQTT client already connected')
      return
    }

    return new Promise((resolve, reject) => {
      try {
        const protocol = this.config.useSSL ? 'mqtts' : 'mqtt'
        const brokerUrl = `${protocol}://${this.config.host}:${this.config.port}`

        this.log('INFO', `Connecting to MQTT broker: ${brokerUrl}`)

        // Create MQTT client with connection options
        this.client = mqtt.connect(brokerUrl, {
          username: this.config.username,
          password: this.config.password,
          keepalive: this.config.keepalive,
          reconnectPeriod: this.config.reconnectPeriod,
          clean: true,
          clientId: `mqtt_service_${Math.random().toString(16).slice(2, 10)}`
        })

        // Connection successful event
        this.client.on('connect', () => {
          this.log('INFO', 'MQTT connection established successfully')
          
          const topics = [
            this.config.subscribeTopic,
            'meimefarm/Spectrum',
            'meimefarm/sensor/node0701'
          ]

          // Subscribe to device data topics
          this.client!.subscribe(topics, { qos: 1 }, (err) => {
            if (err) {
              this.log('ERROR', `Failed to subscribe to topics: ${topics.join(', ')}`, err)
            } else {
              this.log('INFO', `Subscribed to topics: ${topics.join(', ')}`)
            }
          })
          
          resolve()
        })

        // Message received event
        this.client.on('message', (topic, payload) => {
          this.handleMessage(topic, payload)
        })

        // Connection error event
        this.client.on('error', (error) => {
          this.log('ERROR', `MQTT connection error: ${error.message}`, error)
          reject(error)
        })

        // Connection closed event
        this.client.on('close', () => {
          this.log('INFO', 'MQTT connection closed')
        })

        // Reconnect event
        this.client.on('reconnect', () => {
          this.log('INFO', 'MQTT attempting to reconnect...')
        })

        // Offline event
        this.client.on('offline', () => {
          this.log('WARN', 'MQTT client is offline')
        })

      } catch (error) {
        this.log('ERROR', `Failed to create MQTT client: ${error}`, error)
        reject(error)
      }
    })
  }

  /**
   * Disconnect from MQTT Broker
   * 
   * Gracefully closes the MQTT connection and cleans up resources.
   */
  public disconnect(): void {
    if (this.client) {
      this.log('INFO', 'Disconnecting from MQTT broker')
      this.client.end(false, {}, () => {
        this.log('INFO', 'MQTT client disconnected')
      })
      this.client = null
    }
  }

  /**
   * Check if MQTT client is connected
   * 
   * @returns {boolean} True if connected, false otherwise
   */
  public isConnected(): boolean {
    return this.client !== null && this.client.connected
  }

  /**
   * Get latest cached device data
   * 
   * @returns {DeviceData | null} Latest device data or null if no data received yet
   */
  public getLatestData(): DeviceData | null {
    return this.latestData
  }

  /**
   * Subscribe to device data updates
   * 
   * Registers a callback function that will be called whenever new device data arrives.
   * Returns an unsubscribe function to remove the listener.
   * 
   * @param {DataListener} callback - Function to call when new data arrives
   * @returns {Function} Unsubscribe function to remove the listener
   */
  public subscribeToData(callback: DataListener): () => void {
    this.dataListeners.add(callback)
    
    this.log('INFO', `Data listener added. Total listeners: ${this.dataListeners.size}`)
    
    // Return unsubscribe function
    return () => {
      this.dataListeners.delete(callback)
      this.log('INFO', `Data listener removed. Total listeners: ${this.dataListeners.size}`)
    }
  }

  /**
   * Reset the stepper inactivity timer
   */
  private resetStepperInactivityTimer(): void {
    if (this.stepperInactivityTimer) {
      clearTimeout(this.stepperInactivityTimer)
    }
    this.stepperInactivityTimer = setTimeout(() => {
      this.autoResetStepper()
    }, this.STEPPER_AUTO_RESET_DELAY_MS)
  }

  /**
   * Automatically reset stepper to middle position after inactivity
   */
  private async autoResetStepper(): Promise<void> {
    this.log('INFO', 'Stepper inactivity timeout reached, auto-resetting to middle position.')
    try {
      await this.sendControlCommand({ type: 'stepper_reset' })
    } catch (err) {
      this.log('ERROR', `Auto-reset failed: ${err}`)
    }
  }

  /**
   * Send control command to device
   * 
   * Constructs device protocol payload and publishes to MQTT broker.
   * 
   * @param {ControlCommand} command - Control command to send
   * @returns {Promise<void>} Resolves when command is published
   * @throws {Error} If client is not connected or publish fails
   */
  public async sendControlCommand(command: ControlCommand): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('MQTT client is not connected')
    }

    try {
      // Pre-processing for specific command types
      if (command.type === 'stepper_reset') {
        const currentPos = await getStepperPosition()
        const middlePos = this.STEPPER_MAX_PULSES / 2 // 56000 pulses
        
        if (currentPos === middlePos) {
          this.log('INFO', 'Stepper already at middle position, ignoring reset command')
          return
        }

        let direction = 0
        let pulses = 0

        if (currentPos < middlePos) {
          direction = 1 // Forward/Left to increase position
          pulses = middlePos - currentPos
        } else {
          direction = 2 // Reverse/Right to decrease position
          pulses = currentPos - middlePos
        }

        this.log('INFO', `Stepper reset to middle: Moving from ${currentPos} to ${middlePos} (${pulses} pulses in direction ${direction})`)
        
        // Convert to a stepper move command
        command.type = 'stepper'
        command.stepper_direction = direction
        command.stepper_pulses = pulses
      }

      // Build payload after potential type conversion for stepper_reset
      const payload = this.buildControlPayload(command)
      
      // Handle Stepper Position Tracking logic
      if (command.type === 'stepper') {
        this.resetStepperInactivityTimer() // Reset timer on any stepper action

        const currentPos = await getStepperPosition()
        const direction = command.stepper_direction || 0
        const delta = command.stepper_pulses !== undefined ? command.stepper_pulses : this.STEPPER_DEFAULT_STEP
        
        let targetPulses = delta
        let newPos = currentPos
        
        if (direction === 1) { // Forward/Left
          if (currentPos >= this.STEPPER_MAX_PULSES) {
            this.log('WARN', `Stepper at max position (${currentPos}). Command ignored.`)
            throw new Error('已经到达最大量程 (700mm)')
          }
          // Clamp target move
          if (currentPos + delta > this.STEPPER_MAX_PULSES) {
            targetPulses = this.STEPPER_MAX_PULSES - currentPos
            this.log('INFO', `Stepper move clamped to ${targetPulses} to avoid over-limit.`)
          }
          newPos = currentPos + targetPulses
        } else if (direction === 2) { // Reverse/Right
          if (currentPos <= 0) {
            this.log('WARN', `Stepper at min position (${currentPos}). Command ignored.`)
            throw new Error('已经到达原点 (0mm)')
          }
          // Clamp target move
          if (currentPos - delta < 0) {
            targetPulses = currentPos
            this.log('INFO', `Stepper move clamped to ${targetPulses} to avoid over-limit.`)
          }
          newPos = currentPos - targetPulses
        }
        
        // Update the payload with adjusted pulses
        const stepperPayload = payload as any
        if (stepperPayload.rw_prot && stepperPayload.rw_prot.w_data) {
          // Insert node0817 (Pulse Number)
          if (direction !== 0) {
            stepperPayload.rw_prot.w_data.push({ name: 'node0817', value: String(targetPulses) })
          }
        }
        
        // Persist new position
        await updateStepperPosition(newPos)
        this.cachedStepperPosition = newPos
        if (this.latestData) this.latestData.stepper_position = newPos
      }

      const payloadString = JSON.stringify(payload)
      this.log('INFO', `Sending control command: ${command.type}`, command)

      return new Promise((resolve, reject) => {
        this.client!.publish(
          this.config.publishTopic,
          payloadString,
          { qos: 1 },
          (error) => {
            if (error) {
              this.log('ERROR', `Failed to publish control command: ${error.message}`, error)
              reject(error)
            } else {
              this.log('INFO', `Control command published successfully`)
              resolve()
            }
          }
        )
      })
    } catch (error: any) {
      this.log('ERROR', `Error sending control command: ${error?.message || error}`, error)
      throw error
    }
  }

  /**
   * Build control payload according to device protocol
   * 
   * Constructs the rw_prot structure with appropriate node mappings.
   * 
   * @param {ControlCommand} command - Control command
   * @returns {object} Device protocol payload
   */
  private buildControlPayload(command: ControlCommand): object {
    const id = Math.random().toString(36).substring(2, 15)
    
    if (command.type === 'relay') {
      // Validate relay command
      if (command.relayNum === undefined || command.newState === undefined) {
        throw new Error('Relay command requires relayNum and newState')
      }
      if (command.relayNum < 5 || command.relayNum > 8) {
        throw new Error('Relay number must be between 5 and 8')
      }
      if (command.newState !== 0 && command.newState !== 1) {
        throw new Error('Relay state must be 0 or 1')
      }

      // Map relay numbers to node IDs (relay5->node0601, relay6->node0602, etc.)
      const nodeNum = command.relayNum - 4 // relay5->1, relay6->2, relay7->3, relay8->4
      const nodeName = `node060${nodeNum}`

      return {
        rw_prot: {
          Ver: '1.0.1',
          dir: 'down',
          id,
          w_data: [
            { name: nodeName, value: String(command.newState) }
          ]
        }
      }
    } else if (command.type === 'led') {
      // Validate LED command
      const led1 = command.led1 !== undefined ? command.led1 : 0
      const led2 = command.led2 !== undefined ? command.led2 : 0
      const led3 = command.led3 !== undefined ? command.led3 : 0
      const led4 = command.led4 !== undefined ? command.led4 : 0

      // Validate LED values (0-255)
      const validateLED = (value: number, name: string) => {
        if (value < 0 || value > 255) {
          throw new Error(`${name} must be between 0 and 255`)
        }
      }

      validateLED(led1, 'LED1')
      validateLED(led2, 'LED2')
      validateLED(led3, 'LED3')
      validateLED(led4, 'LED4')

      // Map LEDs to node IDs (led1->node0501, led2->node0502, etc.)
      return {
        rw_prot: {
          Ver: '1.0.1',
          dir: 'down',
          id,
          w_data: [
            { name: 'node0501', value: String(led1) },
            { name: 'node0502', value: String(led2) },
            { name: 'node0503', value: String(led3) },
            { name: 'node0504', value: String(led4) }
          ]
        }
      }
    } else if (command.type === 'stepper') {
      // 步进电机控制命令 (摄像头云台左右移动)
      // 根据文档: node0815 (寄存器40084) = 远程控制运行方向 (0=停止, 1=正转/左移, 2=反转/右移)
      // node0805 = 加速系数, node0806 = 减速系数
      // node0807 = 工作模式 (M6=6 通讯控制模式)
      // node0817 = 第一段脉冲数 (决定移动距离)
      const w_data: { name: string; value: string }[] = []

      // 运行方向控制 (必需) - node0815
      if (command.stepper_direction !== undefined) {
        if (command.stepper_direction < 0 || command.stepper_direction > 2) {
          throw new Error('Stepper direction must be 0 (stop), 1 (forward/left), or 2 (reverse/right)')
        }
        w_data.push({ name: 'node0815', value: String(command.stepper_direction) })
      }

      // 工作模式设置 (可选, 默认M6=6通讯控制模式) - node0807
      if (command.stepper_mode !== undefined) {
        if (command.stepper_mode < 1 || command.stepper_mode > 26) {
          throw new Error('Stepper mode must be between 1 and 26')
        }
        w_data.push({ name: 'node0807', value: String(command.stepper_mode) })
      }

      // 加速系数 (可选, 100-10000) - node0805
      if (command.stepper_accel !== undefined) {
        if (command.stepper_accel < 100 || command.stepper_accel > 10000) {
          throw new Error('Stepper acceleration must be between 100 and 10000')
        }
        w_data.push({ name: 'node0805', value: String(command.stepper_accel) })
      }

      // 减速系数 (可选, 100-10000) - node0806
      if (command.stepper_decel !== undefined) {
        if (command.stepper_decel < 100 || command.stepper_decel > 10000) {
          throw new Error('Stepper deceleration must be between 100 and 10000')
        }
        w_data.push({ name: 'node0806', value: String(command.stepper_decel) })
      }

      // 运行时间 (可选, 100=1秒) - node0809
      if (command.stepper_run_time !== undefined) {
        if (command.stepper_run_time < 1 || command.stepper_run_time > 65535) {
          throw new Error('Stepper run time must be between 1 and 65535')
        }
        w_data.push({ name: 'node0809', value: String(command.stepper_run_time) })
      }

      // 循环次数 (可选, 0=无限循环) - node0810
      if (command.stepper_loop_count !== undefined) {
        if (command.stepper_loop_count < 0 || command.stepper_loop_count > 65535) {
          throw new Error('Stepper loop count must be between 0 and 65535')
        }
        w_data.push({ name: 'node0810', value: String(command.stepper_loop_count) })
      }

      if (w_data.length === 0) {
        throw new Error('Stepper command requires at least stepper_direction')
      }

      return {
        rw_prot: {
          Ver: '1.0.1',
          dir: 'down',
          id,
          w_data
        }
      }
    } else {
      throw new Error(`Unknown command type: ${command.type}`)
    }
  }

  /**
   * Handle incoming MQTT message
   * 
   * Parses JSON payload, validates and transforms data, updates cache,
   * and notifies all registered listeners.
   * 
   * @param {string} topic - MQTT topic
   * @param {Buffer} payload - Message payload
   */
  private async handleMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      const message = payload.toString()
      
      // Parse JSON data
      const rawData = JSON.parse(message)
      
      // Initialize latestData if null
      if (!this.latestData) {
        this.latestData = {
          temperature: 0, humidity: 0, light: 0, co2: 0,
          earth_temp: 0, earth_water: 0, earth_ec: 0,
          earth_n: 0, earth_p: 0, earth_k: 0,
          relay5: 0, relay6: 0, relay7: 0, relay8: 0,
          led1: 0, led2: 0, led3: 0, led4: 0,
          stepper_direction: 0,
          stepper_position: this.cachedStepperPosition
        }
      }

      // Update data based on topic or content
      if (topic === 'meimefarm/Spectrum' || topic === 'meimefarm/sensor/node0701') {
        // New format: each channel is an object with {id, value}
        // e.g. {"channel1": {"id": "node0701", "value": 313}, ...}
        const getChannelValue = (ch: any) => {
          if (ch && typeof ch === 'object' && 'value' in ch) {
            return this.parseNumber(ch.value, 0);
          }
          return this.parseNumber(ch, 0);
        };

        // Spectral or specific node data
        this.latestData = {
          ...this.latestData,
          channel1: getChannelValue(rawData.channel1) || this.latestData?.channel1 || 0,
          channel2: getChannelValue(rawData.channel2) || this.latestData?.channel2 || 0,
          channel3: getChannelValue(rawData.channel3) || this.latestData?.channel3 || 0,
          channel4: getChannelValue(rawData.channel4) || this.latestData?.channel4 || 0,
          channel5: getChannelValue(rawData.channel5) || this.latestData?.channel5 || 0,
          channel6: getChannelValue(rawData.channel6) || this.latestData?.channel6 || 0,
          channel7: getChannelValue(rawData.channel7) || this.latestData?.channel7 || 0,
          channel8: getChannelValue(rawData.channel8) || this.latestData?.channel8 || 0,
          channel9: getChannelValue(rawData.channel9) || this.latestData?.channel9 || 0,
          channel10: getChannelValue(rawData.channel10) || this.latestData?.channel10 || 0,
          channel11: getChannelValue(rawData.channel11) || this.latestData?.channel11 || 0,
          stepper_position: this.cachedStepperPosition,
          timestamp: Date.now()
        }
      } else {
        // Basic Env Data
        this.latestData = {
          ...this.latestData,
          temperature: this.parseNumber(rawData.temperature, this.latestData?.temperature ?? 0),
          humidity: this.parseNumber(rawData.humidity, this.latestData?.humidity ?? 0),
          light: this.parseNumber(rawData.light, this.latestData?.light ?? 0),
          co2: this.parseNumber(rawData.co2, this.latestData?.co2 ?? 0),
          earth_temp: this.parseNumber(rawData.earth_temp, this.latestData?.earth_temp ?? 0),
          earth_water: this.parseNumber(rawData.earth_water, this.latestData?.earth_water ?? 0),
          earth_ec: this.parseNumber(rawData.earth_ec, this.latestData?.earth_ec ?? 0),
          earth_n: this.parseNumber(rawData.earth_n, this.latestData?.earth_n ?? 0),
          earth_p: this.parseNumber(rawData.earth_p, this.latestData?.earth_p ?? 0),
          earth_k: this.parseNumber(rawData.earth_k, this.latestData?.earth_k ?? 0),
          relay5: this.parseNumber(rawData.relay5, this.latestData?.relay5 ?? 0),
          relay6: this.parseNumber(rawData.relay6, this.latestData?.relay6 ?? 0),
          relay7: this.parseNumber(rawData.relay7, this.latestData?.relay7 ?? 0),
          relay8: this.parseNumber(rawData.relay8, this.latestData?.relay8 ?? 0),
          led1: this.parseNumber(rawData.led1, this.latestData?.led1 ?? 0),
          led2: this.parseNumber(rawData.led2, this.latestData?.led2 ?? 0),
          led3: this.parseNumber(rawData.led3, this.latestData?.led3 ?? 0),
          led4: this.parseNumber(rawData.led4, this.latestData?.led4 ?? 0),
          stepper_position: this.cachedStepperPosition,
          timestamp: Date.now()
        }

        // Check for critical anomalies and send notifications
        // Only check thresholds when env data is updated to avoid false alarms on initial 0s
        this.checkThresholds(this.latestData)
        
        // Save to database for historical tracking
        // We only save basic environmental data, not spectral data which comes at high frequency
        saveSensorReading({
          temperature: this.latestData.temperature / 10,
          humidity: this.latestData.humidity / 10,
          light: this.latestData.light,
          co2: this.latestData.co2,
          soil_moisture: this.latestData.earth_water / 10,
          earth_n: this.latestData.earth_n,
          earth_p: this.latestData.earth_p,
          earth_k: this.latestData.earth_k,
          rainfall: 0 // MQTT data currently doesn't include rainfall
        }).catch(err => {
          this.log('ERROR', `Failed to save sensor reading to DB: ${err}`)
        })
      }

      // Execute Automation Rules
      try {
        const activeRules = await getActiveRules();
        const sensorRules = activeRules.filter(r => r.trigger_type === 'sensor');
        
        const context: AutomationContext = {
            sensorData: {
                temperature: (this.latestData?.temperature || 0) / 10,
                humidity: (this.latestData?.humidity || 0) / 10,
                light: this.latestData?.light || 0,
                co2: this.latestData?.co2 || 0,
                soil_moisture: (this.latestData?.earth_water || 0) / 10,
            },
            timestamp: Date.now()
        };

        sensorRules.forEach(rule => {
            const actions = AutomationEngine.evaluate(rule, context);
            if (actions.length > 0) {
                this.log('INFO', `Rule [${rule.name}] triggered ${actions.length} actions`);
                recordRuleExecution(rule.id);
                
                actions.forEach(action => {
                    this.executeAction(action);
                });
            }
        });
      } catch (err) {
        this.log('ERROR', `Failed to execute automation rules: ${err}`);
      }

      // Notify all listeners
      this.dataListeners.forEach(listener => {
        try {
          listener(this.latestData!)
        } catch (error) {
          this.log('ERROR', `Error in data listener: ${error}`, error)
        }
      })
      
      this.log('INFO', `Processed message from ${topic}`)
    } catch (error) {
      this.log('ERROR', `Failed to process MQTT message from ${topic}: ${error}`, error)
    }
  }

  /**
   * Check data against critical thresholds and send notifications
   * 
   * @param {DeviceData} data - The device data to check
   */
  private async checkThresholds(data: DeviceData): Promise<void> {
    const now = Date.now()
    const alerts: string[] = []

    // Temperature (High > 40°C, Low < 0°C)
    const temp = data.temperature / 10
    if (temp > 40) {
      alerts.push(`🌡️ **温度过高**: ${temp.toFixed(1)}°C\n> 阈值 > 40°C\n> 建议：检查通风设备，开启降温系统。`)
    } else if (temp < 0) {
      alerts.push(`❄️ **温度过低**: ${temp.toFixed(1)}°C\n> 阈值 < 0°C\n> 建议：检查加热设备，防止冻害。`)
    }

    // Humidity (Low < 20%)
    const humidity = data.humidity / 10
    if (humidity < 20) {
      alerts.push(`💧 **湿度过低**: ${humidity.toFixed(1)}%\n> 阈值 < 20%\n> 建议：开启加湿设备或喷灌系统。`)
    }

    // CO2 (High > 3000 ppm)
    if (data.co2 > 3000) {
      alerts.push(`💨 **CO₂浓度过高**: ${data.co2} ppm\n> 阈值 > 3000 ppm\n> 建议：加强通风换气。`)
    }

    // Light (Low < 1200 lux during daytime 8:00-17:00)
    const hourStr = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', hourCycle: 'h23', timeZone: this.ALERT_TIMEZONE }).format(new Date(now))
    const hour = parseInt(hourStr, 10)
    if (hour >= 8 && hour < 17) {
      if (data.light < 1200) {
        alerts.push(`☀️ **光照不足**: ${data.light} lux\n> 日间阈值 < 1200 lux\n> 建议：检查补光灯状态或清理遮挡物。`)
      }
    }

    // Soil Moisture (Low < 10%)
    const soilMoisture = data.earth_water
    if (soilMoisture < 10) {
      alerts.push(`🌱 **土壤缺水**: ${soilMoisture.toFixed(1)}%\n> 阈值 < 10%\n> 建议：立即启动灌溉系统。`)
    }

    // Sensor Fault Detection (Value is 0)
    const zeroMetrics: string[] = []
    if (data.humidity === 0) zeroMetrics.push('湿度')
    if (data.co2 === 0) zeroMetrics.push('CO₂')
    if (data.earth_water === 0) zeroMetrics.push('土壤水分')
    if (data.earth_ec === 0) zeroMetrics.push('土壤EC')
    if (data.earth_n === 0) zeroMetrics.push('土壤氮')
    if (data.earth_p === 0) zeroMetrics.push('土壤磷')
    if (data.earth_k === 0) zeroMetrics.push('土壤钾')

    if (zeroMetrics.length > 0) {
      alerts.push(`⚠️ **传感器异常**: 检测到0值\n> 涉及指标: ${zeroMetrics.join(', ')}\n> 建议：检查传感器连接线或电源。`)
    }

    // Consolidate and debounce alerts
    if (alerts.length > 0) {
      // Check global cooldown for ANY alert to prevent spamming
      const globalCooldownKey = 'global_alert_cooldown'
      const lastGlobalSent = this.lastNotificationTime.get(globalCooldownKey) || 0
      
      // If we sent ANY alert recently (e.g. within 5 mins), hold off unless it's been a while
      // But we also want to make sure we don't miss critical distinct alerts forever.
      // Strategy: Consolidate all current alerts into one message.
      // Send this consolidated message only if cooldown passed.
      
      if (now - lastGlobalSent > this.NOTIFICATION_COOLDOWN) {
        try {
          const timeText = new Intl.DateTimeFormat('zh-CN', { timeZone: this.ALERT_TIMEZONE, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(now))
          const title = `🚨 **环境监控告警汇总** (${timeText})`
          const body = alerts.join('\n\n---\n\n')
          const fullMessage = `${title}\n\n${body}`

          await sendWeComNotification(fullMessage, 'markdown')
          
          this.lastNotificationTime.set(globalCooldownKey, now)
          this.log('INFO', `Sent consolidated WeCom notification with ${alerts.length} alerts`)
        } catch (error) {
          this.log('ERROR', `Failed to send notification: ${error}`)
        }
      }
    }
  }

  /**
   * Parse number from raw data with fallback
   * 
   * @param {any} value - Raw value to parse
   * @param {number} defaultValue - Default value if parsing fails
   * @returns {number} Parsed number or default value
   */
  private parseNumber(value: unknown, defaultValue: number): number {
    const parsed = Number(value)
    return isNaN(parsed) ? defaultValue : parsed
  }

  /**
   * Execute automation action manually
   */
  public async executeAction(action: any) {
      if (action.type === 'device') {
          // Device Control Action
          const params = action.params; // Expect params to contain device type and state
          const deviceType = params.config?.device || params.device || 'fan'; // Adapt to node data structure
          const actionState = params.config?.action !== undefined ? params.config.action : (params.action !== undefined ? params.action : true);
          const newState = actionState ? 1 : 0;
          
          // Map abstract device types to actual control commands
          // This mapping depends on how we define ActionNode data in UI
          let command: ControlCommand | null = null;
          
          // Example mapping:
          if (deviceType === 'fan') {
             // Assuming Fan is Relay 6
             command = { type: 'relay', relayNum: 6, newState };
          } else if (deviceType === 'pump') {
             // Assuming Pump is Relay 5
             command = { type: 'relay', relayNum: 5, newState }; 
          } else if (deviceType === 'light') {
             // Assuming Light is Relay 7 or LED
             command = { type: 'relay', relayNum: 7, newState };
          }

          if (command) {
              this.sendControlCommand(command).catch(err => {
                  this.log('ERROR', `Failed to execute automation action: ${err}`);
              });
          }
      } else if (action.type === 'notification') {
          // Notification Action
          let msg = `[自动化规则触发] ${action.params.label || '系统自动执行'}`;
          
          // Enhanced Smart Notification Generation
          // If we have context data (injected by AutomationEngine), try to make the message more informative
          const ctx = action.params._context;
          if (ctx && ctx.sensorData) {
              const data = ctx.sensorData;
              // Try to guess what triggered this based on values
              // This is a heuristic since we don't know the exact logic node that passed
              // But we can check for common anomalies
              
              const anomalies: string[] = [];
              if (data.temperature > 35) anomalies.push(`温度过高(${data.temperature}°C)`);
              if (data.temperature < 5) anomalies.push(`温度过低(${data.temperature}°C)`);
              if (data.humidity < 30) anomalies.push(`湿度过低(${data.humidity}%)`);
              if (data.humidity > 90) anomalies.push(`湿度过高(${data.humidity}%)`);
              if (data.co2 > 2000) anomalies.push(`CO2浓度过高(${data.co2}ppm)`);
              if (data.soil_moisture < 10) anomalies.push(`土壤缺水(${data.soil_moisture}%)`);
              
              if (anomalies.length > 0) {
                  msg = `🚨 **环境异常警报**\n\n检测到以下异常情况：\n${anomalies.map(a => `- ${a}`).join('\n')}\n\n已自动触发预设规则：${action.params.label || '未命名规则'}`;
              } else {
                  // If no obvious anomaly, just show current key stats
                  msg = `✅ **自动化执行通知**\n\n规则 [${action.params.label || '未命名'}] 已成功执行。\n\n当前环境概览：\n- 温度: ${data.temperature}°C\n- 湿度: ${data.humidity}%\n- 光照: ${data.light} lux`;
              }
          }

          // Send to WeCom
          sendWeComNotification(msg).catch(console.error);
          
          // Send to Chat via BerryBot (Mei Xiao Zhi)
          // Find the BerryBot user first (email: bot@stravision.ai)
          queryOne<{id: number}>('SELECT id FROM users WHERE email = $1', ['bot@stravision.ai'])
            .then(bot => {
                if (bot) {
                    // Send to all admins or a specific user if configured
                    // For now, we broadcast to all admins
                    // TODO: In future, action.params could contain target user ID
                    const adminQuery = "SELECT id FROM users WHERE role = 'admin' OR role = 'super_admin'";
                    // Import execute/query from database if needed, but we used queryOne above.
                    // Since query returns array, we need to import it.
                    // Let's use a simpler approach: send to the user who created the rule?
                    // But rule creation doesn't store creator_id in the rule object passed here easily.
                    // So we default to sending to super_admin or just logging it for now.
                    
                    // Actually, let's just send to the first super_admin found for demonstration
                    queryOne<{id: number}>("SELECT id FROM users WHERE role = 'super_admin' LIMIT 1")
                        .then(admin => {
                            if (admin) {
                                ChatService.sendMessage(bot.id, admin.id, msg, 'text')
                                    .catch(err => this.log('ERROR', `Failed to send BerryBot message: ${err}`));
                            }
                        });
                }
            })
            .catch(err => this.log('ERROR', `Failed to find BerryBot user: ${err}`));
      }
  }

  /**
   * Log message with structured format
   * 
   * @param {string} level - Log level (INFO, WARN, ERROR)
   * @param {string} message - Log message
   * @param {any} data - Optional additional data
   */
  private log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: unknown): void {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      component: 'MQTTService',
      message,
      ...(data ? { data } : {})
    }

    if (level === 'ERROR') {
      console.error(JSON.stringify(logEntry))
    } else if (level === 'WARN') {
      console.warn(JSON.stringify(logEntry))
    } else {
      console.log(JSON.stringify(logEntry))
    }
  }
}
