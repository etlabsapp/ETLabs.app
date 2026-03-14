import type { FeedRow } from "./normalize";

export type { FeedRow };

/**
 * Fetch feed from a custom URL (from settings) or from the built-in API.
 * @param baseUrl - Origin for relative /api/feed (e.g. "" in browser)
 * @param feedUrl - Optional full URL from settings; if set, fetch from this URL instead
 */
export async function fetchFeed(
  baseUrl: string = "",
  feedUrl: string | null = null
): Promise<FeedRow[]> {
  const url = feedUrl && feedUrl.trim() ? feedUrl.trim() : `${baseUrl}/api/feed`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) throw new Error("Failed to fetch feed");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
