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
};

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
