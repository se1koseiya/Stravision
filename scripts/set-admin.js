const { Pool } = require('pg');
require('dotenv').config();

const email = process.argv[2];
const role = process.argv[3] || 'super_admin';

if (!email) {
  console.log('Usage: node scripts/set-admin.js <email> [role]');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function setAdmin() {
  const client = await pool.connect();
  try {
    // Check if role column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('Adding role column...');
      await client.query("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
      await client.query("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '{}'");
    }

    const result = await client.query(
      "UPDATE users SET role = $1 WHERE email = $2",
      [role, email]
    );

    if (result.rowCount > 0) {
      console.log(`User ${email} is now ${role}`);
    } else {
      console.log(`User ${email} not found`);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

setAdmin();
