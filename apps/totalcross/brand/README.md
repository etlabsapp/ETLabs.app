# Total Cross — Brand Package v1

A 5×5 crossword logo. **TOTAL** across, **CROSS** down, intersecting at a red **O**.

## What's inside

```
brand/
├── guidelines.html         ← open this first (full brand doc, in browser)
├── README.md               ← you are here
├── logos/
│   ├── svg/
│   │   ├── totalcross-mark-light.svg          (primary)
│   │   ├── totalcross-mark-dark.svg
│   │   ├── totalcross-mark-mono.svg
│   │   ├── totalcross-mark-reverse.svg
│   │   └── totalcross-mark-light-clearspace.svg
│   └── png/
│       ├── totalcross-mark-light-{256,512,1024,2048}.png
│       ├── totalcross-mark-dark-{1024,2048}.png
│       ├── totalcross-mark-mono-1024.png
│       ├── totalcross-mark-reverse-{1024,2048}.png
│       └── favicon-{32, apple-touch-180, 512, dark-512}.png
└── tokens/
    ├── colors.json
    └── colors.css
```

## Quick rules

- **Variants:** light (default), dark, mono (single-ink), reverse (on Signal Red).
- **Clearspace:** one full empty cell on every side of the grid.
- **Min size:** 24px tall on screen, 12mm in print.
- **Don't** stretch, recolor non-O cells, gradient, drop-shadow, or rotate.
- **Type:** Archivo 800 (display + cells), Fraunces 700 (editorial), JetBrains Mono (metadata).

## Colors

| Name       | Hex       | Role                                    |
| ---------- | --------- | --------------------------------------- |
| Signal Red | `#D7321F` | The pivot. Shared O only. Never elsewhere in the mark. |
| Grid Ink   | `#14110D` | Cell stroke + primary type.             |
| Cell White | `#FFFFFF` | Lettered cells on light variant.        |
| Paper      | `#F3EFE9` | Off-white surface (not a logo color).   |

## Notes on the SVG files

- All SVGs reference Archivo 800 via Google Fonts. If you need the mark to render without an internet connection (e.g. embedded in a PDF), use the matching PNG export, or convert the `<text>` elements to outlined paths in your editor of choice.
- Rendered PNGs use Arial Black (a robust system equivalent) so they're identical-feeling on any machine.

— v1 · 2026
