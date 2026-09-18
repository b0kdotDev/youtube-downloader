import type { VideoFormatOption } from "./types";

export type YtFormat = {
  itag: number;
  url?: string;
  quality_label?: string;
  height?: number;
  fps?: number;
  mime_type: string;
  has_audio: boolean;
  has_video: boolean;
  is_type_otf: boolean;
  content_length?: number;
};

export function pickFormats(formats: YtFormat[]): VideoFormatOption[] {
  const usable = formats.filter(
    (f) => f.itag && f.url && f.mime_type && !f.is_type_otf && (f.has_audio || f.has_video),
  );
  const videos = usable.filter((f) => f.has_video).sort(rankFormat);
  const audios = usable
    .filter((f) => f.has_audio && !f.has_video)
    .sort((a, b) => (b.content_length || 0) - (a.content_length || 0));

  const seen = new Set<string>();
  const out: VideoFormatOption[] = [];

  for (const v of videos) {
    const container = mimeContainer(v.mime_type);
    const qualityLabel = v.quality_label || (v.height ? `${v.height}p` : "video");
    const key = `${qualityLabel}|${container}`;
    if (seen.has(key)) continue;
    const audio = v.has_audio ? null : matchAudio(audios, container);
    if (!v.has_audio && !audio) continue;
    seen.add(key);
    const audioLen = audio?.content_length || 0;
    const videoLen = v.content_length || 0;
    out.push({
      itag: v.itag,
      audioItag: audio ? audio.itag : null,
      qualityLabel,
      container,
      hasVideo: true,
      hasAudio: true,
      codecs: codecFromMime(v.mime_type),
      contentLength: v.has_audio ? (v.content_length ?? null) : videoLen && audioLen ? videoLen + audioLen : null,
      fps: v.fps ?? null,
    });
  }

  for (const a of audios) {
    const container = mimeContainer(a.mime_type);
    const key = `Audio|${container}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      itag: a.itag,
      audioItag: null,
      qualityLabel: "Audio",
      container,
      hasVideo: false,
      hasAudio: true,
      codecs: codecFromMime(a.mime_type),
      contentLength: a.content_length ?? null,
      fps: null,
    });
  }

  return out;
}

function matchAudio(audios: YtFormat[], videoContainer: string): YtFormat | undefined {
  const want = videoContainer === "webm" ? "webm" : "mp4";
  return audios.find((a) => mimeContainer(a.mime_type) === want);
}

function mimeContainer(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("3gp")) return "3gp";
  return "mp4";
}

function codecFromMime(mime: string): string {
  return mime.match(/codecs="([^"]+)"/)?.[1] ?? "";
}

function rankFormat(a: YtFormat, b: YtFormat): number {
  if ((a.height || 0) !== (b.height || 0)) return (b.height || 0) - (a.height || 0);
  return (b.content_length || 0) - (a.content_length || 0);
}
