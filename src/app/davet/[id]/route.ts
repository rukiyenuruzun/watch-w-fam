import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { requestFriendship } from "@/lib/friends";

// Davet linki: /davet/<kullanıcı-kimliği>
// Girişsizse önce giriş sayfasına, sonra buraya döner. Girişliyse istek
// oluşturulup karşı tarafın profiline yönlendirilir — kabul adımı orada
// duruyor, çünkü link başkasına iletilmiş olabilir.
export async function GET(
  _request: Request,
  { params }: RouteContext<"/davet/[id]">
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) redirect(`/giris?donus=${encodeURIComponent(`/davet/${id}`)}`);
  if (user.id === id) redirect("/profil");

  await requestFriendship(user.id, id);
  redirect(`/kisi/${id}`);
}
