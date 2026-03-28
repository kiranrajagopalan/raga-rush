# Raga Challenge — Session Handoff

> Current dev state + decisions. For stable architecture see `PROJECT.md`.

## Status: ALL FEATURES COMPLETE
Build: `20260328-b38` | Branch: `main` | Video sharing ✅ iOS ✅ Android

## Pending Tasks
1. **FormSubmit activation** — trigger one real feedback submission, click the activation email from FormSubmit.co

## Critical Decisions (do NOT undo these)

### Video pipeline — dual path is intentional
- iOS → Cloudinary only (no client remux). WhatsApp iOS re-encodes all videos anyway.
- Android → Cloudinary + client remux to flat MP4. WhatsApp Android rejects fMP4.
- These paths MUST stay separate. Merging them breaks one platform.

### Cloudinary transform MUST use `baseline:3.1`
```
f_mp4,vc_h264:baseline:3.1,ac_aac,af_44100,br_4m
```
- `baseline` = no B-frames. PTS equals DTS. Safe for client-side remux.
- `vc_h264` without `:baseline` → High profile → B-frames → video corruption after remux.
- `br_4m` = 4 Mbps output bitrate. Prevents Cloudinary over-compressing.
- `q_auto` is BANNED — it changed codec unexpectedly and broke sharing.

### Web Share API — files only
```js
navigator.share({files:[file]})  // NO title, NO text
```
- Adding `title` or `text` alongside `files` drops the file attachment on Chrome Android.
- Do NOT add `canShare()` guard — returns false on valid files on some Chrome versions.

### MediaRecorder — WebM on non-iOS
- Chrome Android `isTypeSupported('video/mp4')` returns true but produces audio-only fMP4 on some devices.
- Always prefer WebM codecs on non-iOS. iOS Safari can only record MP4.

### Recording bitrate — 5 Mbps on all platforms
- Was 2.5 Mbps on mobile. Increased to 5 Mbps to give Cloudinary a higher quality source.
- File size is ~2-3 MB for 30s recording — acceptable.

### captureStream — Safari vs Chrome split
```js
recCanvas.captureStream(isSafari ? 0 : 30);
```
- Safari (iOS + macOS): `captureStream(0)` — manual frame push via `requestFrame()`. Safari's `captureStream(30)` conflicts with explicit `requestFrame()` calls, freezing the video track.
- Chrome: `captureStream(30)` — continuous 30fps feed required by H264 hardware encoder. `captureStream(0)` on Chrome Android produced zero-size chunks.
- rAF watchdog in heartbeat calls `drawLoop` directly if rAF hasn't fired in >150ms.
- Do NOT merge these paths. Each browser engine has its own broken path.

### Share blob must be materialized
```js
const shareBuf = await blob.arrayBuffer();
const file = new File([shareBuf], filename, {type:'video/mp4'});
```
- Safari's `fetch().blob()` can return lazily-backed Blobs — not fully resident in memory.
- `navigator.share()` fails immediately (TypeError) when reading lazy blob data.
- iOS pipeline materializes via `arrayBuffer()` after Cloudinary fetch.
- `shareOrDownload()` also materializes defensively before creating the File (all platforms).
- Do NOT use `blob.slice(0)` — it creates another lazy view, not a materialized copy.

### mp4box.js removed — custom parser instead
- mp4box.js could not extract samples from Chrome Android's fMP4 (onSamples never fired).
- Custom binary parser (~130 lines) reads moov/moof/mdat boxes directly.
- mp4-muxer@5.2.2 writes the flat MP4 output.

## Key Functions
| Function | Location | Purpose |
|----------|----------|---------|
| `remuxToFlatMp4(fmp4Blob)` | ~line 1440 | Custom fMP4 parser → mp4-muxer flat MP4 |
| `processVideoInBackground()` | ~line 1580 | Routes iOS/Android pipeline |
| `shareOrDownload()` | ~line 1670 | Web Share API → download fallback |
| `uploadToCloudinary(blob)` | ~line 1600 | Unsigned upload |
| `cleanupCloudinary()` | after share | Deletes via delete_token |

## Key Globals
```js
let nativeMp4;        // true on iOS Safari
let finalBlob;        // raw recording (fMP4 on iOS, WebM on Android)
let mp4Blob;          // processed flat MP4 for sharing
let mp4DirectUrl;     // Cloudinary URL (fallback download)
let uploadFailed;     // true → download-only mode
let processingStarted;// once-gate
```

## CDN Scripts
```html
<script src="https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.2/build/mp4-muxer.min.js"></script>
<script src="https://unpkg.com/@phosphor-icons/web@2.1.1"></script>
```

## Done Screen
- Layout: `#done-screen` flex column, `.done-scroll` (scrollable), `.done-actions` (sticky bottom)
- Pun titles: `DONE_TITLES` array, Carnatic raga puns, `\u2011` non-breaking hyphen
- Stats: 2 boxes (Ragas + Difficulty). Duration stat intentionally removed.
- Feedback strip: Ambient → Prominent (after share) → Chips → Done. Auto-submits 1.8s after last chip tap.

## Canvas Recording
- Event-driven, no DOM polling
- `notifyCanvasSlotStarted()` / `notifyCanvasSlotSettled(name)` bridge DOM↔canvas
- `ITEM_H=53`, `fs(s)=Math.round(W*s)`
- Debug mode: `?debug` URL param — renders all 4 states without camera

## Deployment
```bash
git push origin main   # GitHub Pages auto-deploys (~1 min)
```
