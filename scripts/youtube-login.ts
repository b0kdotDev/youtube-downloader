import { Innertube } from "youtubei.js";

const yt = await Innertube.create({
  generate_session_locally: true,
  retrieve_player: false,
});

yt.session.on("auth-pending", (data) => {
  console.log(`Open ${data.verification_url}`);
  console.log(`Enter code: ${data.user_code}`);
});

await yt.session.signIn();
const creds = yt.session.oauth.oauth2_tokens;
if (!creds) {
  console.error("Sign-in produced no tokens.");
  process.exit(1);
}

console.log("\nSet YOUTUBE_OAUTH to this JSON (Vercel env or .env.local), then redeploy:\n");
console.log(JSON.stringify(creds));
