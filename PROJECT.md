# Raga Challenge — Project Reference

> Stable architecture, tech stack, app flow. For current dev state see `CLAUDE.md`.

## What
Mobile-first web app. User records themselves singing Carnatic ragas on camera. Slot machine picks ragas, countdown timer runs, result is a shareable MP4 video with all overlays baked in.

## URLs
- **Live:** https://karnatricks.com/raga-rush/
- **Repo:** https://github.com/kiranrajagopalan/raga-rush (remote: git@github.com:kiranrajagopalan/raga-rush.git)
- **Landing page:** https://karnatricks.com (repo: kiranrajagopalan/kiranrajagopalan.github.io)
- **Dashboard:** https://karnatricks.com/raga-rush/dashboard.html?admin=7
- **Branch:** `main` (GitHub Pages serves directly)

## Tech Stack
- Single HTML file (`index.html`) — no frameworks, no build step
- Canvas API — composites camera + UI overlays at 30fps
- MediaRecorder API — Safari records MP4, Chrome records WebM
- Cloudinary — server-side transcode + H.264 encoding
- mp4-muxer@5.2.2 — client-side fMP4→flat MP4 remux (Chrome path only)
- Web Share API — native share sheet with file attachment (mobile only)
- Phosphor Icons@2.1.1 (CDN)
- Google Apps Script endpoint for analytics (visits, funnel, sessions, shares, feedback, invites, errors)
- HTTPS client-side redirect (excludes localhost)

## App Flow
```
Setup → Camera Permission → Preview → 3-2-1-GO Countdown
→ Challenge Loop (slot spin → raga reveal → sing → countdown → next)
→ End Card (animated summary, ~3.5s, baked into video)
→ Results Screen (interactive raga list + stats)
  [Background: upload → Cloudinary transcode → remux → MP4 ready]
→ Done Screen (Share Video / Download MP4)
```

## File Structure
```
raga-challenge/
├── PROJECT.md              ← this file (stable reference)
├── CLAUDE.md               ← current dev state + session handoff
├── DIFFICULTY-MODES.md     ← raga pools, mode logic, Surprise Me themes
├── APPS-SCRIPT.js          ← Google Apps Script handler (paste into editor)
├── dashboard.html          ← admin analytics dashboard (?admin=7)
├── VIDEO-SCRIPT.md         ← "Why I Built This" video script
├── IMAGE-PROMPTS.md        ← Nano Banana 2 prompts for video imagery
├── README.md               ← minimal
└── index.html              ← entire app (~107KB)
```

## Cloudinary Config
| Key | Value |
|-----|-------|
| Cloud | `dfstch1ag` |
| Preset | `forRagaChallange` (unsigned) |
| Upload URL | `https://api.cloudinary.com/v1_1/dfstch1ag/video/upload` |
| Transform | `f_mp4,vc_h264:baseline:3.1,ac_aac,af_44100,br_4m` |
| Cleanup | Auto-delete via `delete_token` after share (free tier: 25 credits/month) |
| Preset restrictions | Allowed formats: `webm,mp4` / Folder: `raga-challenge/` |

## Video Pipeline (b43+)

### Recording
| Platform | Format | Codec | Bitrate |
|----------|--------|-------|---------|
| Safari (iOS + macOS) | MP4 (fMP4) | H.264 + AAC | 5 Mbps video, 128k audio |
| Chrome (Android + Desktop) | WebM | VP9 + Opus | 5 Mbps video, 128k audio |

Detection: `isSafari` (not `isIOS`) controls both MIME selection and pipeline routing.

### Processing — dual path in `processVideoInBackground()`

**Safari path:** Upload fMP4 → Cloudinary transform → materialize via `arrayBuffer()` → share as-is (WhatsApp iOS re-encodes everything)

**Chrome path:** Upload WebM → Cloudinary transform → fetch fMP4 → client-side `remuxToFlatMp4()` → flat MP4 → share (WhatsApp Android requires flat MP4: `ftyp→moov→mdat`). If remux fails, falls back to Cloudinary fMP4.

### Pipeline timeouts (dynamic)
- **Fetch:** `max(120s, challengeElapsed × 1.5)` — covers Cloudinary's first-request VP9→H264 transcode + download
- **Remux:** `max(30s, ~3s per MB of fMP4)` — scales with file size

