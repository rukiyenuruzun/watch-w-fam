import type { Metadata } from "next";
import { Geist, Geist_Mono, Hanken_Grotesk } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import ScrollMemory from "@/components/ScrollMemory";
import { displayName, getAuthUser } from "@/lib/auth";
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
  // Üst bardaki profil bağlantısında kullanıcının fotoğrafı görünür
  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ??
    (user?.user_metadata?.picture as string | undefined);

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
              <Link href="/" className="flex items-center gap-2 leading-tight">
                {/* 32px'te pano zeminle karışıyordu; 40px'te klaket ve iki
                    figür seçiliyor, "FamTime" yazısıyla da dengeli duruyor */}
                <Image
                  src="/logo.png"
                  alt=""
                  aria-hidden
                  width={40}
                  height={40}
                  priority
                  className="size-10 shrink-0"
                />
                <span className="text-xl font-black tracking-tight">
                  Fam
                  <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
                    Time
                  </span>
                </span>
              </Link>

              <nav className="flex items-center gap-6 text-[13px] font-extrabold uppercase tracking-[0.08em]">
                {/* İzleme listesi hesaba bağlı; girişsiz ziyaretçiye
                    gösterilmiyor. Durum sayfası üst bardan çıkıp ayarların
                    içine taşındı — günlük kullanımda gereken bir şey değil */}
                {user && (
                  <Link
                    href="/listem"
                    className="text-muted transition-colors hover:text-foreground"
                  >
                    {t.watchlist.navTitle}
                  </Link>
                )}
                <Link
                  href="/ayarlar"
                  className="flex items-center gap-1.5 text-muted transition-colors hover:text-foreground"
                >
                  <span aria-hidden>⚙️</span>
                  <span>{t.settings.title}</span>
                </Link>
                {/* Girişliyken yalnızca "Profil"; çıkış menüde değil profil
                    sayfasının içinde (üst bar sade kalsın) */}
                {user ? (
                  <Link
                    href="/profil"
                    className="flex items-center gap-2 text-accent transition-opacity hover:opacity-80"
                  >
                    {/* Profil fotoğrafı; yoksa adın baş harfi. next/image
                        kullanılmıyor çünkü avatar Supabase ya da Google'da
                        durabiliyor, ikisi de remotePatterns'te tanımlı değil */}
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt=""
                        aria-hidden
                        referrerPolicy="no-referrer"
                        className="size-6 shrink-0 rounded-full object-cover ring-1 ring-line"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-bold text-foreground"
                      >
                        {displayName(user).slice(0, 1).toLocaleUpperCase(locale)}
                      </span>
                    )}
                    <span>{t.profile.navTitle}</span>
                  </Link>
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
