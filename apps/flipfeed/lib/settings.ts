const STORAGE_KEY = "flipfeed_feed_url";

export function getFeedUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = localStorage.getItem(STORAGE_KEY);
    return url && url.trim() ? url.trim() : null;
  } catch {
    return null;
  }
}

export function setFeedUrl(url: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = url.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function clearFeedUrl(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
