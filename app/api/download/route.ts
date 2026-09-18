import { NextResponse } from "next/server";
import { allowRequest, clientIp } from "@/lib/config";
import { downloadFilename, openDownloadStream, YoutubeError } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!allowRequest(clientIp(req))) {
    return NextResponse.json({ error: "Too many requests. Wait a minute." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const itag = Number(searchParams.get("itag"));
  if (!/^[\w-]{11}$/.test(id) || !Number.isInteger(itag) || itag <= 0) {
    return NextResponse.json({ error: "Missing video id or itag." }, { status: 400 });
  }

  try {
    const { stream, format, title, knownLength } = await openDownloadStream(id, itag);
    const filename = downloadFilename(title, format);
    const headers = new Headers({
      "Content-Type": mimeFor(format.container, format.hasVideo),
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "no-store",
    });
    // Muxed ffmpeg output size ≠ DASH byte sum; a wrong Content-Length truncates the file.
    if (knownLength && format.contentLength) {
      headers.set("Content-Length", String(format.contentLength));
    }

    return new Response(stream, { headers });
  } catch (err) {
    if (err instanceof YoutubeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function mimeFor(container: string, hasVideo: boolean): string {
  if (!hasVideo && container === "mp4") return "audio/mp4";
  if (container === "webm") return hasVideo ? "video/webm" : "audio/webm";
  return hasVideo ? "video/mp4" : "audio/mp4";
}
