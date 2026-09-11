export function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export const PRIORITY_CLASSES = {
  Urgent: "bg-urgent-tint text-urgent",
  High: "bg-high-tint text-high",
  Medium: "bg-medium-tint text-medium",
  Low: "bg-low-tint text-low",
};

export const PRIORITY_BAR = {
  Urgent: "bg-urgent",
  High: "bg-high",
  Medium: "bg-medium",
  Low: "bg-low",
};

export const STATUS_LABELS = {
  assigned: "Assigned",
  linked: "Linked to existing report",
  investigating: "Investigating",
  resolved: "Waiting on resident",
  closed: "Confirmed fixed",
  reopened: "Reopened",
};

const MY_KEY = "civicfix:my-tracking-ids";

export function getMyTrackingIds() {
  try {
    return JSON.parse(localStorage.getItem(MY_KEY)) || [];
  } catch {
    return [];
  }
}

export function addMyTrackingId(id) {
  const list = getMyTrackingIds();
  list.push(id);
  localStorage.setItem(MY_KEY, JSON.stringify(list));
}
