export const runtime = 'nodejs'

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }
  console.log('Starting scheduler instrumentation...')
  const { initDB } = await import("@/lib/db/database")
  const { SchedulerRunner } = await import("@/lib/scheduler/runner")
  const { initSensorDataIfNeeded, cleanupOldSensorData } = await import("@/lib/db/device-service")
  const { startDataCollector } = await import("@/lib/services/data-collector")
  const cron = (await import("node-cron")).default

  try {
    await initDB()
    await SchedulerRunner.getInstance().init()
    await initSensorDataIfNeeded()

    cron.schedule('0 0 * * *', async () => {
      console.log('[System] Running daily data cleanup...')
      await cleanupOldSensorData()
    })
  } catch (error) {
    console.error("Scheduler instrumentation skipped due to DB init failure:", error)
    return
  }

  // startDataCollector() // Disabled to allow real data from MQTT
}
