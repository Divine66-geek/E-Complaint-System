import { useEffect, useState } from "react";
import ResidentPortal from "./pages/ResidentPortal.jsx";
import OfficerDashboard from "./pages/OfficerDashboard.jsx";
import UserLogin from "./components/UserLogin.jsx";
import { authConfigured, clearStoredUser, getStoredUser, register, signIn as firebaseSignIn } from "./auth.js";
import { setAuthUser } from "./api.js";

export default function App() {
  const [view, setView] = useState("resident");
  const storedUser = getStoredUser();
  const [user, setUser] = useState(storedUser);
  const [authError, setAuthError] = useState("");
  const [residentLogin, setResidentLogin] = useState(true);
  const [showWelcome, setShowWelcome] = useState(!storedUser);
  const [theme, setTheme] = useState(() => localStorage.getItem("civicfix-theme") || "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("civicfix-theme", theme);
  }, [theme]);

  useEffect(() => {
    setAuthUser(user);
  }, [user]);

  async function authenticate(email, password, mode = "signin", role = view) {
    setAuthError("");
    try {
      const nextUser = mode === "register" ? await register(email, password) : await firebaseSignIn(email, password);
      if (role === "officer" && !["officer", "admin"].includes(nextUser.role)) {
        clearStoredUser();
        throw new Error("Officer access required");
      }

      setUser(nextUser);
      setAuthUser(nextUser);
      if (role === "resident") setResidentLogin(false);
    } catch (error) {
      const code = error.code || "";
      const message = error.message || "";
      if (message === "Officer access required") {
        setAuthError("This account is a resident account. Operations access is limited to authorised officers.");
      } else if (code.includes("EMAIL_EXISTS")) {
        setAuthError("This email already has an account. Use Sign in, or register with a new department email.");
      } else if (code.includes("WEAK_PASSWORD")) {
        setAuthError("Choose a stronger password with at least 6 characters.");
      } else if (code.includes("INVALID_EMAIL")) {
        setAuthError("Enter a valid department email address.");
      } else if (message.includes("Authentication is not configured")) {
        setAuthError("The department registration service is not configured. Start the backend with the Firebase service account.");
      } else if (mode === "register") {
        setAuthError(message || "Department registration failed. Check the email, password, and selected department.");
      } else {
        setAuthError("Sign-in failed. Check your details or ask an administrator to authorise your account.");
      }
    }
  }

  function signOut() {
    clearStoredUser();
    setUser(null);
    setAuthUser(null);
    setView("resident");
    setResidentLogin(true);
    setShowWelcome(true);
  }

  const isOfficer = ["officer", "admin"].includes(user?.role);

  return (
    <div className="app-shell min-h-screen">
      <header className="site-header">
        <div className="brand-lockup">
          <img className="brand-logo" src="/e-complaint-logo.svg" alt="e-Complaint" />
          <div>
            <h1 className="brand-name">E-Complaint <span>System</span></h1>
          </div>
        </div>
        <div className="header-meta">
          <button className="theme-toggle" type="button" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
          </button>
          {user && <><span className="account-chip"><span className="account-avatar" aria-hidden="true">{user.email?.[0]?.toUpperCase() || "U"}</span><span>{user.email}</span></span><button className="header-auth-button" onClick={signOut}>Sign out</button></>}
        </div>
      </header>

      <main className="main-content">
        {showWelcome ? <WelcomePage onResident={() => { setView("resident"); setResidentLogin(true); setShowWelcome(false); }} onOfficer={() => { setView("officer"); setShowWelcome(false); }} /> : view === "resident" ? residentLogin ? <UserLogin role="resident" configured={authConfigured} onSubmit={(email, password, mode) => authenticate(email, password, mode, "resident")} error={authError} /> : <ResidentPortal user={user} onSignIn={() => setResidentLogin(true)} /> : isOfficer ? <OfficerDashboard user={user} onSignOut={signOut} /> : <UserLogin role="officer" configured={authConfigured} onSubmit={(email, password, mode) => authenticate(email, password, mode, "officer")} error={authError} />}
      </main>
    </div>
  );
}

function WelcomePage({ onResident, onOfficer }) {
  return (
    <section className="welcome-page" aria-labelledby="welcome-title">
      <div className="welcome-orbit welcome-orbit-one" aria-hidden="true" />
      <div className="welcome-orbit welcome-orbit-two" aria-hidden="true" />
      <div className="welcome-content">
        <div className="welcome-badge"><span aria-hidden="true">✦</span> Civic response, reimagined</div>
        <h2 id="welcome-title">Welcome to<br /><span>E-Complaint System</span></h2>
        <p className="welcome-description">Tell us what's wrong — our system routes it to the right department and keeps you updated until it's resolved.</p>
        <div className="welcome-actions">
          <button type="button" className="welcome-primary" onClick={onResident}><span aria-hidden="true">⌂</span> Report an issue</button>
          <button type="button" className="welcome-secondary" onClick={onOfficer}><span aria-hidden="true">▦</span> Department access</button>
        </div>
      </div>
      <div className="welcome-footer"><span>AI-powered civic support</span><span>Secure · Clear · Accountable</span></div>
    </section>
  );
}

