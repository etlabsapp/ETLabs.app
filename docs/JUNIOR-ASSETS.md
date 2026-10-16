# ET Labs Junior coming-soon assets

Drop Design's files into `/assets/junior/` with these exact names. No markup change is needed.

| Where | Files |
|---|---|
| `/junior/` hero (16:9) | `junior-coming-soon-wide.webm`, `junior-coming-soon-wide.mp4`, `junior-coming-soon-wide-poster.png` |
| Home + products cards (square, shown in a 390:475 frame with `object-fit: contain`) | `junior-coming-soon-square.webm`, `junior-coming-soon-square.mp4`, `junior-coming-soon-square-poster.png` |

- Light theme only, warm ivory background `#FBF4E4` (the frame is filled with that color, so letterboxing blends in).
- Video: muted, seamless loop, no audio track needed. WebM (VP9) is tried first, then MP4 (H.264, yuv420p).
- Poster: the static frame shown before playback and as the only image when `prefers-reduced-motion: reduce` is on.
- Until the files exist, the CSS placeholder (typed "Junior" lockup + CSS "Coming soon" stamp, in `junior.css`) stays visible; the video is only revealed after it loads (`junior.js`).
