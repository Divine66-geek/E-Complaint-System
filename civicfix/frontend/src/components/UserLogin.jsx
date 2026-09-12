import { useState } from "react";

const DEPARTMENTS = [
  "Water Services",
  "Roads & Transportation",
  "Electricity & Energy Services",
  "Waste Management",
  "Sanitation Services",
  "Infrastructure & Planning",
  "General Complaints Office",
];

export default function UserLogin({ role, configured, onSubmit, error }) {
  const isOfficer = role === "officer";
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(email, password, mode, department);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card surface">
        <div className="auth-emblem" aria-hidden="true">{isOfficer ? "▦" : "◌"}</div>
        <div className="eyebrow">{isOfficer ? "Restricted workspace" : "Community account"}</div>
        <h2 className="section-title">{isOfficer ? "Operations access" : "Welcome to E-Complaint System"}</h2>
        <p className="section-copy">{isOfficer ? "Sign in to your authorised department account to view reports and update case status." : "Save your reports, follow progress, and help your community get heard."}</p>

        {!configured ? (
          <>
            <div className="info-banner" role="status"><span>i</span><div>Local demo mode is active. Firebase Authentication is not required for this local run.</div></div>
            <div className="auth-form">
              <button
                type="button"
                className="primary-action"
                onClick={() => onSubmit(isOfficer ? "officer@civicfix.local" : "resident@civicfix.local", "local-demo", "signin")}
                disabled={submitting}
              >
                {submitting ? "Please wait..." : "Continue in demo mode"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="auth-mode-tabs">
              <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
              <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Create account</button>
            </div>
            <form onSubmit={submit} className="auth-form">
              <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              <label>Password<input type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
              {isOfficer && mode === "register" && <label>Department<select value={department} onChange={(event) => setDepartment(event.target.value)}>{DEPARTMENTS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
              {error && <div className="error-banner" role="alert"><span>!</span>{error}</div>}
              <button className="primary-action" disabled={submitting}>{submitting ? "Please wait..." : mode === "register" ? "Create my account" : "Sign in securely"}</button>
            </form>
          </>
        )}

        <p className="auth-note">{isOfficer ? "Ask an administrator to create your officer account and assign your department before signing in." : "Your account keeps your reports private and available to you."}</p>
      </div>
    </div>
  );
}
