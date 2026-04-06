# Raga Challenge — Session Handoff

> Current dev state + decisions. For stable architecture see `PROJECT.md`.

## Status: ALL FEATURES COMPLETE + ANALYTICS + PRIVACY
Build: `20260406-b52` | Branch: `main` | Video sharing ✅ iOS ✅ Android ✅ Desktop | Analytics ✅ | Privacy ✅ | HTTPS ✅

## Pending Tasks
_(none)_

## Recent Changes (b51–b52)
- b51: Full analytics system (logEvent, trackStage, funnel tracking, visitor_id, dashboard)
- b51: Updated Apps Script endpoint (new deployment URL)
- b52: HTTPS client-side redirect (excludes localhost)
- b52: Privacy disclaimer — subtle line above CTA + bottom sheet with privacy policy
- b52: Fix — restored Begin Challenge button as direct child of #setup-screen (wrapper div broke `>` selector)

## Analytics Architecture (b51)

### How it works
- `logEvent(payload, immediate)` — unified analytics function, merges common fields (visitor_id, device, browser, OS, timezone, etc.) automatically
- `trackStage(newStage)` — tracks funnel transitions with time-in-stage measurement
- `flushEvents()` — sends batched funnel events (batched for quota protection, flushed on key conversions + beforeunload)
- `visitorId` — anonymous ID in localStorage (`rc_visitor`), no PII

### Event types
| Type | Fires at | Immediate? |
|------|----------|------------|
| `visit` | Page load | yes |
| `funnel` | Every stage transition | batched |
| `session` | Challenge complete | yes |
| `share` | After share/download | yes |
| `feedback` | Feedback submit | yes |
| `invite` | Invite action | yes |
| `error` | Critical failures | yes |

### Funnel stages (in order)
`setup` → `camera_prompt` → `preview` → `countdown` → `recording` → `challenge_complete` or `early_end` → `results` → `shared` → `feedback_given` → `restarted`

Also: `camera_denied` (dead end), `setup` (via goBack)

### Google Sheet tabs
`visits`, `funnel`, `sessions`, `shares`, `feedback`, `invites`, `errors`, `daily_summary`

### Dashboard
- `dashboard.html` — admin-only via `?admin=7`, fetches cumulative stats from Apps Script `doGet(?action=stats)`
- Phase 2: subtle community stat on setup screen (deferred until thresholds met)

### Key files
- `APPS-SCRIPT.js` — paste into Google Apps Script editor, redeploy
- `dashboard.html` — admin analytics page

## Critical Decisions (do NOT undo these)

### Video pipeline — dual path is intentional
- **Safari (iOS + macOS)** → Cloudinary only (no client remux). WhatsApp iOS re-encodes all videos anyway.
- **Chrome (Android + Desktop)** → Cloudinary + client remux to flat MP4. WhatsApp Android rejects fMP4.
- These paths MUST stay separate. Merging them breaks one platform.
- Detection: `isSafari` (not `isIOS`) for both MIME selection AND pipeline routing.

### Cloudinary transform MUST use `baseline:3.1`
```
f_mp4,vc_h264:baseline:3.1,ac_aac,af_44100,br_4m
```
- `baseline` = no B-frames. PTS equals DTS. Safe for client-side remux.
- `vc_h264` without `:baseline` → High profile → B-frames → video corruption after remux.
- `br_4m` = 4 Mbps output bitrate. Prevents Cloudinary over-compressing.
- `q_auto` is BANNED — it changed codec unexpectedly and broke sharing.

### captureStream — Safari vs Chrome split
```js
recCanvas.captureStream(isSafari ? 0 : 30);
```
- Safari (iOS + macOS): `captureStream(0)` — manual frame push via `requestFrame()`. Safari's `captureStream(30)` conflicts with explicit `requestFrame()` calls, freezing the video track.
- Chrome: `captureStream(30)` — continuous 30fps feed required by H264 hardware encoder. `captureStream(0)` on Chrome Android produced zero-size chunks.
- rAF watchdog in heartbeat calls `drawLoop` directly if rAF hasn't fired in >150ms.
- Do NOT merge these paths. Each browser engine has its own broken path.

### MediaRecorder — Safari prefers MP4, Chrome prefers WebM
- `isSafari` controls MIME selection (not `isIOS`). Safari macOS 16+ supports WebM but recording as MP4 avoids the remux pipeline entirely.
- Chrome Android `isTypeSupported('video/mp4')` returns true but produces audio-only fMP4 on some devices. Always prefer WebM on Chrome.

