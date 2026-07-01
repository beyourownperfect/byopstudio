export const toLocalDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const todayISO = () => toLocalDateStr(new Date());

export const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export const fmtDateLong = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
};

export const fmtDateShort = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const isoAdd = (iso, days) => {
  const d = iso ? new Date(iso + "T00:00:00") : new Date();
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
};

export const relDays = (iso) => {
  if (!iso) return null;
  const today = new Date(todayISO() + "T00:00:00");
  const d = new Date(iso + "T00:00:00");
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
};

export const relLabel = (iso) => {
  const n = relDays(iso);
  if (n === null) return "—";
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n > 0) return `in ${n}d`;
  return `${Math.abs(n)}d ago`;
};

export const fmtDuration = (mins) => {
  if (!mins) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

export const startOfWeek = (iso) => {
  const d = iso ? new Date(iso + "T00:00:00") : new Date();
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return toLocalDateStr(d);
};

export const monthStart = (year, month) => `${year}-${String(month + 1).padStart(2, "0")}-01`;
export const monthEnd = (year, month) => {
  const d = new Date(year, month + 1, 0);
  return toLocalDateStr(d);
};

export const debounce = (fn, ms = 250) => {
  let t;
  const f = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  f.cancel = () => clearTimeout(t);
  return f;
};
