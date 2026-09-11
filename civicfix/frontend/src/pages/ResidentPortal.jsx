import { useEffect, useState } from "react";
import { api } from "../api.js";
import { getMyTrackingIds, addMyTrackingId } from "../utils.js";
import ComplaintForm from "../components/ComplaintForm.jsx";
import AnalysisCard from "../components/AnalysisCard.jsx";
import Tracker from "../components/Tracker.jsx";

export default function ResidentPortal({ user, onSignIn }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [latest, setLatest] = useState(null);
  const [mine, setMine] = useState([]);
  const [confirming, setConfirming] = useState(null);

  async function refreshMine() {
    if (user) {
      try {
        setMine(await api.listMyComplaints());
      } catch {
        setMine([]);
      }
      return;
    }

    const ids = getMyTrackingIds();
    if (ids.length === 0) return setMine([]);
    const results = await Promise.all(
      ids.map((id) => api.getComplaint(id).catch(() => null))
    );
    setMine(results.filter(Boolean).reverse());
  }

  useEffect(() => {
    refreshMine();
  }, [user]);

  async function handleSubmit(text, area, language, coordinates) {
    setSubmitting(true);
    setError("");
    setLatest(null);
    try {
      const complaint = await api.submitComplaint(text, area, language, coordinates);
      addMyTrackingId(complaint.id);
      setLatest(complaint);
      refreshMine();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't reach the AI service — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(id, confirmed) {
    setConfirming(id);
    try {
      await api.confirmResolution(id, confirmed);
      await refreshMine();
    } catch {
      setError("We couldn't update that report right now. Please try again.");
    } finally {
      setConfirming(null);
    }
  }

  return (
    <div className="resident-page">
      <div className="page-intro resident-intro">
        <div>
          <div className="eyebrow">Resident desk / Make your voice count</div>
          <h2 className="section-title">A report should lead somewhere.</h2>
          <p className="section-copy">Tell us what is happening in plain language. E-Complaint System finds the right team, marks urgency, and gives you a number to follow.</p>
        </div>
        <div className="intro-aside"><span className="intro-number">01</span><span>Describe<br />the issue</span></div>
      </div>

      <div className="resident-layout">
        <div>
          <ComplaintForm onSubmit={handleSubmit} submitting={submitting} />
          {error && <div className="error-banner" role="alert"><span aria-hidden="true">!</span>{error}</div>}
          {latest && <><AnalysisCard complaint={latest} /><div className="success-banner" role="status"><span aria-hidden="true">✓</span><div><strong>Report received successfully.</strong><br />Tracking number: {latest.id}{latest.notification?.emailSent ? ` · Confirmation sent to ${latest.reporterEmail || user?.email}.` : user ? " · Your report is saved. Email delivery is not configured yet." : " · Sign in before submitting to receive email updates."}</div></div></>}
          <Tracker complaints={mine} onConfirm={handleConfirm} confirming={confirming} />
        </div>

        <aside className="service-rail">
          <div className="rail-label">What happens next</div>
          <div className="process-step active"><span>01</span><div><strong>We read your report</strong><p>AI picks up the issue, location clues, and urgency.</p></div></div>
          <div className="process-step"><span>02</span><div><strong>It reaches the right team</strong><p>Your report is routed with a clear priority and department.</p></div></div>
          <div className="process-step"><span>03</span><div><strong>You stay in the loop</strong><p>Use your tracking number to see progress and confirm the fix.</p></div></div>
          <div className="rail-note"><span aria-hidden="true">✦</span><div><strong>{user ? `Signed in as ${user.email}` : "Good to know"}</strong><p>{user ? "Your verified account email will receive E-Complaint System updates." : "You can report anonymously. Sign in before submitting if you want email confirmations."}{!user && <button type="button" className="inline-link" onClick={onSignIn}>Sign in now</button>}</p></div></div>
        </aside>
      </div>
    </div>
  );
}
