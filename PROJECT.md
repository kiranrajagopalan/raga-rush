# Raga Challenge — Project Reference

> Stable architecture, tech stack, app flow. For current dev state see `CLAUDE.md`.

## What
Mobile-first web app. User records themselves singing Carnatic ragas on camera. Slot machine picks ragas, countdown timer runs, result is a shareable MP4 video with all overlays baked in.

## URLs
- **Live:** https://kiranrajagopalan.github.io/raga-challenge/raga-challenge.html
- **Repo:** https://github.com/kiranrajagopalan/raga-challenge
- **Branch:** `main` (GitHub Pages serves directly)

## Tech Stack
- Single HTML file (`raga-challenge.html`) — no frameworks, no build step
- Canvas API — composites camera + UI overlays at 30fps
- MediaRecorder API — iOS records MP4, Android records WebM
- Cloudinary — server-side transcode + H.264 encoding
- mp4-muxer@5.2.2 — client-side fMP4→flat MP4 remux (Android path)
- Web Share API — native share sheet with file attachment
- Phosphor Icons@2.1.1 (CDN)
- FormSubmit.co + optional Google Sheets endpoint for feedback

## App Flow
```
Setup → Camera Permission → Preview → 3-2-1-GO Countdown
→ Challenge Loop (slot spin → raga reveal → sing → countdown → next)
→ End Card (animated summary, ~3.5s, baked into video)
→ Results Screen (interactive raga list + stats)
  [Background: upload → Cloudinary transcode → remux → MP4 ready]
→ Done Screen (Share Video / download)
```

## File Structure
```
raga-challenge/
├── PROJECT.md              ← this file (stable reference)
├── CLAUDE.md               ← current dev state + session handoff
├── DIFFICULTY-MODES.md     ← raga pools, mode logic, Surprise Me themes
├── README.md               ← minimal
└── raga-challenge.html     ← entire app (~95KB)
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

## Video Pipeline (b34+)

### Recording
| Platform | Format | Codec | Bitrate |
|----------|--------|-------|---------|
| iOS Safari | MP4 (fMP4) | H.264 + AAC | 5 Mbps video, 128k audio |
| Android/Desktop Chrome | WebM | VP9 + Opus | 5 Mbps video, 128k audio |

### Processing — dual path in `processVideoInBackground()`

**iOS path:** Upload fMP4 → Cloudinary transform → share as-is (WhatsApp iOS re-encodes everything)

**Android path:** Upload WebM → Cloudinary transform → fetch fMP4 → client-side `remuxToFlatMp4()` → flat MP4 → share (WhatsApp Android requires flat MP4: `ftyp→moov→mdat`)

### Why this architecture
- WhatsApp Android rejects fMP4 (fragmented MP4 with `moof+mdat` boxes)
- Cloudinary always outputs fMP4, even with `f_mp4`
- Client-side custom parser extracts samples from fMP4, mp4-muxer writes flat MP4
- Must use `vc_h264:baseline:3.1` — Baseline has no B-frames (PTS=DTS). High profile B-frames corrupt video during remux
- Chrome Android's `isTypeSupported('video/mp4')` lies on some devices (produces audio-only fMP4) — always use WebM on non-iOS

### Web Share API quirks
- `navigator.share({files:[file]})` — files ONLY, no title/text (combining drops files on Chrome Android)
- Skip `canShare()` guard — returns false with valid files on some Chrome versions
- Fallback chain: share → DOM `<a>` download → direct Cloudinary URL download

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
| `nativeMp4` | `true` if MediaRecorder supports video/mp4 (iOS Safari) |
| `finalBlob` | Raw MediaRecorder output (fMP4 on iOS, WebM on Android) |
| `mp4Blob` | Processed flat MP4 ready for sharing (null if pipeline failed) |
| `mp4DirectUrl` | Cloudinary transform URL (fallback download source) |
| `uploadFailed` | `true` → download-only mode |
| `processingStarted` | Once-gate for `processVideoInBackground` |
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
