# YouTube downloader

Next.js App Router app: paste a YouTube URL, list formats, stream the file.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Vercel IPs are bot-walled. Locally run `npm run youtube:login`, open the printed URL, enter the code, then set `YOUTUBE_OAUTH` to the JSON it prints (Vercel env or `.env.local`) and redeploy.

Downloads are for content you have the right to copy. YouTube's terms restrict downloading.
