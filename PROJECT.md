# Raga Challenge — Project Reference

> Stable architecture, tech stack, app flow. For current dev state see `CLAUDE.md`.

## What
Mobile-first web app. Record yourself singing Karnatik ragas on camera. Slot machine picks ragas, countdown timer runs, result is a shareable MP4 video with all overlays baked in.

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
- **Local pipeline (default):** Safari shares raw fMP4 directly; Chrome uses Mediabunny WebCodecs transcode (VP9→H264)
- **Cloudinary fallback:** server-side transcode when Mediabunny fails (cloud `dfstch1ag`, preset `forRagaChallange`)
- mp4-muxer@5.2.2 — client-side fMP4→flat MP4 remux (Cloudinary Chrome path)
- Mediabunny@1.40.1 + @mediabunny/aac-encoder@1.40.1 — ESM dynamic import from jsdelivr (Chrome local path)
- Web Share API — native share sheet with file attachment (mobile only)
- Phosphor Icons@2.1.1 (CDN)
- Google Apps Script endpoint for analytics
- HTTPS client-side redirect (excludes localhost)

## App Flow
```
Setup → Camera Permission → Preview → 3-2-1-GO Countdown
→ Challenge Loop (slot spin → raga reveal → sing → countdown → next)
→ End Card (animated summary, ~3.5s, baked into video)
→ Results Screen (interactive raga list + stats)
  [Background: local transcode or Cloudinary upload → MP4 ready]
→ Done Screen (Share Video / Download MP4)
→ Feedback (reaction → open text + app interest question)
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
└── index.html              ← entire app (~110KB)
```

## Video Pipeline

### Recording
| Platform | Format | Codec | Bitrate |
|----------|--------|-------|---------|
| Safari (iOS + macOS) | MP4 (fMP4) | H.264 + AAC | 5 Mbps video, 128k audio |
| Chrome (Android + Desktop) | WebM | VP9 + Opus | 5 Mbps video, 128k audio |

Detection: `_isSafari` (not `isIOS`) controls both MIME selection and pipeline routing.

### Processing — in `processVideoInBackground()`

**Safari path (local):** Raw fMP4 blob → share directly. Zero network. Instant.

**Chrome path (local → fallback):**
1. Try Mediabunny WebCodecs transcode (WebM → flat MP4)
2. If fails → Cloudinary upload → fetch fMP4 → `remuxToFlatMp4()` → flat MP4
3. If remux fails → fMP4 fallback (works on most apps)

### Cloudinary config (fallback path only)
| Key | Value |
|-----|-------|
| Cloud | `dfstch1ag` |
| Preset | `forRagaChallange` (unsigned) |
| Transform | `f_mp4,vc_h264:baseline:3.1,ac_aac,af_44100,br_4m` |
| Cleanup | Auto-delete via `delete_token` + sendBeacon on tab close |

### Canvas capture — Safari vs Chrome
- Safari: `captureStream(0)` + explicit `requestFrame()` after each paint
- Chrome: `captureStream(30)` + heartbeat for steady frame stream

### Web Share API
- Files ONLY on Chrome (no title/text). Safari can include text for caption.
- Mobile only (`isMobile` guard). Desktop goes straight to download.
- No await before share. No canShare() guard. No share timeout.

## Analytics
- Google Sheet tabs: `visits`, `funnel`, `sessions`, `feedback`, `invites`, `errors`, `daily_summary`
- Sessions tab includes: gameplay data + `pipeline`, `video_size_kb`, `processing_time_ms`
- Feedback tab includes: `reaction`, `comment`, `app_interest`
- Apps Script auto-extends headers when new columns are added
- Dashboard: `dashboard.html?admin=7`
- `APPS-SCRIPT.js` — paste into Apps Script editor, deploy as web app (Anyone), update `SHEETS_ENDPOINT` in index.html

## Raga Data
- 151 active ragas: 57 Easy, 59 Medium, 35 Hard
- 3 modes: Easy, Not So Easy, Surprise Me (themed)
- 12 Surprise Me themes — see `DIFFICULTY-MODES.md`

## Canvas Recording Constants
```
TOP_H = H*0.15    MID_H = H*0.55    BOT_Y = H*0.70    BOT_H = H*0.30
ITEM_H = 53       fs(s) = Math.round(W*s)
Debug mode: ?debug URL param
```

## Deployment
```bash
# Always bump APP_BUILD before pushing
git push origin main   # GitHub Pages auto-deploys (~1 min)
```
