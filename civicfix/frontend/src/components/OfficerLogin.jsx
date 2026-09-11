import { useState } from "react";

export default function OfficerLogin({ configured, onSignIn, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    await onSignIn(email, password);
    setSubmitting(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card surface">
        <div className="eyebrow">Restricted workspace</div>
        <h2 className="section-title">Operations access</h2>
        <p className="section-copy">Sign in with an authorised E-Complaint System officer account to view reports and update case status.</p>
        {!configured ? (
          <div className="error-banner" role="alert"><span>!</span><div>Firebase web authentication is not configured. Register a Web App in <a href="https://console.firebase.google.com/project/civicfix-ai-36699/settings/general" target="_blank" rel="noreferrer">Firebase Project Settings</a>, enable Email/Password sign-in, then add <code>VITE_FIREBASE_API_KEY</code> to <code>frontend/.env</code>.</div></div>
        ) : (
          <form onSubmit={submit} className="auth-form">
            <label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            {error && <div className="error-banner" role="alert"><span>!</span>{error}</div>}
            <button className="primary-action" disabled={submitting}>{submitting ? "Signing in..." : "Sign in securely"}</button>
          </form>
        )}
        <p className="auth-note">Access is verified by the backend on every protected request.</p>
      </div>
    </div>
  );
}