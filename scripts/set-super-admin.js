
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const email = 'actuacm@163.com';

if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  console.error('DATABASE_URL or POSTGRES_URL is not set');
  process.exit(1);
}

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
});

async function setSuperAdmin() {
  try {
    const res = await pool.query(
      "UPDATE users SET role = 'super_admin' WHERE email = $1 RETURNING *",
      [email]
    );

    if (res.rows.length === 0) {
      console.log(`User with email ${email} not found.`);
    } else {
      console.log(`User ${email} role updated to super_admin.`);
      console.log(res.rows[0]);
    }
  } catch (err) {
    console.error('Error updating user role:', err);
  } finally {
    await pool.end();
  }
}

setSuperAdmin();