### Why this architecture
- WhatsApp Android rejects fMP4 (fragmented MP4 with `moof+mdat` boxes)
- Cloudinary always outputs fMP4, even with `f_mp4`
- Client-side custom parser extracts samples from fMP4, mp4-muxer writes flat MP4
- Must use `vc_h264:baseline:3.1` — Baseline has no B-frames (PTS=DTS). High profile B-frames corrupt video during remux
- Chrome Android's `isTypeSupported('video/mp4')` lies on some devices (produces audio-only fMP4) — always use WebM on Chrome
- Safari's `captureStream(30)` + `requestFrame()` freezes video track — use `captureStream(0)` on Safari

### Canvas capture — Safari vs Chrome
- Safari: `captureStream(0)` + explicit `requestFrame()` after each paint
- Chrome: `captureStream(30)` + heartbeat `setInterval` for steady frame stream
- rAF watchdog: heartbeat calls `drawLoop` directly if rAF stalls >150ms

### Web Share API quirks
- `navigator.share({files:[file]})` — files ONLY, no title/text (combining drops files on Chrome Android)
- Mobile only: `isMobile` guard prevents desktop Chrome share dialog (AbortError exits without downloading)
- No await before share: `new File([blob], ...)` must be synchronous — any `await` consumes Chrome's transient user activation
- No share timeout: user interacts with share sheet at their own pace
- Skip `canShare()` guard — returns false with valid files on some Chrome versions
- Fallback chain: share → DOM `<a>` download → direct Cloudinary URL download

### Multi-play safety
- `cleanupTimer` stores the delayed Cloudinary cleanup setTimeout handle
- `restart()` cancels it to prevent an orphaned timer from deleting the next play's upload
- `restart()` also resets `mediaRecorder`, `captureTrack`, and all state variables

## Challenge Screen Layout
```
.cam-top    — flex 0 0 15% — REC badge / brand / difficulty (solid black bg)
.cam-middle — flex 0 0 55% — <video> camera feed (overflow:hidden clips)
.cam-bottom — flex 0 0 30% — slot machine + raga display + countdown (solid black bg)
```

## Canvas Recording Constants
```
TOP_H = H*0.15    MID_H = H*0.55    BOT_Y = H*0.70    BOT_H = H*0.30
ITEM_H = 53       IH = Math.round(160/3) = 53
DRAW_INTERVAL = 1000/30 (30fps)
fs(s) = Math.round(W*s)  — responsive font sizing

Bottom section gaps: FIXED PIXELS (not H-proportional)
IG Stories safe zone: H*0.15 – H*0.82 (conservative)
```

## Key State Variables
| Variable | Purpose |
|----------|---------|
| `nativeMp4` | `true` if Safari (MP4 recording) |
| `finalBlob` | Raw MediaRecorder output (fMP4 on Safari, WebM on Chrome) |
| `mp4Blob` | Processed MP4 for sharing (flat MP4, fMP4 fallback, or null if pipeline failed) |
| `mp4DirectUrl` | Cloudinary transform URL (fallback download source) |
| `uploadFailed` | `true` → download-only mode |
| `processingStarted` | Once-gate for `processVideoInBackground` |
| `cleanupTimer` | setTimeout handle for delayed Cloudinary cleanup — cancelled in restart() |
| `captureTrack` | CanvasCaptureMediaStreamTrack for `requestFrame()` |
| `countdownActive/Text` | 3-2-1-GO rendering on canvas |
| `endCardActive/Start` | End card recording window |
| `isRecording/drawRunning` | MediaRecorder lifecycle |
| `slotSpinning` | `true` while slot reel animates |
| `ragaRevealAt/Name` | Timestamp + name when reel settles |
| `_cdDeleteToken` | Module-scoped Cloudinary delete token |

## Raga Data
- 151 active ragas: 57 Easy, 59 Medium, 35 Hard (134 Rare excluded)
- 3 modes: Easy (10 ragas), Not So Easy (10 ragas), Surprise Me (5 ragas, themed)
- 12 Surprise Me themes — see `DIFFICULTY-MODES.md`

## Security
- `_cdDeleteToken` is module-scoped (not on `window`)
- Slot/results list: `createElement` + `textContent` (no `innerHTML` injection)
- `beforeunload` stops all media tracks
- Cloudinary preset restricted (formats + folder)

## Deployment
```bash
git push origin main   # GitHub Pages auto-deploys (~1 min)
```
