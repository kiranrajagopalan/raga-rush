# Raga Challenge — Session Handoff

> Current dev state + decisions. For stable architecture see `PROJECT.md`.

## Status
Build: `20260407-b58` | Branch: `main` | All features complete

## Recent Changes (b54–b58)
- b54: Local video pipeline — Safari shares raw recording directly (zero Cloudinary), Chrome tries Mediabunny WebCodecs transcode with Cloudinary fallback
- b55: Fix Mediabunny loading — switch from .cjs (CommonJS, doesn't load in browsers) to .mjs via dynamic `import()`. Fix codec name: `'avc'` not `'h264'`
- b55: Single-row session analytics — `logSession()` moved to end of `processVideoInBackground()` so `pipeline`, `video_size_kb`, `processing_time_ms` are in same row as gameplay data
- b56: Remove feedback chips — reaction + open textarea only (no feature priming)
- b57: Add app interest question to feedback ("Would you download a Karnatik music app?") — logs as `app_interest` in feedback tab
- b58: Local pipeline is now default for all users (was gated behind `?local`)

## Video Pipeline — now three paths

### Safari (iOS + macOS) — LOCAL, instant
`USE_LOCAL_PIPELINE = true` → raw fMP4 recording blob shared directly. Zero Cloudinary, zero network. WhatsApp iOS re-encodes everything anyway.

### Chrome (Android + Desktop) — Mediabunny → Cloudinary fallback
1. Try: Mediabunny WebCodecs transcode (VP9→H264 via `'avc'`, Opus→AAC). ESM loaded via dynamic `import()` from jsdelivr (~471KB + 969KB AAC polyfill)
2. If Mediabunny fails: fall back to Cloudinary upload → fetch fMP4 → remux to flat MP4

### Testing status
- Safari `local_safari`: ✅ instant, tested on iOS + macOS
- Chrome `local_chrome`: ❌ Mediabunny fails on tested devices (old Android, Chrome macOS) — falls back to Cloudinary (`local_fallback`). Likely API mismatch or device WebCodecs issue. Needs testing on modern Android.
- Cloudinary fallback: ✅ works as before

### Pipeline analytics
`pipelineUsed` global tracks which path ran. Values: `local_safari`, `local_chrome`, `local_fallback`, `cloudinary_safari`, `cloudinary_chrome`, `cloudinary_fmp4`. Logged in sessions tab.

## Analytics

### Google Sheet tabs
`visits`, `funnel`, `sessions`, `feedback`, `invites`, `errors`, `daily_summary`
(No `shares` tab — share data merged into `sessions`)

### Sessions tab extra columns (b55+)
`pipeline`, `video_size_kb`, `processing_time_ms` — populated by `logSession()` at end of `processVideoInBackground()`

### Feedback tab (b57+)
`reaction`, `features` (always empty now), `comment`, `app_interest` (yes/maybe/no)

### Apps Script auto-extends headers
`getOrCreateTab()` checks if existing tab headers are shorter than configured cols and appends missing column headers automatically.

### Current endpoint
Update `SHEETS_ENDPOINT` in index.html AND redeploy Apps Script whenever `APPS-SCRIPT.js` changes. Each new Apps Script deployment = new URL.

## Critical Decisions (do NOT undo these)

### captureStream — Safari vs Chrome split
- Safari: `captureStream(0)` + `requestFrame()`. Safari's `captureStream(30)` freezes video.
- Chrome: `captureStream(30)`. Chrome Android's `captureStream(0)` produces zero-size chunks.

### MediaRecorder — Safari MP4, Chrome WebM
- Chrome Android `isTypeSupported('video/mp4')` lies on some devices. Always WebM on Chrome.

### No await before navigator.share()
- Any `await` between click and `navigator.share()` consumes Chrome's transient user activation.

### Web Share API — mobile only, files only
- Adding `title`/`text` alongside `files` drops the file on Chrome Android.
- Safari CAN include `text` (used for share caption).
- Skip `canShare()` — returns false on valid files on some Chrome.

### Cloudinary transform (fallback path)
```
f_mp4,vc_h264:baseline:3.1,ac_aac,af_44100,br_4m
```
- `baseline:3.1` = no B-frames, safe for remux. `q_auto` is BANNED.

### Remux failure → fMP4 fallback (not null)
- If remux fails, `mp4Blob` = Cloudinary fMP4 (works on most apps except old WhatsApp Android).

### Cleanup timer must be cancellable
- `restart()` clears `cleanupTimer` to prevent orphaned timer from deleting next play's upload.

## Key Functions
| Function | Purpose |
|----------|---------|
| `processVideoInBackground()` | Routes local/Cloudinary pipeline, sets `pipelineUsed`, calls `logSession()` |
| `transcodeLocally(blob, onProgress)` | Mediabunny WebCodecs: WebM→MP4 (Chrome only) |
| `loadMediabunny()` | Dynamic ESM import of Mediabunny + AAC polyfill |
| `remuxToFlatMp4(fmp4Blob)` | Custom fMP4 parser → mp4-muxer flat MP4 |
| `shareOrDownload()` | Web Share API (mobile) → download fallback (desktop) |
| `uploadToCloudinary(blob)` | Unsigned XHR upload with progress |
| `logSession()` | Logs gameplay + pipeline data as single session row |

## Key Globals
```js
let nativeMp4;         // true on Safari
let finalBlob;         // raw recording blob
let mp4Blob;           // processed MP4 for sharing
let pipelineUsed;      // which pipeline ran (for analytics)
let uploadFailed;      // true → download-only mode
let processingStarted; // once-gate
const USE_LOCAL_PIPELINE = true; // local pipeline is default
```

## Deployment
```bash
git push origin main   # GitHub Pages auto-deploys (~1 min)
# Always bump APP_BUILD before pushing
```
