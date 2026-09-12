const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
export const authConfigured = Boolean(apiKey);
const AUTH_ENDPOINT = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey || "missing"}`;
const REGISTER_ENDPOINT = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey || "missing"}`;
const SESSION_KEY = "civicfix:auth-session";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const REFRESH_ENDPOINT = `https://securetoken.googleapis.com/v1/token?key=${apiKey || "missing"}`;

function readClaims(idToken) {
  try {
    const payload = JSON.parse(atob(idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return { role: payload.role || "resident", department: payload.department || null };
  } catch {
    return { role: "resident", department: null };
  }
}

async function authenticate(endpoint, email, password) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error?.message || "Unable to authenticate");
    error.code = body.error?.message || "AUTH_FAILED";
    throw error;
  }
  const data = await response.json();
  const refreshed = await refreshSession(data.idToken, data.refreshToken);
  const claims = readClaims(refreshed.idToken);
  const user = { email: data.email, idToken: refreshed.idToken, refreshToken: refreshed.refreshToken, ...claims, getIdToken: async () => refreshed.idToken };
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email, idToken: user.idToken, refreshToken: user.refreshToken, role: user.role, department: user.department }));
  return user;
}

async function refreshSession(idToken, refreshToken) {
  const response = await fetch(REFRESH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!response.ok) {
    return { idToken, refreshToken };
  }
  const data = await response.json();
  return { idToken: data.id_token, refreshToken: data.refresh_token || refreshToken };
}

export function signIn(email, password) {
  return authenticate(AUTH_ENDPOINT, email, password);
}

export function register(email, password) {
  return authenticate(REGISTER_ENDPOINT, email, password);
}

export async function registerDepartmentAccount(email, password, department) {
  const user = await authenticate(REGISTER_ENDPOINT, email, password);
  const response = await fetch(`${API_URL}/auth/department-registration`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user.idToken}`,
    },
    body: JSON.stringify({ department }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error || "Department registration failed");
    error.code = body.error || "DEPARTMENT_REGISTRATION_FAILED";
    throw error;
  }

  const refreshed = await refreshSession(user.idToken, user.refreshToken);
  const claims = readClaims(refreshed.idToken);
  const officer = { ...user, idToken: refreshed.idToken, refreshToken: refreshed.refreshToken, ...claims, getIdToken: async () => refreshed.idToken };
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email: officer.email, idToken: officer.idToken, refreshToken: officer.refreshToken, role: officer.role, department: officer.department }));
  return officer;
}

export function getStoredUser() {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (!stored?.idToken) return null;
    return { ...stored, getIdToken: async () => stored.idToken };
  } catch {
    return null;
  }
}

export function clearStoredUser() {
  localStorage.removeItem(SESSION_KEY);
}
