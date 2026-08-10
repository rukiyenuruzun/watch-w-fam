"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mergeAnonDataAction } from "@/app/actions";
import { getBrowserSupabase } from "@/lib/supabase-browser";

interface Labels {
  emailLabel: string;
  passwordLabel: string;
  signInButton: string;
  signUpButton: string;
  google: string;
  or: string;
  toggleToSignUp: string;
  toggleToSignIn: string;
  checkEmail: string;
  sending: string;
}

const inputCls =
  "w-full rounded-md border border-line bg-surface-2 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/25";

export default function LoginForm({ t }: { t: Labels }) {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const google = async () => {
    setError(null);
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = getBrowserSupabase();
    const { data, error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (!data.session) {
      // E-posta doğrulaması açıksa kayıt sonrası oturum dönmez
      setInfo(t.checkEmail);
      return;
    }
    // Anonim tarayıcı verilerini hesaba taşı, ana sayfaya dön
    await mergeAnonDataAction();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={google}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-semibold transition hover:border-accent hover:text-accent active:scale-[0.99]"
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.2-2 3.7-5 3.7-8.6z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.1 0-5.8-2.1-6.7-5l-3.9 3C3.4 21.3 7.4 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.3 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-3.9-3C.5 8.2 0 10 0 12s.5 3.8 1.4 5.4l3.9-3z"
          />
          <path
            fill="#EA4335"
            d="M12 4.7c2.2 0 3.7.9 4.5 1.7l3.3-3.2C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.6l3.9 3c.9-2.8 3.6-4.9 6.7-4.9z"
          />
        </svg>
        {t.google}
      </button>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        {t.or}
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs text-muted">{t.emailLabel}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">{t.passwordLabel}</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
          />
        </label>

        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-bold text-black transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
        >
          {busy ? t.sending : mode === "in" ? t.signInButton : t.signUpButton}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "in" ? "up" : "in");
          setError(null);
          setInfo(null);
        }}
        className="w-full text-center text-xs text-muted underline transition-colors hover:text-accent"
      >
        {mode === "in" ? t.toggleToSignUp : t.toggleToSignIn}
      </button>
    </div>
  );
}
