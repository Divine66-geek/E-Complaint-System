export default function StatsBar({ stats }) {
  const items = [
    { label: "Total reports", value: stats.total, note: "All time", style: "total" },
    { label: "Needs attention", value: stats.urgent, note: "Urgent priority", style: "urgent" },
    { label: "In progress", value: stats.open, note: "Open cases", style: "open" },
    { label: "Resolved", value: stats.resolved, note: stats.avgResolutionHours ? `${stats.avgResolutionHours}h avg. resolution` : "No closed cases yet", style: "resolved" },
  ];
  return (
    <div className="stats-grid">
      {items.map((it) => (
        <div key={it.label} className={`stat-card stat-${it.style}`}>
          <div className="stat-top"><span className="stat-value">{it.value}</span><span className="stat-spark" /></div>
          <div className="stat-label">{it.label}</div>
          <div className="stat-note">{it.note}</div>
        </div>
      ))}
    </div>
  );
}
