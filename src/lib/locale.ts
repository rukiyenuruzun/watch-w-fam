import { cookies } from "next/headers";
import { DEFAULT_LOCALE, type Locale } from "./i18n";

export const LOCALE_COOKIE = "locale";

// Yalnızca sunucu bileşenlerinden çağrılır (next/headers içerdiği için).
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return value === "en" || value === "tr" ? value : DEFAULT_LOCALE;
}
