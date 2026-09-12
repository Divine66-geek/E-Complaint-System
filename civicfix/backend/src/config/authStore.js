import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const databasePath = process.env.SQLITE_DATABASE || path.resolve(process.cwd(), "data", "civicfix.sqlite");
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const database = new Database(databasePath);

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'resident',
    department TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
`);

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

function publicUser(row) {
  return { id: row.id, email: row.email, role: row.role, department: row.department || null };
}

export function registerUser(email, password, role = "resident", department = null) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || password.length < 6) throw new Error("Email and a password of at least 6 characters are required");
  const existing = database.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) throw new Error("EMAIL_EXISTS");

  const user = { id: crypto.randomUUID(), email: normalizedEmail, role, department, created_at: Date.now() };
  database.prepare("INSERT INTO users (id, email, password_hash, role, department, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(user.id, user.email, hashPassword(password), user.role, user.department, user.created_at);
  return publicUser(user);
}

export function loginUser(email, password) {
  const row = database.prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase());
  if (!row || !verifyPassword(password, row.password_hash)) throw new Error("INVALID_LOGIN");
  const token = crypto.randomBytes(32).toString("hex");
  database.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, row.id, Date.now() + 1000 * 60 * 60 * 24 * 7);
  return { token, user: publicUser(row) };
}

export function getUserForToken(token) {
  const row = database.prepare(`
    SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ? AND sessions.expires_at > ?
  `).get(token, Date.now());
  return row ? publicUser(row) : null;
}

try {
  const officer = database.prepare("SELECT id FROM users WHERE email = ?").get("officer@civicfix.local");
  if (!officer) registerUser("officer@civicfix.local", "demo1234", "officer", "General Complaints Office");
} catch {
  // The database remains usable even if the optional demo seed already exists.
}
