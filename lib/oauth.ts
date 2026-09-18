export type YoutubeOauth = {
  access_token: string;
  refresh_token: string;
  expiry_date: string;
  client?: { client_id: string; client_secret: string };
};

/** Accepts full youtube:login JSON, a JSON string, or a bare access/refresh token. */
export function parseOauth(raw?: string): YoutubeOauth | undefined {
  if (!raw?.trim()) return undefined;
  let s = raw.trim();
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    s = s.slice(1, -1);
  }

  let t: Partial<YoutubeOauth> & { refreshToken?: string; accessToken?: string } = {};
  if (s.startsWith("{")) {
    try {
      let parsed: unknown = JSON.parse(s);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      if (!parsed || typeof parsed !== "object") return undefined;
      t = parsed as typeof t;
    } catch {
      return undefined;
    }
  } else if (s.startsWith("1/")) {
    t = { refresh_token: s };
  } else if (s.startsWith("ya29.")) {
    t = { access_token: s };
  } else {
    return undefined;
  }

  const access_token = t.access_token || t.accessToken;
  const refresh_token = t.refresh_token || t.refreshToken;
  if (!access_token && !refresh_token) return undefined;

  return {
    access_token: access_token || "_",
    refresh_token: refresh_token || "_",
    expiry_date: t.expiry_date || (refresh_token && !access_token
      ? new Date(0).toISOString()
      : new Date(Date.now() + 55 * 60 * 1000).toISOString()),
    ...(t.client ? { client: t.client } : {}),
  };
}
