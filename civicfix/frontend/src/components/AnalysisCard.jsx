import { PRIORITY_CLASSES } from "../utils.js";

const LANGUAGE_NAMES = {
  af: "Afrikaans",
  en: "English",
  nr: "isiNdebele",
  nso: "Sepedi",
  st: "Sesotho",
  ss: "siSwati",
  tn: "Setswana",
  ts: "XiTsonga",
  ve: "Tshivenda",
  xh: "isiXhosa",
  zu: "isiZulu",
};

export default function AnalysisCard({ complaint }) {
  const steps = [
    { key: "received", label: "Received" },
    { key: "classified", label: "Classified" },
    { key: "assigned", label: "Assigned" },
    { key: "investigating", label: "Investigating" },
    { key: "resolved", label: "Resolved" },
  ];
  const doneCount = complaint.status === "linked" || complaint.duplicateOf ? 3 : 3;

  return (
    <div className="analysis-card">
      <div className="analysis-header">
        <div><span className="analysis-kicker">Routing complete</span><strong>Your report is in the system</strong></div>
        <span className="tracking-chip">{complaint.id}</span>
      </div>
      <div className="analysis-body">
        <p className="analysis-intro">We've read the details and sent this to the team best placed to help.</p>
        <div className="analysis-grid">
          <Field k="Issue type" v={complaint.category} />
          <Field k="Report language" v={LANGUAGE_NAMES[complaint.language] || complaint.language || "English"} />
          <Field k="Location sharing" v={complaint.coordinates ? "Coordinates attached" : "Not shared"} />
          <Field k="Service area" v={complaint.area || "Not specified"} />
          <Field k="Assigned team" v={complaint.department} />
          <Field
            k="Priority signal"
            v={
              <>
                <span className={`inline-block px-2.5 py-0.5 rounded-sm text-sm font-semibold ${PRIORITY_CLASSES[complaint.priority]}`}>
                  {complaint.priority}
                </span>
                {complaint.confidence != null && (
                  <span className="text-xs text-inksoft ml-2">{complaint.confidence}% confidence</span>
                )}
              </>
            }
          />
        </div>

        {complaint.priorityReason && (
          <div className="priority-reason">
            <span>Why this priority</span>
            {complaint.priorityReason}
          </div>
        )}

        {complaint.duplicateOf && (
          <div className="duplicate-callout">
            <b>Possible duplicate.</b> This looks like the
            same issue as report <b>{complaint.duplicateOf}</b> — about{" "}
            {complaint.similarity ?? "—"}% similar. It's been linked instead of
            opened as a new case.
          </div>
        )}

        <div className="progress-row">
          {steps.map((s, i) => (
            <div
              key={s.key}
              className={`progress-step ${
                i < doneCount ? "text-primary-deep font-semibold" : "text-linestrong"
              }`}
            >
              <span className={`progress-marker ${
                  i < doneCount ? "bg-primary" : "bg-linestrong"
                }`} />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ k, v }) {
  return (
    <div className="border-b border-line pb-2">
      <div className="text-xs text-inksoft mb-0.5">{k}</div>
      <div className="text-sm font-medium">{v}</div>
    </div>
  );
}
