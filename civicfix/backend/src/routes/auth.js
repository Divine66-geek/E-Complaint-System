import { Router } from "express";
import { default as firebaseAdmin } from "../config/firebase.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { loginUser, registerUser } from "../config/authStore.js";

const router = Router();
const DEPARTMENTS = [
  "Water Services",
  "Roads & Transportation",
  "Electricity & Energy Services",
  "Waste Management",
  "Sanitation Services",
  "Infrastructure & Planning",
  "General Complaints Office",
];

router.post("/register", (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = registerUser(email || "", password || "");
    const session = loginUser(email, password);
    res.status(201).json({ ...session, user });
  } catch (error) {
    const status = error.message === "EMAIL_EXISTS" ? 409 : 400;
    res.status(status).json({ error: error.message || "Registration failed" });
  }
});

router.post("/register-officer", (req, res) => {
  try {
    const { email, password, department } = req.body || {};
    const user = registerUser(email || "", password || "", "officer", department || "General Complaints Office");
    const session = loginUser(email, password);
    res.status(201).json({ ...session, user });
  } catch (error) {
    const status = error.message === "EMAIL_EXISTS" ? 409 : 400;
    res.status(status).json({ error: error.message || "Officer registration failed" });
  }
});

router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body || {};
    res.json(loginUser(email || "", password || ""));
  } catch {
    res.status(401).json({ error: "Invalid email or password" });
  }
});

router.post("/department-registration", requireAuth, requireAdmin, async (req, res, next) => {
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
