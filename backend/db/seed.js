/**
 * Seed script — run once after creating the schema:
 *   node backend/db/seed.js
 *
 * Updates the placeholder bcrypt hashes in the users table
 * with the real hashed passwords.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db     = require('./index');

const CREDENTIALS = [
  { email: 'admin@beginnersfieldschool.edu.ng',   password: 'Admin@2025'   },
  { email: 'e.chukwu@beginnersfieldschool.edu.ng', password: 'Teacher@2025' },
  { email: 'k.adamu@beginnersfieldschool.edu.ng',  password: 'Teacher@2025' },
  { email: 'g.okoye@beginnersfieldschool.edu.ng',  password: 'Teacher@2025' },
  { email: 'f.lawal@beginnersfieldschool.edu.ng',  password: 'Teacher@2025' },
  { email: 'student@beginnersfieldschool.edu.ng',  password: 'Student@2025' },
  { email: 'tunde.afolabi@beginnersfieldschool.edu.ng', password: 'Student@2025' },
  { email: 'mary.ekwueme@beginnersfieldschool.edu.ng',  password: 'Student@2025' },
];

async function seed() {
  console.log('🌱 Seeding passwords…');
  for (const cred of CREDENTIALS) {
    const hash = await bcrypt.hash(cred.password, 10);
    await db.execute('UPDATE users SET password = ? WHERE email = ?', [hash, cred.email]);
    console.log(`  ✅ ${cred.email}`);
  }
  console.log('Done.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
