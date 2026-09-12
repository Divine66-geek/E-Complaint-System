import { useState } from "react";

const DEPARTMENTS = [
  "Water Services",
  "Roads & Stormwater",
  "Electricity & Energy Services",
  "Waste Management",
  "Sanitation Services",
];

export default function UserLogin({ role, configured, onSubmit, onDepartmentRegister, onContinue, error }) {
  const isOfficer = role === "officer";
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [departmentAccounts, setDepartmentAccounts] = useState(() => Object.fromEntries(DEPARTMENTS.map((name) => [name, { email: "", password: "", status: "" }])));

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    await onSubmit(email, password, mode, department);
    setSubmitting(false);
  }

  async function registerDepartment(departmentName) {
    const account = departmentAccounts[departmentName];
    if (!account.email || account.password.length < 6) {
      setDepartmentAccounts((current) => ({ ...current, [departmentName]: { ...account, status: "Enter an email and a password of at least 6 characters." } }));
      return;
    }

    setDepartmentAccounts((current) => ({ ...current, [departmentName]: { ...account, status: "Creating account..." } }));
    try {
      await onDepartmentRegister(account.email, account.password, departmentName);
      setDepartmentAccounts((current) => ({ ...current, [departmentName]: { ...account, status: "Registered" } }));
    } catch (registrationError) {
      setDepartmentAccounts((current) => ({ ...current, [departmentName]: { ...account, status: registrationError.message || "Registration failed." } }));
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card surface">
        <div className="auth-emblem" aria-hidden="true">{isOfficer ? "▦" : "◌"}</div>
        <div className="eyebrow">{isOfficer ? "Restricted workspace" : "Community account"}</div>
        <h2 className="section-title">{isOfficer ? "Operations access" : "Welcome to E-Complaint System"}</h2>
        <p className="section-copy">{isOfficer ? "Register or sign in to your department account to view reports and update case status." : "Save your reports, follow progress, and help your community get heard."}</p>

        {!configured ? (
          <div className="error-banner" role="alert"><span>!</span><div>Firebase Authentication needs to be configured first. Add the web app values from <a href="https://console.firebase.google.com/project/civicfix-ai-36699/settings/general" target="_blank" rel="noreferrer">Project Settings</a>.</div></div>
        ) : (
          <>
            <div className="auth-mode-tabs">
              <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
              <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>{isOfficer ? "Register departments" : "Create account"}</button>
            </div>
            {isOfficer && mode === "register" ? (
              <div className="department-registration-list">
                <p className="section-copy">Create one separate officer account for each department. Each account will only see its own department's complaints.</p>
                {DEPARTMENTS.map((departmentName) => {
                  const account = departmentAccounts[departmentName];
                  return (
                    <div className="department-registration-card" key={departmentName}>
                      <strong>{departmentName}</strong>
                      <input type="email" autoComplete="email" placeholder="Department email" aria-label={`${departmentName} email`} value={account.email} onChange={(event) => setDepartmentAccounts((current) => ({ ...current, [departmentName]: { ...account, email: event.target.value, status: "" } }))} />
                      <input type="password" autoComplete="new-password" placeholder="Password (6+ characters)" aria-label={`${departmentName} password`} value={account.password} onChange={(event) => setDepartmentAccounts((current) => ({ ...current, [departmentName]: { ...account, password: event.target.value, status: "" } }))} />
                      <button type="button" className="secondary-action" onClick={() => registerDepartment(departmentName)}>{account.status === "Registered" ? "Registered" : "Register department"}</button>
                      {account.status && <small className={account.status === "Registered" ? "registration-success" : "registration-status"}>{account.status}</small>}
                    </div>
                  );
                })}
              </div>
            ) : <form onSubmit={submit} className="auth-form">
              <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              <label>Password<input type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
              {isOfficer && mode === "register" && <><label>Department<select value={department} onChange={(event) => setDepartment(event.target.value)} required><option value="">Select your department</option><option>Water Services</option><option>Roads &amp; Stormwater</option><option>Electricity &amp; Energy Services</option><option>Waste Management</option><option>Sanitation Services</option></select></label><div className="temporary-notice">Your account will be linked to this department and can access the Operations dashboard.</div></>}
              {error && <div className="error-banner" role="alert"><span>!</span>{error}</div>}
              <button className="primary-action" disabled={submitting}>{submitting ? "Please wait..." : mode === "register" ? "Create my account" : "Sign in securely"}</button>
            </form>}
          </>
        )}

        <p className="auth-note">{isOfficer ? "Access is verified by the backend on every protected request." : "Your account keeps your reports private and available to you."}</p>
      </div>
    </div>
  );
}