#!/usr/bin/env node
/** Create or update an institutional shuttle account. */
import { loadSeed, upsertUser } from '../src/services/shuttleDb.js';
import { hashPassword } from '../src/utils/password.js';

const [email, password, name = 'RMUTL User', role = 'user'] = process.argv.slice(2);
if (!email || !email.trim().toLowerCase().endsWith('@rmutl.ac.th') || !password || password.length < 8 || !['user', 'admin'].includes(role)) {
  console.error('Usage: npm run create-user -- <name@rmutl.ac.th> <password (8+ chars)> [name] [user|admin]');
  process.exit(1);
}

await loadSeed();
const result = upsertUser({ email, passwordHash: hashPassword(password), name, role });
console.log(result === 'created' ? `Created account ${email}` : `Updated account ${email}`);
