import { cookies } from "next/headers";
import { DEFAULT_THEME, THEME_COOKIE, THEMES, type Theme } from "./theme";

// Yalnızca sunucu bileşenlerinden çağrılır (next/headers içerdiği için).
// SSR'da <html data-theme> olarak basılır, böylece yanlış temayla
// "yanıp sönme" olmaz.
export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return THEMES.includes(value as Theme) ? (value as Theme) : DEFAULT_THEME;
}
