# Raga Challenge — Project Context

## What This Is
A mobile-first web app where users record themselves singing Carnatic ragas on camera. A slot machine randomly picks ragas, the user sings each one within a countdown timer, and at the end they get an MP4 video with all overlays and an animated end card baked in — ready to share on Instagram Reels.

## Live URL
https://kiranrajagopalan.github.io/raga-challenge/raga-challenge.html

## GitHub Repo
https://github.com/kiranrajagopalan/raga-challenge
- Active dev branch: `screen-updates` (GitHub Pages serves this branch)
- Stable branch: `main` (merge pending once screen-updates is tested)

## Tech Stack
- Pure HTML/CSS/JS — single file, no frameworks
- Canvas API for compositing video + overlays at 60fps
- MediaRecorder API for recording (WebM output)
- Cloudinary for WebM → MP4 conversion
- Web Share API for native mobile sharing

## App Flow
```
Setup Screen (pick difficulty, time, raga count)
  → Camera Permission
  → Preview Screen (see yourself, tap Start Recording)
  → 3-2-1-GO Countdown (baked into the video)
  → Challenge Loop:
      Slot machine spins → reveals raga name
      Countdown ring ticks down
      User sings → next raga
  → End Card (animated raga summary drawn on canvas, baked into video ~3.5s)
  → Results Screen (interactive raga list + stats, user reviews)
     [Background: WebM uploads to Cloudinary, MP4 blob fetched]
  → Done Screen (tap to Share via native sheet or Download)
```

## Architecture

### Single File
`raga-challenge.html` (~1155 lines) contains all CSS, HTML, and JS inline. Screens are `<div class="screen">` elements toggled via `.active` class.

### Challenge Screen Layout (3-Section)
The camera screen is divided into three fixed flex sections:
```
.cam-top    — flex 0 0 15% — raga counter / REC badge / difficulty badge (black bg)
.cam-middle — flex 0 0 55% — <video> feed; overflow:hidden clips camera to this zone
.cam-bottom — flex 0 0 30% — slot machine overlay + raga display + countdown row (black bg)
```
**CSS specificity note:** `#camera-screen` intentionally omits `display:flex` from the ID rule. If it were there, the ID-specificity `(1,0,0)` would override `.screen { display:none }` `(0,1,0)` and make the camera screen always visible. Instead, `display:flex` comes via `.screen.active` (class level), so toggling `.active` correctly shows/hides the screen.

### Canvas Recording Pipeline
1. `startRecording()` creates an offscreen `<canvas>` at `W×dpr` × `H×dpr` (dpr capped at 2× for performance)
2. `drawLoop(video, W, H, dpr)` runs at 60fps, compositing:
   - Black fills for top and bottom sections
   - Camera feed (mirrored, aspect-ratio cover) — `ctx.clip()` applied to `(0, TOP_H, W, MID_H)` before `drawImage` to mirror DOM `overflow:hidden` and prevent video bleeding outside the camera section
   - Gradient overlays (top/bottom of camera zone)
   - UI elements (raga name, counter, difficulty badge, REC indicator, countdown ring) — all hardcoded pixel values (`wH`, `IH`, `wY`, lineWidths, text offsets) scaled by `dpr`
   - Slot machine animation — reads `DOMMatrix` from `#slot-inner` CSS transform; `ty` (CSS px) multiplied by `dpr` before use in canvas coordinates
3. `captureStream(30)` pipes the canvas into a `MediaRecorder` (WebM, VP9/VP8, **8 Mbps**)
4. Audio tracks from the camera stream are added to the capture stream

### drawLoop Branches
`drawLoop()` has three early-return branches that take over the canvas:
- **Countdown** (`countdownActive`) — dark overlay + large centered 3-2-1-GO text
- **End Card** (`endCardActive`) — dark background, "Challenge Complete" header, staggered raga list animation, stats row
- **Normal** — video feed + all challenge UI elements

