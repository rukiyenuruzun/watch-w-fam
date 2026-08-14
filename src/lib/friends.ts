import { getSupabase } from "./supabase";

// Arkadaşlık tek satırda iki yönü birden tutar: (requester, addressee).
// "Arkadaşlarım" = status 'accepted' olan ve iki taraftan biri ben olan
// satırlar. Böylece çift kayıt tutmuyoruz.
// Tablolar henüz kurulmamışsa (schema.sql çalıştırılmadıysa) özellik
// sessizce devre dışı kalsın; site çalışmaya devam etsin.
export type FriendStatus =
  | "none" // aralarında kayıt yok
  | "friends" // kabul edilmiş
  | "outgoing" // ben istek gönderdim, bekliyor
  | "incoming"; // bana istek geldi, bekliyor

export async function getFriendIds(userId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error || !data) return [];
  return data.map((r) =>
    r.requester_id === userId ? r.addressee_id : r.requester_id
  );
}

// Bana gelen, henüz yanıtlamadığım istekler
export async function getIncomingRequests(userId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from("friendships")
    .select("requester_id")
    .eq("addressee_id", userId)
    .eq("status", "pending");
  if (error || !data) return [];
  return data.map((r) => r.requester_id);
}

export async function getFriendStatus(
  userId: string,
  otherId: string
): Promise<FriendStatus> {
  if (userId === otherId) return "none";
  const { data, error } = await getSupabase()
    .from("friendships")
    .select("requester_id, status")
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${otherId}),` +
        `and(requester_id.eq.${otherId},addressee_id.eq.${userId})`
    )
    .maybeSingle();
  if (error || !data) return "none";
  if (data.status === "accepted") return "friends";
  return data.requester_id === userId ? "outgoing" : "incoming";
}

// Davet linkine tıklandığında çağrılır. Karşı taraf zaten bana istek
// göndermişse doğrudan arkadaş oluruz (iki taraf da niyetini belli etti).
export async function requestFriendship(
  requesterId: string,
  addresseeId: string
): Promise<FriendStatus> {
  if (requesterId === addresseeId) return "none";
  const sb = getSupabase();
  const current = await getFriendStatus(requesterId, addresseeId);
  if (current === "friends" || current === "outgoing") return current;

  if (current === "incoming") {
    // Karşılıklı istek: kabul et
    await acceptFriendship(addresseeId, requesterId);
    return "friends";
  }

  const { error } = await sb
    .from("friendships")
    .insert({ requester_id: requesterId, addressee_id: addresseeId });
  if (error) throw new Error(`İstek gönderilemedi: ${error.message}`);
  return "outgoing";
}

// userId, requesterId'nin gönderdiği isteği kabul eder
export async function acceptFriendship(
  userId: string,
  requesterId: string
): Promise<void> {
  const { error } = await getSupabase()
    .from("friendships")
    .update({ status: "accepted" })
    .eq("requester_id", requesterId)
    .eq("addressee_id", userId)
    .eq("status", "pending");
  if (error) throw new Error(`İstek kabul edilemedi: ${error.message}`);
}

// Hem isteği reddetmek hem arkadaşlığı bitirmek için (yön fark etmez)
export async function removeFriendship(
  userId: string,
  otherId: string
): Promise<void> {
  const { error } = await getSupabase()
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${otherId}),` +
        `and(requester_id.eq.${otherId},addressee_id.eq.${userId})`
    );
  if (error) throw new Error(`Arkadaşlık silinemedi: ${error.message}`);
}
