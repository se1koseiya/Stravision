import { saveSensorReading } from "@/lib/db/device-service"

let intervalId: NodeJS.Timeout | null = null

export function startDataCollector() {
  if (intervalId) return

  console.log("Starting data collector service...")
  
  // Run immediately once
  collectData()

  // Then run every 5 minutes
  intervalId = setInterval(collectData, 5 * 60 * 1000)
}

function collectData() {
  // Simulate reading from sensors
  // In a real app, this would query MQTT or external API
  
  const now = new Date()
  const hour = now.getHours()
  const isDay = hour >= 6 && hour <= 18

  // Generate realistic current values based on time of day + random noise
  // We can't easily "read previous value" here without querying DB, 
  // so we'll use a stateless generation approach or simple random walk if we held state in memory.
  // For simplicity, let's generate based on time patterns + random.

  const tempBase = isDay ? 25 : 15
  const humBase = isDay ? 50 : 70
  
  // Add some randomness
  const temperature = tempBase + Math.random() * 5
  const humidity = humBase + Math.random() * 10
  
  let light = 0
  if (isDay) {
     // Simple sun curve
     const sunHeight = Math.sin(((hour - 6) / 12) * Math.PI)
     light = sunHeight * 40000 + Math.random() * 5000
  }
  
  const co2 = 400 + Math.random() * 50
  const soil_moisture = 40 + Math.random() * 10
  const earth_n = 100 + Math.random() * 5
  const earth_p = 50 + Math.random() * 2
  const earth_k = 120 + Math.random() * 5
  const rainfall = Math.random() > 0.95 ? Math.random() * 2 : 0

  saveSensorReading({
    temperature,
    humidity,
    light: Math.max(0, light),
    co2,
    soil_moisture,
    earth_n,
    earth_p,
    earth_k,
    rainfall
  }).catch(err => console.error("Failed to save sensor reading:", err))
}
