import type { User } from "@supabase/supabase-js";
import { displayName } from "./auth";
import { getSupabase } from "./supabase";

// Kullanıcı bilgisi auth.users'ta durur ve oraya yalnızca service_role
// erişebilir. Başkasının adını/fotoğrafını gösterebilmek için küçük bir
// ayna tablo tutuyoruz; her girişte ve profil güncellemesinde tazelenir.
export interface PublicProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

function toProfile(row: {
  id: string;
  display_name: string;
  avatar_url: string | null;
}): PublicProfile {
  return {
    id: row.id,
    displayName: row.display_name || "Anonim",
    avatarUrl: row.avatar_url,
  };
}

export function avatarOf(user: User): string | null {
  return (
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null
  );
}

// Girişte ve profil düzenlemede çağrılır; ayna tabloyu güncel tutar
export async function syncProfile(user: User): Promise<void> {
  const { error } = await getSupabase().from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName(user),
      avatar_url: avatarOf(user),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  // Tablo yoksa sessizce geç: arkadaşlık özelliği kurulmamış demektir
  if (error && !/does not exist|schema cache/i.test(error.message)) {
    throw new Error(`Profil eşitlenemedi: ${error.message}`);
  }
}

export async function getProfile(id: string): Promise<PublicProfile | null> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return toProfile(data);
}

// Liste ekranları için toplu okuma (kişi başına ayrı sorgu atmamak adına)
export async function getProfiles(
  ids: string[]
): Promise<Map<string, PublicProfile>> {
  const map = new Map<string, PublicProfile>();
  if (ids.length === 0) return map;
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", ids);
  if (error || !data) return map;
  for (const row of data) map.set(row.id, toProfile(row));
  return map;
}
