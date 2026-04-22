export const API_BASE = import.meta.env.VITE_API_URL || "/api";
export const GOOGLE_TRANSLATE_SCRIPT_ID = "google-translate-script";
export const TAX_RATE = 0.0825;
export const GOLD_POINTS_THRESHOLD = 1000;
export const PLATINUM_POINTS_THRESHOLD = GOLD_POINTS_THRESHOLD + 2500;
export const DIAMOND_POINTS_THRESHOLD = PLATINUM_POINTS_THRESHOLD + 5000;
export const REWARDS_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;
export const LANGUAGE_CODE_ALIASES = { iw: "he", jw: "jv" };
export const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "short" });
export const TOP_TRANSLATE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "zh-CN", label: "简体中文" },
  { code: "hi", label: "हिन्दी" },
  { code: "ar", label: "العربية" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "it", label: "Italiano" },
  { code: "tr", label: "Türkçe" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "tl", label: "Filipino" },
];

export const SCREEN = {
  MENU: "MENU",
  CUSTOMIZE: "CUSTOMIZE",
  CART: "CART",
  CHECKOUT: "CHECKOUT",
};
