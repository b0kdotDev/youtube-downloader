function num(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  /** Info + download requests per IP per window. */
  rateLimitPerWindow: num("RATE_LIMIT_PER_WINDOW", 20),
  rateLimitWindowMs: num("RATE_LIMIT_WINDOW_MS", 60_000),
  /** Abort player/info fetch if YouTube hangs (signature scrape + player JSON). */
  ytdlTimeoutMs: num("YTDL_TIMEOUT_MS", 20_000),
  /** Cookie header from a logged-in youtube.com tab. Datacenter IPs (Vercel) need this. */
  youtubeCookie: process.env.YOUTUBE_COOKIE?.trim() || undefined,
  youtubePoToken: process.env.YOUTUBE_PO_TOKEN?.trim() || undefined,
  youtubeVisitorData: process.env.YOUTUBE_VISITOR_DATA?.trim() || undefined,
  youtubeOauth: parseOauth(process.env.YOUTUBE_OAUTH),
};

export type YoutubeOauth = {
  access_token: string;
  refresh_token: string;
  expiry_date: string;
  client?: { client_id: string; client_secret: string };
};

function parseOauth(raw?: string): YoutubeOauth | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const t = JSON.parse(raw) as Partial<YoutubeOauth>;
    if (t.access_token && t.refresh_token && t.expiry_date) {
      return t as YoutubeOauth;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/** ponytail: in-memory Map, Redis if you run more than one Node process. */
const hits = new Map<string, number[]>();

export function allowRequest(ip: string): boolean {
  const now = Date.now();
  const windowMs = config.rateLimitWindowMs;
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= config.rateLimitPerWindow) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}
