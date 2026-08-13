import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { COMMENTER_COOKIE } from "./comments";
import { getSupabase } from "./supabase";

// Sunucu tarafında oturum okuma/yazma. anon anahtar kullanılır; kullanıcı
// kimliği çerezdeki oturumdan gelir. Veri erişimi yine service_role ile
// (lib/supabase.ts) yapılır — burası yalnızca "kim bu?" sorusuna bakar.

export async function getAuthClient(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              store.set(name, value, options);
            }
          } catch {
            // Server Component bağlamında çerez yazılamaz; oturum tazelemeyi
            // proxy.ts üstlenir, burada sessizce geçilir.
          }
        },
      },
    }
  );
}

export async function getAuthUser(): Promise<User | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const supabase = await getAuthClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

// Görünen ad: kullanıcının kendi seçtiği ad (profilden), yoksa Google'dan
// gelen isim, yoksa e-postanın @ öncesi
export function displayName(user: User): string {
  return (
    (user.user_metadata?.display_name as string) ||
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    "Üye"
  );
}

// Kimlik: girişliyse kullanıcı kimliği, değilse anonim tarayıcı çerezi.
// Yorum sahipliği ve izleme listesi bu tek değere bağlanır.
export async function getIdentity(): Promise<{
  token: string | undefined;
  user: User | null;
}> {
  const user = await getAuthUser();
  if (user) return { token: user.id, user };
  const anon = (await cookies()).get(COMMENTER_COOKIE)?.value;
  return { token: anon, user: null };
}

// İlk girişte tarayıcının anonim verilerini (yorum sahipliği + izleme
// listesi) hesaba taşı; anonim çerez temizlenir, hiçbir veri kaybolmaz.
export async function mergeAnonData(user: User): Promise<void> {
  const store = await cookies();
  const anon = store.get(COMMENTER_COOKIE)?.value;
  if (!anon || anon === user.id) return;
  const sb = getSupabase();

  await sb.from("comments").update({ owner_token: user.id }).eq("owner_token", anon);

  const { data: rows } = await sb
    .from("watchlists")
    .select("tmdb_id, added_at")
    .eq("token", anon);
  if (rows && rows.length > 0) {
    await sb.from("watchlists").upsert(
      rows.map((r) => ({ token: user.id, tmdb_id: r.tmdb_id, added_at: r.added_at })),
      { onConflict: "token,tmdb_id", ignoreDuplicates: true }
    );
    await sb.from("watchlists").delete().eq("token", anon);
  }

  // Hassasiyet profili: hesapta yoksa anonim profil taşınır, varsa hesabınki kalır
  const { data: prof } = await sb
    .from("sensitivity_profiles")
    .select("weights")
    .eq("token", anon)
    .maybeSingle();
  if (prof) {
    await sb.from("sensitivity_profiles").upsert(
      { token: user.id, weights: prof.weights },
      { onConflict: "token", ignoreDuplicates: true }
    );
    await sb.from("sensitivity_profiles").delete().eq("token", anon);
  }

  try {
    store.delete(COMMENTER_COOKIE);
  } catch {
    // Route Handler dışında silinemezse sorun değil; kimlik zaten kullanıcıda
  }
}
