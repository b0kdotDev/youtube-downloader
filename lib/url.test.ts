import assert from "node:assert/strict";
import { parseYouTubeUrl } from "./url.ts";

assert.equal(parseYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
assert.equal(parseYouTubeUrl("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
assert.equal(parseYouTubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
assert.equal(parseYouTubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
assert.equal(parseYouTubeUrl("https://evil.com/watch?v=dQw4w9WgXcQ"), null);
assert.equal(parseYouTubeUrl("not a url"), null);
assert.equal(parseYouTubeUrl("https://www.youtube.com/watch?v=short"), null);
console.log("ok");
