import Link from "next/link";
import LocaleSwitch from "@/components/LocaleSwitch";
import SensitivityEditor from "@/components/SensitivityEditor";
import ThemeSwitch from "@/components/ThemeSwitch";
import { getIdentity } from "@/lib/auth";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getSensitivity } from "@/lib/sensitivity";
import { getTheme } from "@/lib/theme-server";

// Ayarlar artık üst bardaki açılır kutu değil, kendi sayfası. Hassasiyet
// profili de buraya taşındı: profil sayfası herkese açık olacağı için
// "neye ne kadar duyarlıyım" bilgisi orada durmamalı — bu kişiye özel.
export default async function SettingsPage() {
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const p = t.profile;
  const [theme, { token }] = await Promise.all([getTheme(), getIdentity()]);
  const personal = await getSensitivity(token);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold">{t.settings.title}</h1>

      <section className="space-y-3 rounded-md border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {t.settings.language}
        </h2>
        <LocaleSwitch current={locale} />
      </section>

      <section className="space-y-3 rounded-md border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {t.settings.theme}
        </h2>
        <ThemeSwitch current={theme} labels={t.settings.themes} />
      </section>

      {/* Durum sayfası buradan açılır ama İÇERİĞİ burada gösterilmez:
          ayarlar sayfası kısa kalsın, kuyruk/kota kendi sayfasında dursun */}
      <section>
        <Link
          href="/durum"
          className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface p-5 transition hover:border-accent"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold">
              {t.statusPage.navTitle}
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              {t.settings.statusNote}
            </span>
          </span>
          <span aria-hidden className="shrink-0 text-lg text-muted">
            ›
          </span>
        </Link>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
          {p.sensitivityTitle}
        </h2>
        <p className="mb-3 text-xs leading-relaxed text-muted">
          {p.sensitivityNote} {t.settings.sensitivityPrivate}
        </p>
        <SensitivityEditor
          weights={personal}
          categoryLabels={t.categories}
          levelLabels={p.sensitivityLevels}
        />
      </section>
    </div>
  );
}
