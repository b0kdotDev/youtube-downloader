"use client";

import { useMemo, useState } from "react";
import type { VideoFormatOption, VideoMetadata } from "@/lib/types";
import { parseYouTubeUrl } from "@/lib/url";

export function Downloader() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [itag, setItag] = useState<number | null>(null);

  const selected = useMemo(
    () => video?.formats.find((f) => f.itag === itag) ?? null,
    [video, itag],
  );

  async function fetchInfo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setVideo(null);
    setItag(null);
    if (!parseYouTubeUrl(url)) {
      setError("Paste a valid YouTube URL (youtube.com or youtu.be).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as VideoMetadata & { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to fetch video.");
      setVideo(data);
      setItag(
        data.formats.find((f) => f.hasAudio && f.hasVideo)?.itag ??
          data.formats.find((f) => f.hasAudio)?.itag ??
          data.formats[0]?.itag ??
          null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch video.");
    } finally {
      setLoading(false);
    }
  }

  async function download() {
    if (!video || !selected) return;
    setError(null);
    setDownloading(true);
    setProgress(0);
    try {
      const res = await fetch(`/api/download?id=${video.videoId}&itag=${selected.itag}`);
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Download failed.");
      }
      const total = Number(res.headers.get("content-length")) || 0;
      const name =
        res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ||
        "download";
      await saveStream(res, name, total, setProgress);
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  }

  return (
    <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h1 className="text-2xl font-semibold tracking-tight">YouTube downloader</h1>
      <p className="mt-1 text-sm text-zinc-500">Paste a link, pick a format, download.</p>

      <form onSubmit={fetchInfo} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="yt-url">
          YouTube URL
        </label>
        <input
          id="yt-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://www.youtube.com/watch?v=…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "Fetching…" : "Fetch"}
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {video ? (
        <section className="mt-6 flex flex-col gap-4 sm:flex-row">
          {video.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnail}
              alt=""
              className="h-28 w-full rounded-lg object-cover sm:h-24 sm:w-40"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="font-medium leading-snug">{video.title}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {video.channel} · {formatDuration(video.duration)}
            </p>

            <label className="mt-3 block text-xs font-medium text-zinc-500" htmlFor="format">
              Resolution + format
            </label>
            <select
              id="format"
              value={itag ?? ""}
              onChange={(e) => setItag(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
            >
              {video.formats.map((f) => (
                <option key={`${f.itag}-${f.audioItag ?? 0}`} value={f.itag}>
                  {optionLabel(f)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={download}
              disabled={!selected || downloading}
              className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {downloading ? "Downloading…" : "Download"}
            </button>

            {downloading ? (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-full bg-zinc-900 transition-all dark:bg-zinc-100"
                    style={{ width: progress == null ? "30%" : `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {progress == null || progress === 0
                    ? "Starting…"
                    : `${Math.round(progress * 100)}%`}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function optionLabel(f: VideoFormatOption): string {
  const kind = !f.hasVideo ? "Audio (M4A)" : f.container.toUpperCase();
  const size = f.contentLength ? ` · ${formatBytes(f.contentLength)}` : "";
  return `${f.qualityLabel} · ${kind}${size}`;
}

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}

async function saveStream(
  res: Response,
  filename: string,
  total: number,
  onProgress: (n: number) => void,
) {
  const body = res.body;
  if (!body) throw new Error("Empty response.");
  const reader = body.getReader();

  const w = window as Window & {
    showSaveFilePicker?: (opts: { suggestedName: string }) => Promise<{
      createWritable: () => Promise<{
        write: (data: Uint8Array) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };

  // Stream to disk when the browser supports it; otherwise fall back to a blob URL.
  if (typeof w.showSaveFilePicker === "function") {
    try {
      const handle = await w.showSaveFilePicker({ suggestedName: filename });
      const writable = await handle.createWritable();
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        await writable.write(value);
        if (total) onProgress(received / total);
      }
      await writable.close();
      return;
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") throw err;
    }
  }

  const chunks: BlobPart[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    if (total) onProgress(received / total);
  }
  const blob = new Blob(chunks);
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}
