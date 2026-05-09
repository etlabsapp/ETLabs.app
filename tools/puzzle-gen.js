#!/usr/bin/env node
// Total Cross — puzzle generator
// Usage: node tools/puzzle-gen.js >> apps/totalcross/puzzles.js
// (paste the output JSON objects into the PUZZLES array manually)

const letterValue = ch => ch.toUpperCase().charCodeAt(0) - 64;
const wordSum = word => [...word.toUpperCase()].reduce((s, ch) => s + letterValue(ch), 0);

class CrosswordBuilder {
  constructor(size = 22) {
    this.size = size;
    this.grid = Array.from({ length: size }, () => Array(size).fill(null));
    this.placed = [];
  }

  _cell(r, c) { return r >= 0 && r < this.size && c >= 0 && c < this.size ? this.grid[r][c] : undefined; }

  canPlace(word, row, col, dir) {
    const W = word.toUpperCase();
    const isAcross = dir === 'across';
    const len = W.length;

    if (isAcross ? col + len > this.size : row + len > this.size) return false;

    // No word must directly precede or follow
    const beforeR = isAcross ? row : row - 1;
    const beforeC = isAcross ? col - 1 : col;
    if (this._cell(beforeR, beforeC) !== null && this._cell(beforeR, beforeC) !== undefined) return false;

    const afterR = isAcross ? row : row + len;
    const afterC = isAcross ? col + len : col;
    if (this._cell(afterR, afterC) !== null && this._cell(afterR, afterC) !== undefined) return false;

    let intersections = 0;
    for (let i = 0; i < len; i++) {
      const r = isAcross ? row : row + i;
      const c = isAcross ? col + i : col;
      const existing = this.grid[r][c];

      if (existing !== null) {
        if (existing !== W[i]) return false; // conflict
        intersections++;
      } else {
        // Check perpendicular adjacency — can't touch parallel words
        const adjR1 = isAcross ? r - 1 : r;
        const adjC1 = isAcross ? c : c - 1;
        const adjR2 = isAcross ? r + 1 : r;
        const adjC2 = isAcross ? c : c + 1;
        if (this._cell(adjR1, adjC1) !== null && this._cell(adjR1, adjC1) !== undefined) return false;
        if (this._cell(adjR2, adjC2) !== null && this._cell(adjR2, adjC2) !== undefined) return false;
      }
    }

    return this.placed.length === 0 || intersections > 0;
  }

  place(word, row, col, dir) {
    const W = word.toUpperCase();
    for (let i = 0; i < W.length; i++) {
      const r = dir === 'across' ? row : row + i;
      const c = dir === 'across' ? col + i : col;
      this.grid[r][c] = W[i];
    }
    this.placed.push({ word: W, row, col, dir });
  }

  tryPlace(word, dir) {
    const W = word.toUpperCase();
    const oppDir = dir === 'across' ? 'down' : 'across';
    for (const p of this.placed) {
      if (p.dir !== oppDir) continue;
      for (let i = 0; i < W.length; i++) {
        for (let j = 0; j < p.word.length; j++) {
          if (W[i] !== p.word[j]) continue;
          const row = dir === 'across' ? (p.row + j) : (p.row - i);
          const col = dir === 'across' ? (p.col - i) : (p.col + j);
          if (row < 1 || col < 1 || row >= this.size - 1 || col >= this.size - 1) continue;
          if (this.canPlace(W, row, col, dir)) {
            this.place(W, row, col, dir);
            return true;
          }
        }
      }
    }
    return false;
  }

  build(acrossWords, downWords) {
    const mid = Math.floor(this.size / 2);
    const first = acrossWords[0].toUpperCase();
    const startCol = Math.max(1, Math.floor((this.size - first.length) / 2));
    this.place(first, mid, startCol, 'across');

    const aQueue = [...acrossWords.slice(1)];
    const dQueue = [...downWords];
    let aSkip = 0, dSkip = 0;

    while ((aQueue.length - aSkip > 0 || dQueue.length - dSkip > 0)) {
      let progress = false;
      for (let i = dSkip; i < dQueue.length; i++) {
        if (this.tryPlace(dQueue[i], 'down')) {
          dQueue.splice(i, 1);
          progress = true;
          break;
        }
      }
      for (let i = aSkip; i < aQueue.length; i++) {
        if (this.tryPlace(aQueue[i], 'across')) {
          aQueue.splice(i, 1);
          progress = true;
          break;
        }
      }
      if (!progress) break;
    }
    return this.placed.length;
  }

