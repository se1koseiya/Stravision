/**
 * MQTT Configuration Management Module
 * 
 * This module handles MQTT configuration loading from environment variables,
 * validation, and provides type-safe configuration access.
 */

/**
 * MQTT Configuration Interface
 * Defines all required configuration parameters for MQTT connection
 */
export interface MQTTConfig {
  host: string
  port: number
  username: string
  password: string
  subscribeTopic: string
  publishTopic: string
  useSSL: boolean
  keepalive: number
  reconnectPeriod: number
}

/**
 * Default MQTT Configuration Values
 * Used as fallback when environment variables are not set
 */
const DEFAULT_CONFIG: Partial<MQTTConfig> = {
  port: 8883,
  useSSL: true,
  keepalive: 60,
  reconnectPeriod: 5000,
  subscribeTopic: 'meimefarm/basic_env_data',
  publishTopic: 'data/set'
}

/**
 * Get MQTT Configuration from Environment Variables
 * 
 * Reads configuration from process.env and applies defaults where needed.
 * 
 * @returns {MQTTConfig} Complete MQTT configuration object
 * @throws {Error} If required environment variables are missing
 */
export function getMQTTConfig(): MQTTConfig {
  const config: MQTTConfig = {
    host: process.env.MQTT_HOST || '',
    port: parseInt(process.env.MQTT_PORT || String(DEFAULT_CONFIG.port), 10),
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    subscribeTopic: process.env.MQTT_SUBSCRIBE_TOPIC || DEFAULT_CONFIG.subscribeTopic!,
    publishTopic: process.env.MQTT_PUBLISH_TOPIC || DEFAULT_CONFIG.publishTopic!,
    useSSL: process.env.MQTT_USE_SSL === 'true' || DEFAULT_CONFIG.useSSL!,
    keepalive: parseInt(process.env.MQTT_KEEPALIVE || String(DEFAULT_CONFIG.keepalive), 10),
    reconnectPeriod: parseInt(process.env.MQTT_RECONNECT_PERIOD || String(DEFAULT_CONFIG.reconnectPeriod), 10)
  }

  return config
}

/**
 * Validate MQTT Configuration
 * 
 * Checks if all required fields are present and valid.
 * Validates data types and ranges for configuration values.
 * 
 * @param {MQTTConfig} config - Configuration object to validate
 * @returns {boolean} True if configuration is valid
 * @throws {Error} If configuration is invalid, with detailed error message
 */
export function validateMQTTConfig(config: MQTTConfig): boolean {
  const errors: string[] = []

  // Validate required string fields
  if (!config.host || config.host.trim() === '') {
    errors.push('MQTT_HOST is required and cannot be empty')
  }

  if (!config.username || config.username.trim() === '') {
    errors.push('MQTT_USERNAME is required and cannot be empty')
  }

  if (!config.password || config.password.trim() === '') {
    errors.push('MQTT_PASSWORD is required and cannot be empty')
  }

  if (!config.subscribeTopic || config.subscribeTopic.trim() === '') {
    errors.push('MQTT_SUBSCRIBE_TOPIC is required and cannot be empty')
  }

  if (!config.publishTopic || config.publishTopic.trim() === '') {
    errors.push('MQTT_PUBLISH_TOPIC is required and cannot be empty')
  }

  // Validate port number
  if (isNaN(config.port) || config.port <= 0 || config.port > 65535) {
    errors.push('MQTT_PORT must be a valid port number (1-65535)')
  }

  // Validate keepalive
  if (isNaN(config.keepalive) || config.keepalive < 0) {
    errors.push('MQTT_KEEPALIVE must be a non-negative number')
  }

  // Validate reconnect period
  if (isNaN(config.reconnectPeriod) || config.reconnectPeriod < 0) {
    errors.push('MQTT_RECONNECT_PERIOD must be a non-negative number')
  }

  // Validate boolean
  if (typeof config.useSSL !== 'boolean') {
    errors.push('MQTT_USE_SSL must be a boolean value')
  }

  // If there are validation errors, throw with detailed message
  if (errors.length > 0) {
    throw new Error(`MQTT Configuration validation failed:\n${errors.join('\n')}`)
  }

  return true
}

/**
 * Get and Validate MQTT Configuration
 * 
 * Convenience function that combines getMQTTConfig and validateMQTTConfig.
 * Use this function to get a validated configuration in one call.
 * 
 * @returns {MQTTConfig} Validated MQTT configuration object
 * @throws {Error} If configuration is invalid
 */
export function getValidatedMQTTConfig(): MQTTConfig {
  const config = getMQTTConfig()
  validateMQTTConfig(config)
  return config
}
