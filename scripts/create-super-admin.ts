
import { initDB, queryOne, execute } from "../lib/db/database"
import bcrypt from "bcryptjs"

function generatePassword(length = 16) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let retVal = ""
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n))
  }
  return retVal
}

async function createSuperAdmin() {
  console.log("Initializing database...")
  await initDB()

  const email = "super_admin@stravision.ai"
  const password = generatePassword()
  const username = "SuperAdmin"

  console.log(`Checking for user ${email}...`)
  const existingUser = await queryOne("SELECT * FROM users WHERE email = $1", [email])

  console.log("Hashing password...")
  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(password, salt)

  if (existingUser) {
    console.log("User exists, updating password and role...")
    await execute("UPDATE users SET password_hash = $1, role = 'super_admin' WHERE email = $2", [hash, email])
    console.log(`Updated existing user ${email} to super_admin`)
  } else {
    console.log("Creating new user...")
    const now = Date.now()
    // Ensure we don't have a UID collision, though unlikely for 'super_admin_001'
    try {
        await execute(
          `INSERT INTO users (email, password_hash, username, role, created_at, updated_at, uid)
           VALUES ($1, $2, $3, 'super_admin', $4, $5, $6)`,
          [email, hash, username, now, now, "super_admin_001"]
        )
    } catch (e) {
         // If uid collides (e.g. manual entry), try another one or just let it fail if email unique constraint didn't catch it
         console.log("Creation failed, possibly UID collision, retrying with random UID...")
         const randomUid = Math.random().toString(36).substring(2, 10);
         await execute(
           `INSERT INTO users (email, password_hash, username, role, created_at, updated_at, uid)
            VALUES ($1, $2, $3, 'super_admin', $4, $5, $6)`,
           [email, hash, username, now, now, `super_admin_${randomUid}`]
         )
    }
    console.log(`Created new super_admin user ${email}`)
  }

  console.log("\n============================================")
  console.log("SUPER ADMIN ACCOUNT CREATED SUCCESSFULLY")
  console.log("============================================")
  console.log(`Email:    ${email}`)
  console.log(`Password: ${password}`)
  console.log("============================================")
}

createSuperAdmin().catch(console.error)
