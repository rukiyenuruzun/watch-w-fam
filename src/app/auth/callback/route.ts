import { NextResponse } from "next/server";
import { getAuthClient, getAuthUser, mergeAnonData } from "@/lib/auth";

// OAuth (Google) dönüş noktası: Supabase'in verdiği tek kullanımlık kodu
// oturum çerezlerine çevirir, anonim tarayıcı verilerini hesaba taşır.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await getAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = await getAuthUser();
      if (user) await mergeAnonData(user);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
