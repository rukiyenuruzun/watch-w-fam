import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getAuthUser } from "@/lib/auth";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export default async function LoginPage() {
  // Zaten girişliyse formun anlamı yok
  if (await getAuthUser()) redirect("/");

  const locale = await getLocale();
  const t = DICTIONARIES[locale].auth;

  return (
    <div className="mx-auto w-full max-w-sm space-y-5 pt-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-xs leading-relaxed text-muted">{t.note}</p>
      </div>
      <div className="rounded-md border border-line bg-surface p-5">
        <LoginForm t={t} />
      </div>
    </div>
  );
}
