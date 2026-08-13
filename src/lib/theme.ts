// Tema sabitleri — istemci bileşenleri de kullandığı için next/headers
// içermez; çerezden okuma theme-server.ts içindedir.
export const THEME_COOKIE = "theme";
export const THEMES = ["dark", "pink"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "dark";
