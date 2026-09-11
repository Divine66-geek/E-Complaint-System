import { PRIORITY_BAR, STATUS_LABELS, timeAgo } from "../utils.js";

const RANK = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

export default function QueueList({ complaints, onAction }) {
  if (complaints.length === 0) {
    return (
      <div className="queue-empty">
        <span>⌁</span><strong>No reports match this view</strong>
        <p>Try clearing a filter or searching for a different area, team, or tracking number.</p>
      </div>
    );
  }

  const sorted = [...complaints].sort(
    (a, b) => RANK[a.priority] - RANK[b.priority] || b.createdAt - a.createdAt
  );

  return (
    <div>
      {sorted.map((c) => (
        <div key={c.id} className="queue-item">
          <div className={`queue-priority ${PRIORITY_BAR[c.priority]}`} />
          <div className="queue-item-main">
            <div className="queue-item-heading"><div><span className="queue-category">{c.category}</span><span className="queue-area">{c.area || "Area unknown"}</span></div><span className="queue-time">{timeAgo(c.createdAt)}</span></div>
            <div className="queue-description">{c.text}</div>
            <div className="queue-tags"><Tag>{c.department}</Tag><Tag>{c.id}</Tag><Tag>{STATUS_LABELS[c.status] || c.status}</Tag>{c.duplicateOf && <Tag>Linked to {c.duplicateOf}</Tag>}</div>
            <div className="queue-actions">
              <span className={`priority-label priority-${c.priority.toLowerCase()}`}>{c.priority} priority</span>
              {c.status === "assigned" || c.status === "reopened" ? <ActionButton onClick={() => onAction(c.id, "investigating")}>Start investigating</ActionButton> : null}
              {c.status === "investigating" ? <ActionButton onClick={() => onAction(c.id, "resolved")}>Mark resolved</ActionButton> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Tag({ children }) {
  return (
    <span className="text-xs bg-paper border border-line rounded-full px-2.5 py-0.5 text-inksoft">
      {children}
    </span>
  );
}

function ActionButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-semibold bg-primary text-white rounded-sm px-3 py-1.5"
    >
      {children}
    </button>
  );
}
