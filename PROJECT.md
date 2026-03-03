# Raga Challenge — Project Context

## What This Is
A mobile-first web app where users record themselves singing Carnatic ragas on camera. A slot machine randomly picks ragas, the user sings each one within a countdown timer, and at the end they get an MP4 video with all overlays and an animated end card baked in — ready to share on Instagram Reels.

## Live URL
https://kiranrajagopalan.github.io/raga-challenge/raga-challenge.html

## GitHub Repo
https://github.com/kiranrajagopalan/raga-challenge
- Branch: `main`
- Hosting: GitHub Pages

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
`raga-challenge.html` (~1098 lines) contains all CSS, HTML, and JS inline. Screens are `<div class="screen">` elements toggled via `.active` class.

### Canvas Recording Pipeline
1. `startRecording()` creates an offscreen `<canvas>` matching app dimensions
2. `drawLoop(video, W, H)` runs at 60fps, compositing:
   - Camera feed (mirrored, aspect-ratio cover)
   - Gradient overlays (top/bottom)
   - UI elements (raga name, counter, difficulty badge, REC indicator, countdown ring)
   - Slot machine animation (reads DOM transform for position sync)
3. `captureStream(30)` pipes the canvas into a `MediaRecorder` (WebM, VP9/VP8, 6Mbps)
4. Audio tracks from the camera stream are added to the capture stream

### drawLoop Branches
`drawLoop()` has three early-return branches that take over the canvas:
- **Countdown** (`countdownActive`) — dark overlay + large centered 3-2-1-GO text
- **End Card** (`endCardActive`) — dark background, "Challenge Complete" header, staggered raga list animation, stats row
- **Normal** — video feed + all challenge UI elements

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

## Cloudinary Setup
- Cloud name: `dfstch1ag`
- Upload preset: `forRagaChallange` (unsigned)
- URL transform: `/upload/` → `/upload/f_mp4/` for MP4 conversion
- Auto-delete via `delete_token` after user downloads (keeps storage near zero)
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
└── raga-challenge.html     ← entire app (~1098 lines)
```

## Deployment
- GitHub Pages serves `main` branch
- Push via Personal Access Token: `git push https://<PAT>@github.com/kiranrajagopalan/raga-challenge.git main`

## What's Next
- Rename `raga-challenge.html` → `index.html` for a cleaner live URL
- Consider adding brief raga descriptions or arohanam/avarohanam hints
- Explore landscape / desktop layout if demand exists
