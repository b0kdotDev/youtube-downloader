import { spawn } from "node:child_process";
import path from "node:path";
import { Readable } from "node:stream";
import { Innertube } from "youtubei.js";
import { config } from "./config";
import { pickFormats } from "./formats";
import { isAgeGate, isBotWall } from "./playability";
import type { VideoFormatOption, VideoMetadata } from "./types";

export class YoutubeError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * WEB player `n`/`s` decipher is broken in ytdl-core. InnerTube iOS client
 * gives googlevideo URLs already signed. Adaptive itags are video-only — we
 * mux with AAC via ffmpeg (`-c copy`) so downloads actually have sound.
 */
let anonSession: Promise<Innertube> | undefined;
let tvSession: Promise<Innertube> | undefined;
// ponytail: npm layout; use `require('ffmpeg-static')` if the binary moves (pnpm).
const ffmpegBin = path.join(process.cwd(), "node_modules/ffmpeg-static/ffmpeg");

function sessionOpts() {
  return {
    cookie: config.youtubeCookie,
    po_token: config.youtubePoToken,
    visitor_data: config.youtubeVisitorData,
    generate_session_locally: false,
    retrieve_player: false,
    retrieve_innertube_config: true,
    enable_session_cache: false,
  };
}

function anonClient(): Promise<Innertube> {
  anonSession ??= Innertube.create(sessionOpts());
  return anonSession;
}

function tvClient(): Promise<Innertube> {
  tvSession ??= (async () => {
    const yt = await Innertube.create(sessionOpts());
    if (!config.youtubeOauth) return yt;
    try {
      await yt.session.signIn(config.youtubeOauth);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new YoutubeError(
        `YOUTUBE_OAUTH sign-in failed (${msg}). Re-run npm run youtube:login and paste the full JSON.`,
        401,
      );
    }
    return yt;
  })();
  return tvSession;
}

const MEDIA_HEADERS: Record<string, string> = {
  accept: "*/*",
  origin: "https://www.youtube.com",
  referer: "https://www.youtube.com",
  "user-agent":
    "com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)",
  ...(config.youtubeCookie ? { cookie: config.youtubeCookie } : {}),
};

async function timed<T>(p: Promise<T>): Promise<T> {
  const abort = AbortSignal.timeout(config.ytdlTimeoutMs);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new YoutubeError("YouTube timed out. Try again.", 504));
    abort.addEventListener("abort", onAbort, { once: true });
    p.then((v) => {
      abort.removeEventListener("abort", onAbort);
      resolve(v);
    }, reject);
  });
}

export async function fetchVideo(videoId: string) {
  const info = await getPlayableInfo(videoId);

  const d = info.basic_info;
  if (d.is_private) throw new YoutubeError("This video is private.", 403);
  if (d.is_live) throw new YoutubeError("Live streams can't be downloaded as a file.", 400);

  const raw = [
    ...(info.streaming_data?.formats ?? []),
    ...(info.streaming_data?.adaptive_formats ?? []),
  ];
  const formats = pickFormats(raw);
  if (!formats.length) throw new YoutubeError("No downloadable formats on this video.", 422);

  const thumbs = d.thumbnail ?? [];
  const thumbnail = thumbs[thumbs.length - 1]?.url ?? "";

  return {
    info,
    meta: {
      videoId: d.id || videoId,
      title: d.title || "video",
      thumbnail,
      duration: d.duration || 0,
      channel: d.author || d.channel?.name || "Unknown",
      formats,
    } satisfies VideoMetadata,
  };
}

export async function openDownloadStream(videoId: string, itag: number) {
  const { info, meta } = await fetchVideo(videoId);
  const listed = meta.formats.find((f) => f.itag === itag);
  if (!listed) throw new YoutubeError("That format is not available.", 400);

  const raw = [
    ...(info.streaming_data?.formats ?? []),
    ...(info.streaming_data?.adaptive_formats ?? []),
  ];
  const video = raw.find((f) => f.itag === listed.itag);
  if (!video?.url) throw new YoutubeError("That format is not available.", 400);

  if (listed.audioItag) {
    const audio = raw.find((f) => f.itag === listed.audioItag);
    if (!audio?.url) throw new YoutubeError("No audio track to mux.", 502);
    return {
      stream: mux(video.url, audio.url, listed.container),
      format: listed,
      title: meta.title,
      knownLength: false,
    };
  }

  const res = await fetch(video.url, { headers: MEDIA_HEADERS });
  if (!res.ok || !res.body) throw new YoutubeError("Could not start the download stream.", 502);
  return { stream: res.body, format: listed, title: meta.title, knownLength: true };
}

