import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/app/actions";
import LocaleSwitch from "@/components/LocaleSwitch";
import ScrollMemory from "@/components/ScrollMemory";
import { displayName, getAuthUser } from "@/lib/auth";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "watch w/fam",
  description:
    "Filmlerin öpüşme, cinsel içerik, ima ve küfür gibi hassas sahnelerini zaman damgalarıyla önceden görün.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const user = await getAuthUser();

  return (
    <html
      lang={locale}
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
          {/* Parlak backdrop'lar üzerinde okunurluk için hafif metin gölgesi */}
          <div className="relative flex w-full items-center justify-between gap-4 px-4 py-4 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)] sm:px-6 lg:px-10">
            <Link href="/" className="text-lg font-bold tracking-tight">
              <span aria-hidden className="mr-1.5">🎬</span>
              {locale === "tr" ? (
                <>
                  Aileyle Ne{" "}
                  <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
                    İzlenir?
                  </span>
                </>
              ) : (
                <>
                  What to Watch{" "}
                  <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
                    with Family?
                  </span>
                </>
              )}
            </Link>
            <div className="flex items-center gap-3">
              {/* Girişlide liste profilden ulaşılır; bu kısayol anonim ziyaretçi için */}
              {!user && (
                <Link
                  href="/listem"
                  className="text-xs font-semibold text-muted transition-colors hover:text-accent"
                >
                  {t.watchlist.navTitle}
                </Link>
              )}
              <Link
                href="/durum"
                className="text-xs font-semibold text-muted transition-colors hover:text-accent"
              >
                {t.statusPage.navTitle}
              </Link>
              <span className="hidden text-xs text-muted sm:inline">
                {t.draftBadge}
              </span>
              {user ? (
                <span className="flex items-center gap-2 text-xs">
                  <Link
                    href="/profil"
                    className="flex items-center gap-1.5 rounded-md border border-line bg-surface/60 px-3 py-1.5 font-semibold transition hover:border-accent"
                  >
                    <span aria-hidden>👤</span>
                    <span className="max-w-28 truncate text-accent">
                      {displayName(user)}
                    </span>
                  </Link>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="text-muted underline transition-colors hover:text-accent"
                    >
                      {t.auth.signOut}
                    </button>
                  </form>
                </span>
              ) : (
                <Link
                  href="/giris"
                  className="rounded-md border border-line bg-surface/60 px-3 py-1.5 text-xs font-semibold transition hover:border-accent hover:text-accent"
                >
                  {t.auth.navSignIn}
                </Link>
              )}
              <LocaleSwitch current={locale} />
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
