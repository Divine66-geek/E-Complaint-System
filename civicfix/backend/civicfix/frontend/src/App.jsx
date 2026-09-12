import { useEffect, useState } from "react";
import ResidentPortal from "./pages/ResidentPortal.jsx";
import OfficerDashboard from "./pages/OfficerDashboard.jsx";
import UserLogin from "./components/UserLogin.jsx";
import { authConfigured, clearStoredUser, register, registerDepartmentAccount, signIn as firebaseSignIn } from "./auth.js";
import { setAuthUser } from "./api.js";

export default function App() {
  const [view, setView] = useState("resident");
  const [user, setUser] = useState(() => {
    clearStoredUser();
    return null;
  });
  const [authError, setAuthError] = useState("");
  const [residentLogin, setResidentLogin] = useState(true);

  useEffect(() => {
    if (user) setAuthUser(user);
  }, [user]);

  async function authenticate(email, password, mode = "signin", role = view, department) {
    setAuthError("");
    try {
      const nextUser = role === "officer" && mode === "register" ? await registerDepartmentAccount(email, password, department) : mode === "register" ? await register(email, password) : await firebaseSignIn(email, password);
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
      if (role === "officer" && mode === "register") throw error;
    }
  }

  async function registerDepartmentForSetup(email, password, department) {
    const createdUser = await registerDepartmentAccount(email, password, department);
    clearStoredUser();
    setAuthUser(null);
    return createdUser;
  }

  function signOut() {
    clearStoredUser();
    setUser(null);
    setAuthUser(null);
    setView("resident");
  }

  const isOfficer = ["officer", "admin"].includes(user?.role);

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">CF</div>
          <div>
            <h1 className="brand-name">E-Complaint <span>System</span></h1>
            <p className="brand-kicker">A clearer route from complaint to resolution</p>
          </div>
        </div>
        <div className="header-meta">
          <span className="live-dot"><i /> Services online</span>
          {view === "resident" && !user && <button className="header-auth-button" onClick={() => setResidentLogin(true)}>Sign in</button>}
          {user && <><span className="user-session">{user.email} · {isOfficer ? user.role : "resident"}</span><button className="header-auth-button" onClick={signOut}>Sign out</button></>}
          <span className="header-date">Community desk · 2026</span>
        </div>
      </header>

      <nav className="role-switcher" aria-label="Choose workspace">
        <TabButton active={view === "resident"} onClick={() => setView("resident")}>
          <span aria-hidden="true">◌</span> Resident desk
        </TabButton>
        {(!user || isOfficer) && <TabButton active={view === "officer"} onClick={() => setView("officer")}><span aria-hidden="true">▦</span> Operations view</TabButton>}
      </nav>

      <main className="main-content">
        {view === "resident" ? residentLogin ? <UserLogin role="resident" configured={authConfigured} onSubmit={(email, password, mode) => authenticate(email, password, mode, "resident")} error={authError} /> : <ResidentPortal user={user} onSignIn={() => setResidentLogin(true)} /> : isOfficer ? <OfficerDashboard user={user} onSignOut={signOut} /> : <UserLogin role="officer" configured={authConfigured} onSubmit={(email, password, mode, department) => authenticate(email, password, mode, "officer", department)} onDepartmentRegister={registerDepartmentForSetup} error={authError} />}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`role-tab ${active ? "role-tab-active" : ""}${
        active
          ? ""
          : " role-tab-muted"
      }`}
    >
      {children}
    </button>
  );
}
