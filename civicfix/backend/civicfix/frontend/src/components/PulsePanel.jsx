export default function PulsePanel({ byCategory }) {
  const entries = Object.entries(byCategory || {}).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return <div className="queue-empty"><span>⌁</span><strong>Nothing to show yet</strong><p>New reports will shape the community pulse.</p></div>;
  }

  const max = entries[0][1];

  return (
    <div>
      <div className="pulse-summary"><strong>{entries.reduce((sum, [, count]) => sum + count, 0)}</strong><span>total reports</span></div>
      {entries.map(([cat, count]) => (
        <div key={cat} className="pulse-bar-row">
          <div className="pulse-bar-heading"><span>{cat}</span><strong>{count}</strong></div>
          <div className="pulse-bar-track"><div className="pulse-bar-fill" style={{ width: `${Math.max(9, (count / max) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
