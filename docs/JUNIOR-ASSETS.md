# ET Labs Junior coming-soon assets

**Status: delivered (Design, final, Oct 16 2026).** Design's 5.6 s seamless loops are in `/assets/junior/`.

| Where | Files used |
|---|---|
| `/products/junior/` hero (16:9) | `junior-coming-soon-wide.mp4`, `junior-coming-soon-wide-poster.png` |
| Home + products cards (square, shown in a 390:475 frame with `object-fit: contain`) | `junior-coming-soon-square.mp4`, `junior-coming-soon-square-poster.png` |

`/junior/` 301-redirects to `/products/junior/`.

## MP4 only (why there's no WebM source)
- The `<video>` elements reference **only the MP4** (H.264, yuv420p, baked onto `#FBF4E4`).
- The WebM (VP9) files are kept in `/assets/junior/` but aren't referenced.
- Why: iOS Safari plays VP9 WebM but **ignores its alpha channel**, so the transparent areas rendered as a **solid black square** on iPhone. The MP4 has the ivory background baked in, so it looks the same in every browser.
- Don't add the WebM back as a `<source>` unless it's re-encoded without alpha (or with HEVC-with-alpha for Safari).

## Markup and behavior
- `<video autoplay muted loop playsinline preload="auto" poster="…-poster.png">` with a single MP4 `<source>`.
- Keep the poster: the loop's first frame is nearly blank on purpose.
- `.jr-media`, `.jr-video` and `.jr-poster` all have `background:#FBF4E4`, so nothing paints black or transparent while loading.
- `prefers-reduced-motion: reduce`: the video is removed and only the poster image is shown (`junior.js`).
- Fallback: the CSS placeholder (typed "Junior" lockup + CSS "Coming soon" stamp, in `junior.css`) is hidden once the poster or video loads. It stays only if the media fails.
- Light theme only.