  toPuzzle(id, acrossTheme, downTheme) {
    if (this.placed.length < 4) return null;
    let minR = this.size, maxR = 0, minC = this.size, maxC = 0;
    for (const { row, col, word, dir } of this.placed) {
      minR = Math.min(minR, row);
      maxR = Math.max(maxR, dir === 'across' ? row : row + word.length - 1);
      minC = Math.min(minC, col);
      maxC = Math.max(maxC, dir === 'across' ? col + word.length - 1 : col);
    }

    const rows = maxR - minR + 1;
    const cols = maxC - minC + 1;
    const grid = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => this.grid[r + minR][c + minC] !== null ? 1 : 0)
    );

    // Assign display numbers
    const starts = {};
    let num = 1;
    const wordObjs = this.placed.map(p => ({ ...p, row: p.row - minR, col: p.col - minC }));
    [...wordObjs].sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col).forEach(w => {
      const key = `${w.row},${w.col}`;
      if (!starts[key]) starts[key] = num++;
    });

    const words = wordObjs.map(p => {
      const key = `${p.row},${p.col}`;
      const n = starts[key];
      return {
        id: `${n}${p.dir === 'across' ? 'A' : 'D'}`,
        direction: p.dir,
        row: p.row,
        col: p.col,
        length: p.word.length,
        answer: p.word,
        sum: wordSum(p.word),
      };
    });

    return { id, acrossTheme, downTheme, grid, words };
  }
}

// ── MODERN PUZZLE DEFINITIONS ───────────────────────────────

const PUZZLES_TO_GEN = [
  {
    acrossTheme: 'Pop Stars',
    downTheme: 'Dance Moves',
    across: ['ADELE','DRAKE','LIZZO','USHER','BEYONCE','RIHANNA','BILLIE','LORDE'],
    down:   ['TWERK','WALTZ','ROBOT','SLIDE','WAVE','SHUFFLE','JIVE','FLOSS'],
  },
  {
    acrossTheme: '90s Movies',
    downTheme: 'Pizza Toppings',
    across: ['CLUELESS','SCREAM','FARGO','SPEED','HEAT','BRAVEHEART','TITANIC'],
    down:   ['OLIVE','BACON','ONION','PEPPER','GARLIC','MUSHROOM','CHEESE'],
  },
  {
    acrossTheme: 'Video Games',
    downTheme: 'Colors',
    across: ['MARIO','ZELDA','SONIC','HALO','DOOM','TETRIS','PORTAL','MINECRAFT'],
    down:   ['SCARLET','INDIGO','TEAL','AMBER','CORAL','VIOLET','OLIVE','AZURE'],
  },
  {
    acrossTheme: 'Marvel Heroes',
    downTheme: 'Cocktails',
    across: ['THOR','HULK','VISION','FALCON','ANTMAN','IRONMAN','SPIDERMAN'],
    down:   ['MOJITO','GIMLET','COSMO','NEGRONI','DAIQUIRI','SPRITZ','SLING'],
  },
  {
    acrossTheme: 'Streaming Shows',
    downTheme: 'Fast Food',
    across: ['OZARK','COBRA','SUITS','SQUID','FLEABAG','SUCCESSION','BRIDGERTON'],
    down:   ['SUBWAY','WENDYS','CHIPOTLE','SONIC','ARBYS','PANERA','PANDA'],
  },
  {
    acrossTheme: 'Social Media',
    downTheme: 'Emojis',
    across: ['TIKTOK','REDDIT','SNAP','TWITTER','DISCORD','TWITCH','PINTEREST'],
    down:   ['HEART','FLAME','STAR','LAUGH','CROWN','GHOST','ROCKET','WAVE'],
  },
  {
    acrossTheme: 'Sports Teams',
    downTheme: 'Cities',
    across: ['LAKERS','YANKEES','EAGLES','RANGERS','CELTICS','RAIDERS','BULLS'],
    down:   ['MIAMI','DALLAS','DENVER','BOSTON','PHOENIX','AUSTIN','SEATTLE'],
  },
  {
    acrossTheme: 'Music Genres',
    downTheme: 'Instruments',
    across: ['BLUEGRASS','CLASSICAL','REGGAE','COUNTRY','GOSPEL','TECHNO','GRUNGE'],
    down:   ['BANJO','CELLO','VIOLIN','TRUMPET','GUITAR','CLARINET','UKULELE'],
  },
  {
    acrossTheme: 'Snack Foods',
    downTheme: 'Superheroes',
    across: ['OREO','DORITOS','PRINGLES','CHEETOS','SKITTLES','TWIX','REESE'],
    down:   ['BATMAN','ROBIN','FLASH','AQUAMAN','CYBORG','ARROW','SHAZAM'],
  },
  {
    acrossTheme: 'TV Cartoons',
    downTheme: 'Weather',
    across: ['SIMPSONS','FUTURAMA','ARCHER','BOBS','RICK','FAMILY','SOUTH'],
    down:   ['STORM','SLEET','FROST','DRIZZLE','HAIL','THUNDER','CLOUDY'],
  },
];

// ── GENERATE ────────────────────────────────────────────────

const results = [];
let startId = 56; // append after existing 56 puzzles (0-55)

PUZZLES_TO_GEN.forEach((def, i) => {
  const builder = new CrosswordBuilder(25);
  builder.build(def.across, def.down);
  const puzzle = builder.toPuzzle(startId + i, def.acrossTheme, def.downTheme);
  if (puzzle) {
    results.push(puzzle);
    process.stderr.write(`✓ ${def.acrossTheme} / ${def.downTheme} — ${puzzle.words.length} words placed\n`);
  } else {
    process.stderr.write(`✗ ${def.acrossTheme} / ${def.downTheme} — too few words, skipped\n`);
  }
});

process.stdout.write(JSON.stringify(results, null, 2) + '\n');
