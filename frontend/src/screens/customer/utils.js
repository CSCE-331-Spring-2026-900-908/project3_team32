import {
  LANGUAGE_CODE_ALIASES,
  WEEKDAY_FORMATTER,
  GOLD_POINTS_THRESHOLD,
  PLATINUM_POINTS_THRESHOLD,
  DIAMOND_POINTS_THRESHOLD,
} from "./constants";

export function currency(value) {
  const num = Number(value);
  if (isNaN(num)) return "$0.00";
  return `$${num.toFixed(2)}`;
}

export function describeWeatherCode(code) {
  const map = {
    0: "Sunny", 1: "Mostly clear", 2: "Partly cloudy", 3: "Cloudy",
    45: "Foggy", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle",
    55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Light showers",
    81: "Showers", 82: "Heavy showers", 95: "Thunderstorm",
    96: "Thunderstorm & hail", 99: "Heavy hail storm",
  };
  return map[Number(code)] || "Weather unavailable";
}

export function formatWeekdayLabel(dateString) {
  if (!dateString) return "";
  const d = new Date(`${dateString}T12:00:00`);
  return isNaN(d.getTime()) ? "" : WEEKDAY_FORMATTER.format(d);
}

export function pointsFromAmount(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 0;
  return Math.floor(numericAmount) * 10;
}

export function getRewardsStatus(points, isEmployee) {
  if (isEmployee) {
    return { tier: "Employee", discountRate: 0.5, note: "Employee Exclusive - 50% Off", nextTierAt: null };
  }
  if (points >= DIAMOND_POINTS_THRESHOLD) {
    return { tier: "Diamond", discountRate: 0.3, note: "", nextTierAt: null };
  }
  if (points >= PLATINUM_POINTS_THRESHOLD) {
    return { tier: "Platinum", discountRate: 0.2, note: "", nextTierAt: DIAMOND_POINTS_THRESHOLD };
  }
  if (points >= GOLD_POINTS_THRESHOLD) {
    return { tier: "Gold", discountRate: 0.1, note: "", nextTierAt: PLATINUM_POINTS_THRESHOLD };
  }
  return { tier: "Member", discountRate: 0, note: "", nextTierAt: GOLD_POINTS_THRESHOLD };
}

export function buildDisplayLines(item) {
  const lines = [];
  if (item.sugarLevel && item.sugarLevel !== "Regular") lines.push(`Sugar: ${item.sugarLevel}`);
  if (item.iceLevel && item.iceLevel !== "Regular") lines.push(`Ice: ${item.iceLevel}`);
  if (item.toppingNames?.length) lines.push(`Toppings: ${item.toppingNames.join(", ")}`);
  if (item.comments) lines.push(`Note: ${item.comments}`);
  return lines;
}

export function toNativeLanguageName(languageCode, fallback) {
  if (!languageCode) return fallback;
  const [baseCode] = languageCode.split("-");
  const normalizedBaseCode = LANGUAGE_CODE_ALIASES[baseCode] || baseCode;
  const normalizedLocale = languageCode.replace(baseCode, normalizedBaseCode);
  try {
    const displayNames = new Intl.DisplayNames([normalizedLocale], { type: "language" });
    return displayNames.of(normalizedBaseCode) || fallback;
  } catch {
    return fallback;
  }
}
