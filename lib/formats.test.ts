import assert from "node:assert/strict";
import { pickFormats, type YtFormat } from "./formats.ts";

const base: YtFormat = {
  itag: 0,
  url: "https://example.com/x",
  mime_type: "video/mp4; codecs=\"avc1\"",
  has_audio: false,
  has_video: true,
  is_type_otf: false,
};

const formats = pickFormats([
  { ...base, itag: 299, quality_label: "1080p60", height: 1080, content_length: 1000, mime_type: 'video/mp4; codecs="avc1"' },
  { ...base, itag: 140, has_video: false, has_audio: true, mime_type: 'audio/mp4; codecs="mp4a.40.2"', content_length: 200 },
  { ...base, itag: 303, quality_label: "1080p60", height: 1080, mime_type: 'video/webm; codecs="vp9"', content_length: 800 },
]);

const hd = formats.find((f) => f.qualityLabel === "1080p60" && f.container === "mp4");
assert.ok(hd);
assert.equal(hd.hasAudio, true);
assert.equal(hd.hasVideo, true);
assert.equal(hd.audioItag, 140);
assert.equal(formats.some((f) => f.container === "webm" && f.hasVideo), false);
assert.ok(formats.some((f) => f.qualityLabel === "Audio"));
console.log("ok");
