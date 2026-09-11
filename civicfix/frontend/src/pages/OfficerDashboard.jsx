import { useEffect, useState } from "react";
import { api } from "../api.js";
import StatsBar from "../components/StatsBar.jsx";
import QueueList from "../components/QueueList.jsx";
import PulsePanel from "../components/PulsePanel.jsx";

export default function OfficerDashboard({ user, onSignOut }) {
  const [complaints, setComplaints] = useState([]);
  const [summary, setSummary] = useState({ total: 0, urgent: 0, open: 0, resolved: 0, byCategory: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [list, stats] = await Promise.all([api.listComplaints(), api.analyticsSummary()]);
      setComplaints(list);
      setSummary(stats);
      setLastUpdated(new Date());
    } catch {
      setError("The operations feed is unavailable. Check that the backend is running, then refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAction(id, status) {
    try {
      await api.updateStatus(id, status);
      await refresh();
    } catch {
      setError("That status update did not go through. Please try again.");
    }
  }

  const filteredComplaints = complaints.filter((complaint) => {
    const haystack = `${complaint.id} ${complaint.text} ${complaint.category} ${complaint.area} ${complaint.department}`.toLowerCase();
    return (statusFilter === "all" || complaint.status === statusFilter) &&
      (priorityFilter === "all" || complaint.priority === priorityFilter) &&
      haystack.includes(query.toLowerCase());
  });

  return (
    <div className="officer-page">
      <div className="page-intro officer-intro">
        <div><div className="eyebrow">Operations view / {user?.role === "admin" ? "All departments" : user?.department || "Department desk"}</div><h2 className="section-title">Good triage makes good service.</h2><p className="section-copy">A live view of {user?.role === "admin" ? "every department's" : "your department's"} reports, what is moving, and where your team should look next.</p></div>
        <div className="refresh-block"><span className="live-dot"><i /> Live queue</span><button onClick={refresh} className="refresh-button" disabled={loading}>↻ {loading ? "Updating" : "Refresh"}</button><button onClick={onSignOut} className="signout-button">Sign out</button>{user?.email && <small>{user.email}</small>}{lastUpdated && <small>Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>}</div>
      </div>

      <StatsBar stats={summary} />

      <div className="operations-layout">
        <section className="surface queue-panel">
          <div className="queue-heading"><div><div className="eyebrow">Priority desk</div><h3>Complaint queue</h3><p>Sort, scan, and move reports through the response cycle.</p></div><span className="queue-count">{filteredComplaints.length} of {complaints.length} reports</span></div>
          <div className="queue-tools">
            <label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports, areas, teams..." aria-label="Search reports" /></label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option><option value="assigned">Assigned</option><option value="investigating">Investigating</option><option value="resolved">Waiting on resident</option><option value="reopened">Reopened</option><option value="closed">Closed</option></select>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filter by priority"><option value="all">All priorities</option><option value="Urgent">Urgent</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select>
          </div>
          {error && <div className="error-banner" role="alert"><span>!</span>{error}</div>}
        {loading ? (
          <div className="queue-loading"><span /> <span /> <span /></div>
        ) : (
          <QueueList complaints={filteredComplaints} onAction={handleAction} />
        )}
        </section>

        <aside className="surface pulse-panel"><div className="eyebrow">Community pulse</div><h3>What is surfacing?</h3><p className="pulse-copy">All-time reports by issue type.</p><PulsePanel byCategory={summary.byCategory} /></aside>
      </div>
    </div>
  );
}
