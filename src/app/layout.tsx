import type { Metadata } from "next";
import { Geist, Geist_Mono, Hanken_Grotesk } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/app/actions";
import ScrollMemory from "@/components/ScrollMemory";
import SettingsMenu from "@/components/SettingsMenu";
import { getAuthUser } from "@/lib/auth";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme-server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Başlık çubuğu için grotesk font (Letterboxd havası); Türkçe karakterler
// için latin-ext şart
const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "FamTime — what to watch with family",
  description:
    "Filmlerin öpüşme, cinsel içerik, ima ve küfür gibi hassas sahnelerini zaman damgalarıyla önceden görün.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const [user, theme] = await Promise.all([getAuthUser(), getTheme()]);

  return (
    <html
      lang={locale}
      data-theme={theme}
      // Next 16: bu öznitelik olmadan smooth scroll sayfa geçişlerinde de
      // animasyonlu kayıyor ve yeni sayfa "yarı inmiş" açılabiliyor; bununla
      // geçişler anında en üstten başlar, sayfa içi çapalar yumuşak kalır
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* useSearchParams içerdiği için Suspense sınırı gerekir */}
        <Suspense fallback={null}>
          <ScrollMemory />
        </Suspense>
        <header className="sticky top-0 z-40">
          {/* Keskin çizgi yerine alta doğru eriyen buzlu karartma: hem blur
              hem karartma aynı gradyan maskesiyle şeffaflaşarak biter */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -bottom-8 top-0 bg-gradient-to-b from-background/95 via-background/60 to-transparent backdrop-blur-md [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
          />
          {/* Letterboxd düzeni: logo + menü ortada; taslak rozeti sol,
              ayarlar dişlisi sağ köşede. Parlak backdrop'lar üzerinde
              okunurluk için hafif metin gölgesi */}
          <div
            className={`relative flex w-full items-center justify-center px-4 py-4 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)] sm:px-6 lg:px-10 ${hankenGrotesk.className}`}
          >
            <span className="absolute left-4 hidden text-[11px] font-semibold uppercase tracking-widest text-muted/60 sm:left-6 sm:inline lg:left-10">
              {t.draftBadge}
            </span>

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
              <Link href="/" className="flex flex-col items-center leading-tight">
                <span className="text-xl font-black tracking-tight">
                  <span aria-hidden className="mr-1.5">🎬</span>
                  Fam
                  <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
                    Time
                  </span>
                </span>
                {/* Slogan iki dilde de aynı (marka) */}
                <span className="text-[10px] font-semibold lowercase tracking-[0.18em] text-muted">
                  what to watch with family
                </span>
              </Link>

              <nav className="flex items-center gap-6 text-[13px] font-extrabold uppercase tracking-[0.08em]">
                {/* Girişlide liste profilden ulaşılır; bu kısayol anonim ziyaretçi için */}
                {!user && (
                  <Link
                    href="/listem"
                    className="text-muted transition-colors hover:text-foreground"
                  >
                    {t.watchlist.navTitle}
                  </Link>
                )}
                <Link
                  href="/durum"
                  className="text-muted transition-colors hover:text-foreground"
                >
                  {t.statusPage.navTitle}
                </Link>
                {user ? (
                  <>
                    <Link
                      href="/profil"
                      className="flex items-center gap-1.5 text-accent transition-opacity hover:opacity-80"
                    >
                      <span aria-hidden>👤</span>
                      <span>{t.profile.navTitle}</span>
                    </Link>
                    <form action={signOutAction}>
                      <button
                        type="submit"
                        className="cursor-pointer font-extrabold uppercase tracking-[0.08em] text-muted transition-colors hover:text-foreground"
                      >
                        {t.auth.signOut}
                      </button>
                    </form>
                  </>
                ) : (
                  <Link
                    href="/giris"
                    className="text-muted transition-colors hover:text-foreground"
                  >
                    {t.auth.navSignIn}
                  </Link>
                )}
              </nav>
            </div>

            <div className="absolute right-4 sm:right-6 lg:right-10">
              <SettingsMenu
                current={locale}
                title={t.settings.title}
                languageLabel={t.settings.language}
                theme={theme}
                themeLabel={t.settings.theme}
                themeNames={t.settings.themes}
              />
            </div>
          </div>
        </header>
        <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
        <footer className="border-t border-line py-6 text-center text-xs text-muted">
          {t.footer}
        </footer>
      </body>
    </html>
  );
}
