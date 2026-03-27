# Raga Challenge — Claude Context

> For stable architecture, tech stack, app flow, and Cloudinary setup see `PROJECT.md`.
> This file tracks current development state, recent decisions, and session continuity.

---

## Active Branch
`main` — GitHub Pages serves this branch directly.

Live URL: https://kiranrajagopalan.github.io/raga-challenge/raga-challenge.html

---

## Current State (as of 2026-03-28)

**Video sharing works on iOS Safari and Chrome Android.** All features are complete.
Current build: `APP_BUILD = '20260328-b35'`

---

## Video Pipeline Architecture (b34+)

### Recording
- **iOS Safari**: records MP4 (`video/mp4;codecs=avc1,mp4a.40.2`) — native fMP4
- **Android/Desktop Chrome**: records WebM (`video/webm;codecs=vp9,opus`) — Chrome can't produce usable MP4
- Bitrate: 5 Mbps video, 128 kbps audio on all platforms

### Processing — two paths in `processVideoInBackground()`

**Path A — iOS** (Cloudinary only):
1. Upload fMP4 to Cloudinary
2. Fetch Cloudinary's transformed MP4 (`vc_h264:baseline:3.1,ac_aac,af_44100,br_4m`)
3. Share as-is — WhatsApp iOS re-encodes all incoming videos, so fMP4 is fine

**Path B — Android/Desktop** (Cloudinary + client-side remux):
1. Upload WebM to Cloudinary (server-side VP9→H264 transcode)
2. Fetch Cloudinary's fMP4 output (H264 Baseline + AAC, but fragmented)
3. Client-side remux fMP4 → flat MP4 via custom parser + mp4-muxer
4. Share flat MP4 — WhatsApp Android requires flat MP4 (`ftyp→moov→mdat`)

### Why Baseline profile matters
Cloudinary transform uses `vc_h264:baseline:3.1` — Baseline has zero B-frames, so PTS=DTS.
High profile (default `vc_h264`) uses B-frames with out-of-order PTS, which corrupts video
when the remuxer feeds samples in decode order without proper composition time offsets.

### Custom fMP4 parser (replaces mp4box.js)
`remuxToFlatMp4(fmp4Blob)` — ~130 lines of binary MP4 box parsing:
- Parses moov (tkhd, mdhd, hdlr, stsd with avcC/esds), mvex/trex defaults
- Parses moof+mdat pairs (tfhd+trun for per-sample size/duration/flags)
- Feeds extracted samples to mp4-muxer for flat MP4 output

### Web Share API
- Uses `navigator.share({files:[file]})` — files only, no title/text (combining them drops files on Chrome Android)
- Skips `canShare()` guard (returns false with valid files on some Chrome versions)
- Falls back to DOM-attached `<a>` download, then direct Cloudinary URL download

---

## CDN Scripts (in `<head>`)
```html
<script src="https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.2/build/mp4-muxer.min.js"></script>
<script src="https://unpkg.com/@phosphor-icons/web@2.1.1"></script>
```

## Key Functions (index.html)
- **`remuxToFlatMp4(fmp4Blob)`** — custom fMP4 parser + mp4-muxer flat MP4 writer
- **`processVideoInBackground()`** — entry point; routes iOS vs Android pipeline
- **`shareOrDownload()`** — Web Share API → download fallback chain
- **`uploadToCloudinary(blob)`** — unsigned upload to Cloudinary
- **`cleanupCloudinary()`** — deletes uploaded file via delete_token after sharing

## Key Globals
```js
let nativeMp4;        // true if MediaRecorder supports video/mp4 (iOS Safari)
let finalBlob;        // raw MediaRecorder output (fMP4 on iOS, WebM on Android)
let mp4Blob;          // processed flat MP4 ready for sharing (or null if pipeline failed)
let mp4DirectUrl;     // Cloudinary transform URL (fallback download source)
let uploadFailed;     // true → download-only mode
let processingStarted;// once-gate for processVideoInBackground
```

---

## Done Screen — Full Feature Set

The done screen (`#done-screen`) is complete and polished.

### Layout
- `#done-screen` is `display:flex; flex-direction:column`
- `.done-scroll` — `flex:1; overflow-y:auto; padding:6% 8% 12%`
- `.done-actions` — `flex-shrink:0` sticky bar at bottom

### Pun Titles (`DONE_TITLES` array)
Carnatic raga puns, set randomly by `showResultsScreen()`. Uses `\u2011` (non-breaking hyphen). Falls back to `'Better luck next time!'` when `currentIdx === 0`. CSS: `.done-title { hyphens:none; }`.

### Stats boxes
2 stat boxes: **Ragas** (`#stat-ragas`) and **Difficulty** (`#stat-diff`). Duration stat intentionally removed.
Long mode labels get `.is-text` class: `if(mLabel.length > 5) diffEl.classList.add('is-text');`

### Feedback strip (`#feedback-strip`)
Four states: **Ambient** → **Prominent** (after share) → **Chips** (after reaction) → **Done**.
Auto-submits chips 1.8s after last tap. Backend: FormSubmit.co → kiranrajgopal@gmail.com.

---

## Canvas Recording Architecture

**Event-driven, no DOM polling.**

Key globals: `slotOffset`, `slotSpinning`, `ragaRevealAt`, `ragaRevealName`
- `notifyCanvasSlotStarted()` — sets `slotSpinning=true`
- `notifyCanvasSlotSettled(name)` — sets `slotSpinning=false`, `ragaRevealAt=performance.now()`

`ITEM_H=53`, `IH=Math.round(160/3)=53`, `finalY = -(N-1)*ITEM_H`, `fs(s) = Math.round(W*s)`

---

## Pending Tasks

1. **FormSubmit activation** — trigger one real feedback submission, click activation email
2. **Optional:** Rename `raga-challenge.html` → `index.html` for cleaner URL

---

## Deployment
```bash
git push origin main   # GitHub Pages auto-deploys from main (~1 min)
```
