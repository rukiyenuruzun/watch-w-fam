import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Tarayıcı tarafı Supabase istemcisi (yalnızca giriş/kayıt akışı için).
// anon anahtar kullanır; RLS açık olduğundan verilere erişemez, sadece
// kimlik doğrulama uçlarıyla konuşur. Oturum çerezlere yazılır.
let client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
