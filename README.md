# YouTube downloader

Next.js App Router app: paste a YouTube URL, list formats, stream the file.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Extractor is `youtubei.js` (InnerTube). Vercel IPs are bot-walled: set `YOUTUBE_COOKIE` (Cookie header from a logged-in youtube.com tab) in the project env and redeploy.

Downloads are for content you have the right to copy. YouTube's terms restrict downloading.
