import { default as firebaseAdmin } from "../config/firebase.js";
import { getUserForToken } from "../config/authStore.js";

const localDemoMode = process.env.CIVICFIX_STORAGE === "sqlite";

function getBearerToken(req) {
  const header = req.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
}

export async function requireAuth(req, res, next) {
  if (localDemoMode && !firebaseAdmin) {
    const user = getUserForToken(getBearerToken(req));
    if (!user) return res.status(401).json({ error: "Invalid or expired login session" });
    req.user = { uid: user.id, ...user };
    return next();
  }

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Authentication required" });
  if (!firebaseAdmin) return res.status(503).json({ error: "Authentication is not configured" });

  try {
    req.user = await firebaseAdmin.auth().verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired authentication token" });
  }
}

export async function optionalAuth(req, res, next) {
  if (localDemoMode && !firebaseAdmin) {
    const user = getUserForToken(getBearerToken(req));
    if (user) req.user = { uid: user.id, ...user };
    return next();
  }

  const token = getBearerToken(req);
  if (!token || !firebaseAdmin) return next();

  try {
    req.user = await firebaseAdmin.auth().verifyIdToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired authentication token" });
  }
  next();
}

export function requireOfficer(req, res, next) {
  const role = req.user?.role || req.user?.claims?.role;
  if (role !== "officer" && role !== "admin") {
    return res.status(403).json({ error: "Officer access required" });
  }
  req.isAdmin = role === "admin";
  req.department = req.user?.department || req.user?.claims?.department || null;
  next();
}

export function requireAdmin(req, res, next) {
  const role = req.user?.role || req.user?.claims?.role;
  if (role !== "admin") {
    return res.status(403).json({ error: "Administrator access required" });
  }
  next();
}