export function downloadFilename(title: string, format: VideoFormatOption): string {
  const base =
    title
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "video";
  const ext = format.hasVideo ? format.container : format.container === "mp4" ? "m4a" : format.container || "m4a";
  return `${base}.${ext}`;
}

function mux(videoUrl: string, audioUrl: string, container: string): ReadableStream<Uint8Array> {
  if (!ffmpegBin) throw new YoutubeError("ffmpeg is not available.", 500);
  const format = container === "webm" ? "webm" : "mp4";
  const header = Object.entries(MEDIA_HEADERS)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\r\n");
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-reconnect",
    "1",
    "-reconnect_streamed",
    "1",
    "-reconnect_delay_max",
    "5",
    "-headers",
    `${header}\r\n`,
    "-i",
    videoUrl,
    "-headers",
    `${header}\r\n`,
    "-i",
    audioUrl,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c",
    "copy",
    ...(format === "mp4" ? ["-movflags", "frag_keyframe+empty_moov+default_base_moof"] : []),
    "-f",
    format,
    "pipe:1",
  ];
  const ff = spawn(ffmpegBin, args, { stdio: ["ignore", "pipe", "pipe"] });
  if (!ff.stdout) throw new YoutubeError("ffmpeg failed to start.", 500);
  ff.stderr.on("data", (buf: Buffer) => {
    const msg = buf.toString().trim();
    if (msg) console.error("[ffmpeg]", msg);
  });
  ff.on("error", (err) => {
    console.error("[ffmpeg]", err);
  });
  return Readable.toWeb(ff.stdout) as ReadableStream<Uint8Array>;
}

async function getPlayableInfo(videoId: string) {
  type Client = "IOS" | "MWEB" | "TV";
  const attempts: { client: Client; yt: () => Promise<Innertube> }[] = [
    { client: "IOS", yt: anonClient },
    { client: "MWEB", yt: anonClient },
  ];
  if (config.youtubeOauth) attempts.push({ client: "TV", yt: tvClient });

  const failures: string[] = [];
  for (const { client, yt } of attempts) {
    try {
      const info = await timed((await yt()).getBasicInfo(videoId, { client }));
      const status = info.playability_status?.status;
      const raw = [
        ...(info.streaming_data?.formats ?? []),
        ...(info.streaming_data?.adaptive_formats ?? []),
      ];
      if (raw.some((f) => f.url) && (!status || status === "OK")) return info;
      const why = status && status !== "OK"
        ? `${client}:${status} ${info.playability_status?.reason || ""}`.trim()
        : `${client}:no stream urls`;
      failures.push(why);
    } catch (err) {
      if (err instanceof YoutubeError && err.status === 504) throw err;
      if (err instanceof YoutubeError && err.status === 401) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`${client}:${msg.slice(0, 120)}`);
    }
  }
  throw mapExtractError(new Error(failures.join(" | ") || "no clients"));
}

export function mapPlayability(status: string, reason?: string): YoutubeError {
  const r = (reason || status).toLowerCase();
  if (isAgeGate(r)) {
    return new YoutubeError("Age-restricted video. Sign in: npm run youtube:login, then set YOUTUBE_OAUTH.", 403);
  }
  if (status === "LOGIN_REQUIRED" || r.includes("sign in") || isBotWall(r)) {
    const hasAuth = Boolean(config.youtubeCookie || config.youtubeOauth);
    return new YoutubeError(
      hasAuth
        ? "YouTube rejected the session. Re-run npm run youtube:login and update YOUTUBE_OAUTH (or YOUTUBE_COOKIE)."
        : "YouTube blocked this server IP (normal on Vercel). Run npm run youtube:login and set YOUTUBE_OAUTH.",
      403,
    );
  }
  if (status === "UNPLAYABLE" || r.includes("private")) {
    return new YoutubeError(reason || "This video is unavailable.", r.includes("private") ? 403 : 404);
  }
  return new YoutubeError(reason || "Video is unavailable.", 404);
}

function mapExtractError(err: unknown): YoutubeError {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes("private")) return new YoutubeError("This video is private.", 403);
  if (isAgeGate(lower)) return mapPlayability("UNPLAYABLE", msg);
  if (lower.includes("sign in") || isBotWall(lower) || lower.includes("login_required")) {
    return mapPlayability("LOGIN_REQUIRED", msg);
  }
  if (lower.includes("unavailable") || lower.includes("not exist")) {
    return new YoutubeError("Video is unavailable.", 404);
  }
  return new YoutubeError(
    `Could not extract video info (${msg.slice(0, 280)}). Vercel IPs are often fully blocked — run locally, or put a residential proxy in front.`,
    502,
  );
}
