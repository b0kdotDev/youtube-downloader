import { NextResponse } from "next/server";
import { allowRequest, clientIp } from "@/lib/config";
import { parseYouTubeUrl } from "@/lib/url";
import { fetchVideo, YoutubeError } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!allowRequest(clientIp(req))) {
    return NextResponse.json({ error: "Too many requests. Wait a minute." }, { status: 429 });
  }

  let url = "";
  try {
    const body = (await req.json()) as { url?: unknown };
    url = typeof body.url === "string" ? body.url : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = parseYouTubeUrl(url);
  if (!id) {
    return NextResponse.json(
      { error: "Paste a valid YouTube URL (youtube.com or youtu.be)." },
      { status: 400 },
    );
  }

  try {
    const { meta } = await fetchVideo(id);
    return NextResponse.json(meta);
  } catch (err) {
    if (err instanceof YoutubeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message.slice(0, 300) : "Unexpected extraction error." },
      { status: 500 },
    );
  }
}
