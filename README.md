# YouTube downloader

Next.js App Router app: paste a YouTube URL, list formats, stream the file.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Extractor is `youtubei.js` (InnerTube, iOS client). `@distube/ytdl-core` cannot parse current WEB player JS. If this also fails, the next fallback is `yt-dlp`.

Downloads are for content you have the right to copy. YouTube's terms restrict downloading.
