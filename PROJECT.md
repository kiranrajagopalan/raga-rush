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
`raga-challenge.html` contains all CSS, HTML, and JS inline. Screens are `<div class="screen">` elements toggled via `.active` class.

### Challenge Screen Layout (3-Section)
```
.cam-top    — flex 0 0 15% — raga counter / REC badge / difficulty badge (black bg)
.cam-middle — flex 0 0 55% — <video> feed; overflow:hidden clips camera to this zone
.cam-bottom — flex 0 0 30% — slot machine overlay + raga display + countdown row (black bg)
```
**CSS specificity note:** `#camera-screen` intentionally omits `display:flex` from the ID rule. If it were there, the ID-specificity `(1,0,0)` would override `.screen { display:none }` `(0,1,0)` and make the camera screen always visible. Instead, `display:flex` comes via `.screen.active`, so toggling `.active` correctly shows/hides the screen.

### Canvas Recording Pipeline
Offscreen canvas at `W×dpr` × `H×dpr` (dpr capped at 2×, 8 Mbps). `drawLoop()` composites camera feed (clipped to middle section via `ctx.clip()`), black fills, gradient overlays, and all UI elements — scaled by dpr. Has three branches: countdown (3-2-1-GO), end card (animated raga list), and normal challenge UI. Slot machine `ty` (CSS px) must be multiplied by dpr before use in canvas coordinates.

### Long-Press Pattern
"Hold to End" requires a 1.5s press-and-hold to prevent accidental taps. Animated fill sweep provides visual feedback.

## Raga Data
150+ ragas across Easy / Medium / Hard tiers. See `DIFFICULTY-MODES.md` for pool sizes, mode logic, and all 12 Surprise Me themes.

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
- `_cdDeleteToken` moved from `window._cdDeleteToken` → module-scoped `let`
- Slot machine items and results list: `innerHTML` replaced with `createElement` + `textContent`
- `beforeunload` handler stops all media tracks on page close/refresh
- Cloudinary preset restrictions: Allowed Formats (`webm,mp4`) and Folder (`raga-challenge/`) set on `forRagaChallange` preset

## Cloudinary Setup
- Cloud name: `dfstch1ag`
- Upload preset: `forRagaChallange` (unsigned — restrict in dashboard)
- URL transform: `/upload/` → `/upload/f_mp4/` for MP4 conversion
- Auto-delete via `_cdDeleteToken` after user downloads
- Free tier: 25 credits/month

## File Structure
```
raga-challenge/
├── PROJECT.md              ← this file
├── DIFFICULTY-MODES.md     ← source of truth for modes and Surprise Me themes
├── README.md               ← minimal
└── raga-challenge.html     ← entire app
```

## Deployment
- GitHub Pages serves `screen-updates` branch
- Push: `git push origin screen-updates`
- After merging to main, switch Pages back to `main`

## What's Next
- Merge `screen-updates` → `main` after device testing
- Rename `raga-challenge.html` → `index.html` for a cleaner live URL
- Consider raga descriptions / arohanam-avarohanam hints
