import { Router } from "express";
import { default as firebaseAdmin } from "../config/firebase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const DEPARTMENTS = [
  "Water Services",
  "Roads & Transportation",
  "Electricity & Energy Services",
  "Waste Management",
  "Sanitation Services",
];

router.post("/department-registration", requireAuth, async (req, res, next) => {
  try {
    const { department } = req.body || {};
    if (!DEPARTMENTS.includes(department)) {
      return res.status(400).json({ error: "Select a valid department" });
    }

    await firebaseAdmin.auth().setCustomUserClaims(req.user.uid, { role: "officer", department });
    res.json({ role: "officer", department });
  } catch (error) {
    next(error);
  }
});

export default router;