### No await between click and navigator.share()
```js
const file = new File([blob], filename, {type:'video/mp4'}); // synchronous!
await navigator.share({files:[file]});                        // first await = share
```
- Any `await` between the button click and `navigator.share()` consumes Chrome's transient user activation (5s timeout). `navigator.share()` then throws `NotAllowedError`.
- Both pipelines already materialize their blobs before `shareOrDownload()` runs:
  - Safari: `arrayBuffer()` in `processVideoInBackground`
  - Chrome: `remuxToFlatMp4()` produces in-memory blob
- Do NOT add `await blob.arrayBuffer()` or any other async call before `navigator.share()`.
- Do NOT use `blob.slice(0)` — it creates a lazy view, not a materialized copy.

### Web Share API — mobile only, files only
```js
if(navigator.share && isMobile){ navigator.share({files:[file]}) }
```
- Adding `title` or `text` alongside `files` drops the file attachment on Chrome Android.
- Do NOT add `canShare()` guard — returns false on valid files on some Chrome versions.
- `isMobile` guard: desktop Chrome has `navigator.share` but dismissing the share dialog (AbortError) exits without downloading. Desktop skips share → goes straight to blob download.
- No share timeout — `navigator.share()` resolves when user picks a target or cancels. A 15s timeout fires while the share sheet is still open, triggering download fallback.

### Pipeline timeouts — dynamic, scaled to recording duration
```js
const fetchTimeout = Math.max(120000, challengeElapsed * 1500); // 1.5× duration, min 2 min
const remuxTimeout = Math.max(30000, fmp4Blob.size / 300000 * 1000); // ~3s/MB, min 30s
```
- Cloudinary's first-request VP9→H264 transcode is proportional to recording duration.
- Fixed 40s timeout failed for 10-raga challenges (128s recording on 4G).
- Remux timeout scales with file size — larger files need more parsing + muxing time.

### Remux failure → fMP4 fallback (not null)
- If remux times out or crashes, `mp4Blob` falls back to the Cloudinary fMP4 blob.
- fMP4 works on Telegram, email, most apps. Only older WhatsApp Android rejects fMP4.
- Previously, remux failure set `mp4Blob=null` → button showed "Share Video" but downloaded raw WebM → WhatsApp rejected it entirely.
- `enableDownloadButton()` checks `uploadFailed` — only shows "Download Recording" when upload/fetch actually failed.

### Cleanup timer must be cancellable
```js
clearTimeout(cleanupTimer);
cleanupTimer = setTimeout(cleanupCloudinary, 30000);
```
- The delayed Cloudinary cleanup (`setTimeout(cleanupCloudinary, 30000)`) in `shareOrDownload`'s finally block is stored in `cleanupTimer`.
- `restart()` cancels it with `clearTimeout(cleanupTimer)`. Without this, an orphaned timer from play 1 could delete play 2's Cloudinary upload by reading the reassigned `_cdDeleteToken`.
- `restart()` also resets `mediaRecorder` and `captureTrack` to prevent object leaks.

### mp4box.js removed — custom parser instead
- mp4box.js could not extract samples from Chrome Android's fMP4 (onSamples never fired).
- Custom binary parser (~150 lines) reads moov/moof/mdat boxes directly.
- mp4-muxer@5.2.2 writes the flat MP4 output.

## Key Functions
| Function | Purpose |
|----------|---------|
| `remuxToFlatMp4(fmp4Blob)` | Custom fMP4 parser → mp4-muxer flat MP4 |
| `processVideoInBackground()` | Routes Safari/Chrome pipeline with dynamic timeouts |
| `shareOrDownload()` | Web Share API (mobile) → download fallback (desktop) |
| `uploadToCloudinary(blob)` | Unsigned XHR upload with progress |
| `cleanupCloudinary()` | Deletes via delete_token |
| `enableDownloadButton()` | Sets button label, respects `uploadFailed` state |

## Key Globals
```js
let nativeMp4;        // true on Safari (MP4 recording)
let finalBlob;        // raw recording (fMP4 on Safari, WebM on Chrome)
let mp4Blob;          // processed MP4 for sharing (flat or fMP4 fallback)
let mp4DirectUrl;     // Cloudinary URL (fallback download)
let uploadFailed;     // true → download-only mode
let processingStarted;// once-gate
let cleanupTimer;     // setTimeout handle — cancelled in restart()
let captureTrack;     // CanvasCaptureMediaStreamTrack for requestFrame()
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
