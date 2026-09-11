import { Router } from "express";
import { db } from "../config/firebase.js";
import { requireAuth, requireOfficer } from "../middleware/auth.js";

const router = Router();

// GET /api/analytics/summary
router.get("/summary", requireAuth, requireOfficer, async (req, res, next) => {
  try {
    const snapshot = await db.collection("complaints").get();
    const complaints = snapshot.docs.map((d) => d.data())
      .filter((complaint) => req.isAdmin || (req.department && complaint.department === req.department));

    const total = complaints.length;
    const urgent = complaints.filter((c) => c.priority === "Urgent" && c.status !== "closed").length;
    const open = complaints.filter((c) => c.status !== "closed").length;
    const closed = complaints.filter((c) => c.status === "closed");
    const resolved = closed.length;

    const byCategory = {};
    const byPriority = {};
    for (const c of complaints) {
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
    }

    const resolutionTimes = closed
      .filter((c) => c.closedAt && c.createdAt)
      .map((c) => c.closedAt - c.createdAt);
    const avgResolutionMs = resolutionTimes.length
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : null;

    res.json({
      total,
      urgent,
      open,
      resolved,
      byCategory,
      byPriority,
      avgResolutionHours: avgResolutionMs ? +(avgResolutionMs / 3600000).toFixed(1) : null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
