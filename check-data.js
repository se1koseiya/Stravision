const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

console.log('Connecting to PostgreSQL...');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkData() {
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT * FROM scheduled_tasks ORDER BY created_at DESC LIMIT 5"
        );
        console.log('Recent tasks found:', result.rows.length);
        result.rows.forEach(t => {
            const d = new Date(Number(t.execute_at));
            console.log(`Task ${t.id}: ${t.title}, execute_at=${t.execute_at} (${d.toISOString()})`);
        });
    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

checkData();