### Slot Machine Animation
`runSlotMachine(target, onDone)` — time-based (timestamp-driven), not frame-count-based:
- 21 items: 20 random from pool + target as item[20]
- `#slot-window` uses `align-items:flex-start` so `#slot-inner` starts at the top of the 192px window (not flex-centered, which would cause a 576px invisible offset with 1344px of content)
- Initial `translateY(64px)` puts item[0] centered in window (`192/2 - 64/2 = 64px`)
- Animates to `translateY(-1216px)` — item[last] centered (`64 - 20×64 = -1216px`)
- **Fast phase**: 768px at 20px/frame ≈ 640ms
- **Decel phase**: 512px cubic ease-out `1-(1-p)³` ≈ 1280ms
- **Total**: ~1920ms guaranteed, immune to frame rate drops

### End Card
When the challenge ends, recording continues for ~3.5s (scales with raga count). During this window, `drawLoop()` draws an animated summary card onto the canvas — each raga name fades in sequentially. The user sees the interactive results screen while this records in the background. After the end card duration, recording stops and upload begins.

### Background Processing
`processVideoInBackground()` runs while the user views the results screen:
1. Uploads WebM blob to Cloudinary (XHR with progress, 90s timeout)
2. Transforms the URL to request MP4 format
3. Fetches the MP4 blob and stores it in memory
4. When user reaches Done screen, the video is already ready — single tap to share/download

If upload fails or times out, a "Skip → Save WebM" escape button appears after 8s.

### Long-Press Pattern
The "Hold to End" button requires a 1.5s press-and-hold to prevent accidental taps. An animated fill sweep provides visual feedback during the hold.

## Key State Variables
| Variable | Purpose |
|----------|---------|
| `countdownActive` / `countdownText` | Controls 3-2-1-GO rendering on canvas |
| `endCardActive` / `endCardStart` | Controls end card recording window |
| `isRecording` / `drawRunning` | MediaRecorder lifecycle |
| `mp4Blob` / `uploadFailed` | Background processing result |
| `challengeElapsed` | Total recording time for stats display |
| `currentIdx` / `ragaList` | Challenge progress tracking |
| `secondsLeft` / `cdInterval` | Per-raga countdown timer |
| `_cdDeleteToken` | Module-scoped (not on `window`) — Cloudinary delete token received after upload |

## Security Hardening (Applied)
- `_cdDeleteToken` moved from `window._cdDeleteToken` → module-scoped `let` (not accessible to extensions or injected scripts)
- Slot machine items and results list: `innerHTML` string concatenation replaced with `createElement` + `textContent` (XSS hygiene)
- `beforeunload` handler: stops all media tracks when page is closed or refreshed mid-challenge
- **Cloudinary preset restrictions (pending in dashboard):** Set Allowed Formats (`webm,mp4`) and Folder (`raga-challenge/`) on the `forRagaChallange` preset — most important protections against abuse of the unsigned preset

## Cloudinary Setup
- Cloud name: `dfstch1ag`
- Upload preset: `forRagaChallange` (unsigned — by design; restrict in dashboard)
- URL transform: `/upload/` → `/upload/f_mp4/` for MP4 conversion
- Auto-delete via `_cdDeleteToken` after user downloads (keeps storage near zero)
- Free tier: 25 credits/month

## Raga Data
60 ragas across 3 difficulty tiers, stored in the `RAGAS` object:
- **Easy** (20): Popular ragas — Shankarabharanam, Kalyani, Bhairavi, Todi, etc.
- **Medium** (20): Similar-sounding pairs — Saveri, Pantuvarali, Suddha Saveri, etc.
- **Hard** (20): Rare & tricky — Naganandini, Chitrambari, Ramapriya, etc.

## File Structure
```
raga-challenge/
├── PROJECT.md              ← this file
├── README.md               ← minimal
└── raga-challenge.html     ← entire app (~1155 lines)
```

## Deployment
- GitHub Pages serves `screen-updates` branch (changed from `main` during active dev)
- Push via stored credentials: `git push origin screen-updates`
- After merging to main, switch Pages back to `main` branch

## What's Next
- Restrict Cloudinary upload preset in dashboard: Allowed Formats (`webm,mp4`) + Folder (`raga-challenge/`)
- Merge `screen-updates` → `main` after device testing confirms all fixes
- Rename `raga-challenge.html` → `index.html` for a cleaner live URL
- Consider adding brief raga descriptions or arohanam/avarohanam hints
- Explore landscape / desktop layout if demand exists
