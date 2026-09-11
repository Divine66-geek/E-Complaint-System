import { PRIORITY_CLASSES, STATUS_LABELS } from "../utils.js";

export default function Tracker({ complaints, onConfirm, confirming }) {
  if (complaints.length === 0) return null;

  return (
    <div className="surface tracker-panel">
      <div className="tracker-heading"><div><div className="eyebrow">Your activity</div><h3>Your reports</h3></div><span className="tracker-count">{complaints.length} active</span></div>
      <p className="tracker-copy">Only reports linked to your account appear here.</p>

      {complaints.map((c) => (
        <div key={c.id} className="report-row">
          <div className="report-row-top">
            <div>
              <span className={`inline-block px-2 py-0.5 rounded-sm text-xs font-semibold ${PRIORITY_CLASSES[c.priority]}`}>
                {c.priority}
              </span>
              <strong className="ml-2 text-sm">{c.category}</strong>
              <span className="report-id">{c.id}</span>
            </div>
            <span className="status-pill">
              {STATUS_LABELS[c.status] || c.status}
            </span>
          </div>
          <div className="report-text">{c.text}</div>

          {c.status === "resolved" && (
            <div className="confirm-row">
              <span className="text-sm">Has this been fixed?</span>
              <span className="confirm-actions">
                <button
                  onClick={() => onConfirm(c.id, true)}
                  disabled={confirming === c.id}
                  className="confirm-yes"
                >
                  {confirming === c.id ? "Updating..." : "Yes, it's fixed"}
                </button>
                <button
                  onClick={() => onConfirm(c.id, false)}
                  disabled={confirming === c.id}
                  className="confirm-no"
                >
                  Not yet
                </button>
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
