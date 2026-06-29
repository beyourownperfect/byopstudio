import axios from "axios";

// When REACT_APP_BACKEND_URL is set (local dev, separate deploys), use it.
// When absent (Render single-service deployment or unset), default to same-origin "".
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

const c = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

export const metaApi = {
  get: () => c.get("/meta").then((r) => r.data),
};

export const settingsApi = {
  get: () => c.get("/settings").then((r) => r.data),
  update: (data) => c.put("/settings", data).then((r) => r.data),
};

export const questionsApi = {
  list: (params = {}) => c.get("/questions", { params }).then((r) => r.data),
  get: (id) => c.get(`/questions/${id}`).then((r) => r.data),
  create: (data) => c.post("/questions", data).then((r) => r.data),
  update: (id, data) => c.put(`/questions/${id}`, data).then((r) => r.data),
  remove: (id) => c.delete(`/questions/${id}`).then((r) => r.data),
  bulkDelete: (ids) =>
    c.post("/questions/bulk-delete", { ids }).then((r) => r.data),
  bulkCreate: (rows) =>
    c.post("/questions/bulk-create", { rows }).then((r) => r.data),
};

export const practiceApi = {
  next: (params) => c.get("/practice/next", { params }).then((r) => r.data),
  submit: (data) => c.post("/practice/submit", data).then((r) => r.data),
};

export const srsApi = {
  due: () => c.get("/srs/due").then((r) => r.data),
};

export const logsApi = {
  list: (params = {}) => c.get("/study-logs", { params }).then((r) => r.data),
  create: (data) => c.post("/study-logs", data).then((r) => r.data),
  remove: (id) => c.delete(`/study-logs/${id}`).then((r) => r.data),
};

export const timelineApi = {
  list: (params = {}) => c.get("/timeline", { params }).then((r) => r.data),
  get: (id) => c.get(`/timeline/${id}`).then((r) => r.data),
  create: (data) => c.post("/timeline", data).then((r) => r.data),
  update: (id, data) => c.put(`/timeline/${id}`, data).then((r) => r.data),
  remove: (id) => c.delete(`/timeline/${id}`).then((r) => r.data),
  scheduleRevision: (id, data) =>
    c.post(`/timeline/${id}/schedule-revision`, data).then((r) => r.data),
  completeRevision: (id, data) =>
    c.post(`/timeline/${id}/complete-revision`, data).then((r) => r.data),
};

export const revisitsApi = {
  list: (params = {}) => c.get("/revisits", { params }).then((r) => r.data),
  create: (data) => c.post("/revisits", data).then((r) => r.data),
  complete: (id) => c.post(`/revisits/${id}/complete`).then((r) => r.data),
  remove: (id) => c.delete(`/revisits/${id}`).then((r) => r.data),
};

export const calendarApi = {
  range: (start, end) =>
    c.get("/calendar", { params: { start, end } }).then((r) => r.data),
};

export const pulseApi = {
  get: () => c.get("/pulse").then((r) => r.data),
};

export const mistakesApi = {
  get: (mode) => c.get("/mistakes", { params: { mode } }).then((r) => r.data),
};

export const userMissionsApi = {
  list: () => c.get("/user-missions").then((r) => r.data),
  create: (data) => c.post("/user-missions", data).then((r) => r.data),
  update: (id, data) => c.put(`/user-missions/${id}`, data).then((r) => r.data),
  remove: (id) => c.delete(`/user-missions/${id}`).then((r) => r.data),
  reorder: (ids) =>
    c.post("/user-missions/reorder", { ids }).then((r) => r.data),
};

export const seed = () => c.post("/seed-demo").then((r) => r.data);
