
const { initDB, query } = require('./lib/db/database');

async function run() {
    await initDB();
    const rows = await query('SELECT * FROM sensor_readings ORDER BY created_at DESC LIMIT $1', [5]);
    console.log('Last 5 sensor readings:', rows);
}

run();
