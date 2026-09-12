import admin from "firebase-admin";
import fs from "fs";
import { createMemoryDb } from "./memoryDb.js";
import { createSqliteDb } from "./sqliteDb.js";

let db;
let firebaseAdmin = null;

if (process.env.CIVICFIX_STORAGE === "sqlite") {
  console.warn("E-Complaint System storage: SQLite database");
  db = createSqliteDb();
} else if (process.env.CIVICFIX_STORAGE === "memory") {
  console.warn("E-Complaint System storage: in-memory development mode (data resets on restart)");
  db = createMemoryDb();
} else {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json";

  if (!fs.existsSync(credPath)) {
    console.error(
      `\nMissing Firebase service account file at "${credPath}".\n` +
      `For local development, set CIVICFIX_STORAGE=memory in backend/.env.\n`
    );
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(credPath, "utf-8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  db = admin.firestore();
  firebaseAdmin = admin;
}

export { db };
export default firebaseAdmin;
