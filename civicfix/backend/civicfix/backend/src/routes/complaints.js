import { Router } from "express";
import { randomBytes } from "node:crypto";
import rateLimit from "express-rate-limit";
import { db } from "../config/firebase.js";
import { classify, checkDuplicate } from "../services/aiServiceClient.js";
import { notify } from "../services/notificationService.js";
import { requireAuth, requireOfficer } from "../middleware/auth.js";

const router = Router();
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many reports submitted. Please try again later." },
});
const SUPPORTED_LANGUAGES = new Set(["af", "en", "nr", "nso", "st", "ss", "tn", "ts", "ve", "xh", "zu"]);

function genTrackingId() {
  return `CF${randomBytes(6).toString("hex").toUpperCase()}`;
}

// POST /api/complaints — resident submits a new report
router.post("/", submitLimiter, requireAuth, async (req, res, next) => {
  try {
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const areaHint = typeof req.body?.area === "string" ? req.body.area.trim() : "";
    const language = typeof req.body?.language === "string" ? req.body.language.trim().toLowerCase() : "en";
    const coordinates = req.body?.coordinates;
    if (!text) return res.status(400).json({ error: "text is required" });
    if (text.length > 800) return res.status(400).json({ error: "text must be 800 characters or fewer" });
    if (areaHint.length > 160) return res.status(400).json({ error: "area must be 160 characters or fewer" });
    if (!SUPPORTED_LANGUAGES.has(language)) return res.status(400).json({ error: "unsupported report language" });
    if (coordinates != null && (
      typeof coordinates !== "object" ||
      !Number.isFinite(coordinates.latitude) ||
      !Number.isFinite(coordinates.longitude) ||
      coordinates.latitude < -90 || coordinates.latitude > 90 ||
      coordinates.longitude < -180 || coordinates.longitude > 180 ||
      (coordinates.accuracy != null && (!Number.isFinite(coordinates.accuracy) || coordinates.accuracy < 0))
    )) {
      return res.status(400).json({ error: "coordinates must contain a valid latitude and longitude" });
    }
    if (req.body && (typeof req.body.text !== "string" || (req.body.area != null && typeof req.body.area !== "string"))) {
      return res.status(400).json({ error: "text and area must be strings" });
    }

    // 1. Classification service
    const classification = await classify(text, language);
    const area = areaHint || classification.area;

    // 2. Fetch open reports in the same category for duplicate comparison
    // Keep this query to one equality filter so new Firebase projects do not
    // require a composite index before the first report can be submitted.
    const snapshot = await db
      .collection("complaints")
      .where("category", "==", classification.category)
      .limit(50)
      .get();

    const candidates = snapshot.docs
      .map((d) => d.data())
      .filter((complaint) => complaint.status !== "closed")
      .slice(0, 20)
      .map((complaint) => ({ id: complaint.id, text: complaint.text }));

    // 3. Duplication detection service
    const dup = await checkDuplicate(text, candidates);

    const id = genTrackingId();
    const status = dup.duplicate_of ? "linked" : "assigned";

    const complaint = {
      id,
      text,
      area,
      category: classification.category,
      department: classification.department,
      priority: classification.priority,
      priorityReason: classification.priority_reason,
      confidence: classification.confidence,
      duplicateOf: dup.duplicate_of || null,
      similarity: dup.similarity || null,
      status,
      createdAt: Date.now(),
      resolvedAt: null,
      closedAt: null,
      reporterEmail: req.user?.email || null,
      reporterUid: req.user?.uid || null,
      language,
      coordinates: coordinates || null,
    };

    await db.collection("complaints").doc(id).set(complaint);
    const receivedNotification = await notify(id, "received", complaint);
    await notify(id, dup.duplicate_of ? "linked" : "assigned", complaint);

    res.status(201).json({
      ...complaint,
      notification: {
        emailSent: receivedNotification.emailSent,
        emailConfigured: Boolean(process.env.SMTP_HOST),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/complaints — department-scoped officer queue; admins see all reports
router.get("/", requireAuth, requireOfficer, async (req, res, next) => {
  try {
    const snapshot = await db.collection("complaints").get();
    const complaints = snapshot.docs.map((d) => d.data())
      .filter((complaint) => req.isAdmin || (req.department && complaint.department === req.department))
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json(complaints);
  } catch (err) {
    next(err);
  }
});

// GET /api/complaints/mine — signed-in resident's own reports
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const snapshot = await db.collection("complaints").get();
    const complaints = snapshot.docs.map((d) => d.data())
      .filter((complaint) => complaint.reporterUid === req.user.uid)
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json(complaints);
  } catch (err) {
    next(err);
  }
});

// GET /api/complaints/:id — resident tracking a specific report
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const doc = await db.collection("complaints").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "not found" });
    const complaint = doc.data();
    if (req.user && complaint.reporterUid !== req.user.uid) {
      return res.status(404).json({ error: "not found" });
    }
    res.json(complaint);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/complaints/:id/status — officer moves a report through the workflow
router.patch("/:id/status", requireAuth, requireOfficer, async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ["investigating", "resolved"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${allowed.join(", ")}` });
    }

    const ref = db.collection("complaints").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "not found" });
    if (!req.isAdmin && doc.data().department !== req.department) {
      return res.status(404).json({ error: "not found" });
    }

    const update = { status };
    if (status === "resolved") update.resolvedAt = Date.now();

    await ref.update(update);
    const updated = { ...doc.data(), ...update };
    await notify(req.params.id, status, updated);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/complaints/:id/confirm — resident confirms whether the fix worked
router.patch("/:id/confirm", requireAuth, async (req, res, next) => {
  try {
    const { confirmed } = req.body || {}; // true = fixed, false = not fixed
    if (typeof confirmed !== "boolean") {
      return res.status(400).json({ error: "confirmed must be a boolean" });
    }
    const ref = db.collection("complaints").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "not found" });
    if (req.user && doc.data().reporterUid !== req.user.uid) {
      return res.status(404).json({ error: "not found" });
    }

    const status = confirmed ? "closed" : "reopened";
    const update = { status };
    if (confirmed) update.closedAt = Date.now();

    await ref.update(update);
    const updated = { ...doc.data(), ...update };
    await notify(req.params.id, status, updated);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
