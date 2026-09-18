const ID = /^[\w-]{11}$/;

const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
]);

/** Only watch URLs / shorts / embed / youtu.be — never fetch an arbitrary host (SSRF). */
export function parseYouTubeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 500) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (!HOSTS.has(host)) return null;

  let id: string | null = null;
  if (host === "youtu.be" || host === "www.youtu.be") {
    id = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else {
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.searchParams.get("v")) id = url.searchParams.get("v");
    else if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") {
      id = parts[1] ?? null;
    }
  }

  if (!id || !ID.test(id)) return null;
  return id;
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
