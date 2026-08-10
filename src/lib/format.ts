// 2532 -> "00:42:12" biçiminde film zamanı
export function formatTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

// "12:30" / "1:02:30" / "754" -> saniye; geçersizse null
export function parseTimestamp(input: string): number | null {
  const parts = input.trim().split(":");
  if (parts.length === 0 || parts.length > 3) return null;
  if (parts.some((p) => p === "" || !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  // Tek sayı doğrudan saniyedir; 2 parça dk:sn, 3 parça sa:dk:sn
  const [h, m, s] =
    nums.length === 3 ? nums : nums.length === 2 ? [0, ...nums] : [0, 0, nums[0]];
  if (m >= 60 || s >= 60) return null;
  return h * 3600 + m * 60 + s;
}
