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

  async function handleSubmit(text, area, language, coordinates, image) {
    setSubmitting(true);
    setError("");
    setLatest(null);
    try {
      const complaint = await api.submitComplaint(text, area, language, coordinates, image);
      addMyTrackingId(complaint.id);
      setLatest(complaint);
      refreshMine();
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.error;
      if (status === 401) {
        setError("Your session has expired. Please sign in again before sending this report.");
      } else if (status === 413) {
        setError("That photo is too large. Please choose an image under 10 MB.");
      } else if (message) {
        setError(`Your report could not be sent: ${message}`);
      } else {
        setError("We could not send your report. Check that the backend is running, then try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImageAnalyze(image, description = "") {
    try {
      return await api.analyzeImage(image, description);
    } catch (err) {
      const message = err.response?.status === 413
        ? "That photo is too large. Please choose an image under 10 MB."
        : err.response?.data?.error || "We couldn't analyse that photo yet.";
      setError(message);
      return null;
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
          <h2 className="section-title">Report a civic issue.</h2>
        </div>
      </div>

      <div className="resident-layout">
        <div>
          <ComplaintForm onSubmit={handleSubmit} onImageAnalyze={handleImageAnalyze} submitting={submitting} />
          {error && <div className="error-banner" role="alert"><span aria-hidden="true">!</span>{error}</div>}
          {latest && <><AnalysisCard complaint={latest} /><div className="success-banner" role="status"><span aria-hidden="true">✓</span><div><strong>Report received successfully.</strong><br />Tracking number: {latest.id}{latest.notification?.emailSent ? ` · Confirmation sent to ${latest.reporterEmail || user?.email}.` : user ? " · Your report is saved. Email delivery is not configured yet." : " · Sign in before submitting to receive email updates."}</div></div></>}
          <Tracker complaints={mine} onConfirm={handleConfirm} confirming={confirming} />
        </div>
      </div>
    </div>
  );
}

