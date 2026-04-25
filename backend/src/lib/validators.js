export function parseDateInput(value) {
  if (!value || typeof value !== "string") return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return value;
}

export function normalizeEmployeePin(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized;
}

export function isValidEmployeePin(pin) {
  return /^\d{4}$/.test(pin);
}
