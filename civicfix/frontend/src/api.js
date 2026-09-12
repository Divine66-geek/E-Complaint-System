import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

let authUser = null;
export function setAuthUser(user) {
  authUser = user;
}

client.interceptors.request.use(async (config) => {
  if (authUser) {
    const token = await authUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  submitComplaint: (text, area, language, coordinates, image) =>
    client.post("/complaints", {
      text,
      area,
      language,
      coordinates,
      image: image ? { name: image.name, type: image.type, dataUrl: image.dataUrl } : null,
    }).then((r) => r.data),
  analyzeImage: (image, description = "") =>
    client.post("/complaints/analyze-image", {
      image: image ? { name: image.name, type: image.type, dataUrl: image.dataUrl } : null,
      description,
    }).then((r) => r.data),
  listMyComplaints: () => client.get("/complaints/mine").then((r) => r.data),
  listComplaints: () => client.get("/complaints").then((r) => r.data),
  getComplaint: (id) => client.get(`/complaints/${id}`).then((r) => r.data),
  updateStatus: (id, status) =>
    client.patch(`/complaints/${id}/status`, { status }).then((r) => r.data),
  confirmResolution: (id, confirmed) =>
    client.patch(`/complaints/${id}/confirm`, { confirmed }).then((r) => r.data),
  analyticsSummary: () => client.get("/analytics/summary").then((r) => r.data),
};
