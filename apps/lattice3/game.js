import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── Puzzle Data ───────────────────────────────────────────────────────────────

const PUZZLES = [
  {
    id: 'starter-cube',
    title: 'Starter Cube',
    difficulty: 'Easy',
    dimensions: { x: 3, y: 3, z: 3 },
    cells: [
      {coord:{x:0,y:0,z:0},s:'B'},{coord:{x:1,y:0,z:0},s:'O'},{coord:{x:2,y:0,z:0},s:'W'},
      {coord:{x:0,y:1,z:0},s:'A'},{coord:{x:1,y:1,z:0},s:'R'},{coord:{x:2,y:1,z:0},s:'E'},
      {coord:{x:0,y:2,z:0},s:'G'},{coord:{x:1,y:2,z:0},s:'E'},{coord:{x:2,y:2,z:0},s:'T'},
      {coord:{x:0,y:0,z:1},s:'A'},{coord:{x:1,y:0,z:1},s:'I'},{coord:{x:2,y:0,z:1},s:'D'},
      {coord:{x:0,y:1,z:1},s:'N'},{coord:{x:1,y:1,z:1},s:'I'},{coord:{x:2,y:1,z:1},s:'T'},
      {coord:{x:0,y:2,z:1},s:'K'},{coord:{x:1,y:2,z:1},s:'E'},{coord:{x:2,y:2,z:1},s:'G'},
      {coord:{x:0,y:0,z:2},s:'T'},{coord:{x:1,y:0,z:2},s:'E'},{coord:{x:2,y:0,z:2},s:'N'},
      {coord:{x:0,y:1,z:2},s:'G'},{coord:{x:1,y:1,z:2},s:'I'},{coord:{x:2,y:1,z:2},s:'N'},
      {coord:{x:0,y:2,z:2},s:'S'},{coord:{x:1,y:2,z:2},s:'E'},{coord:{x:2,y:2,z:2},s:'W'},
    ],
    words: [
      {id:'x1',axis:'x',num:1,clue:'Ribbon tied in loops',coords:[{x:0,y:0,z:0},{x:1,y:0,z:0},{x:2,y:0,z:0}],answer:'BOW'},
      {id:'x2',axis:'x',num:2,clue:'Exist',coords:[{x:0,y:1,z:0},{x:1,y:1,z:0},{x:2,y:1,z:0}],answer:'ARE'},
      {id:'x3',axis:'x',num:3,clue:'Obtain',coords:[{x:0,y:2,z:0},{x:1,y:2,z:0},{x:2,y:2,z:0}],answer:'GET'},
      {id:'x4',axis:'x',num:4,clue:'Help or assistance',coords:[{x:0,y:0,z:1},{x:1,y:0,z:1},{x:2,y:0,z:1}],answer:'AID'},
      {id:'x5',axis:'x',num:5,clue:'Louse egg',coords:[{x:0,y:1,z:1},{x:1,y:1,z:1},{x:2,y:1,z:1}],answer:'NIT'},
      {id:'x6',axis:'x',num:6,clue:'Small barrel',coords:[{x:0,y:2,z:1},{x:1,y:2,z:1},{x:2,y:2,z:1}],answer:'KEG'},
      {id:'x7',axis:'x',num:7,clue:'Number after nine',coords:[{x:0,y:0,z:2},{x:1,y:0,z:2},{x:2,y:0,z:2}],answer:'TEN'},
      {id:'x8',axis:'x',num:8,clue:'Juniper spirit',coords:[{x:0,y:1,z:2},{x:1,y:1,z:2},{x:2,y:1,z:2}],answer:'GIN'},
      {id:'x9',axis:'x',num:9,clue:'Stitch with needle and thread',coords:[{x:0,y:2,z:2},{x:1,y:2,z:2},{x:2,y:2,z:2}],answer:'SEW'},
      {id:'y1',axis:'y',num:1,clue:'Carry-all container',coords:[{x:0,y:0,z:0},{x:0,y:1,z:0},{x:0,y:2,z:0}],answer:'BAG'},
      {id:'y2',axis:'y',num:2,clue:'Mineral deposit',coords:[{x:1,y:0,z:0},{x:1,y:1,z:0},{x:1,y:2,z:0}],answer:'ORE'},
      {id:'y3',axis:'y',num:3,clue:'Soaked through',coords:[{x:2,y:0,z:0},{x:2,y:1,z:0},{x:2,y:2,z:0}],answer:'WET'},
      {id:'z1',axis:'z',num:1,clue:'Flying mammal',coords:[{x:0,y:0,z:0},{x:0,y:0,z:1},{x:0,y:0,z:2}],answer:'BAT'},
    ],
  },
  {
    id: 'word-forge',
    title: 'Word Forge',
    difficulty: 'Standard',
    dimensions: { x: 3, y: 3, z: 3 },
    cells: [
      {coord:{x:0,y:0,z:0},s:'C'},{coord:{x:1,y:0,z:0},s:'A'},{coord:{x:2,y:0,z:0},s:'T'},
      {coord:{x:0,y:1,z:0},s:'O'},{coord:{x:1,y:1,z:0},s:'N'},{coord:{x:2,y:1,z:0},s:'E'},
      {coord:{x:0,y:2,z:0},s:'P'},{coord:{x:1,y:2,z:0},s:'E'},{coord:{x:2,y:2,z:0},s:'A'},
      {coord:{x:0,y:0,z:1},s:'H'},{coord:{x:1,y:0,z:1},s:'A'},{coord:{x:2,y:0,z:1},s:'M'},
      {coord:{x:0,y:1,z:1},s:'O'},{coord:{x:1,y:1,z:1},s:'W'},{coord:{x:2,y:1,z:1},s:'L'},
      {coord:{x:0,y:2,z:1},s:'S'},{coord:{x:1,y:2,z:1},s:'E'},{coord:{x:2,y:2,z:1},s:'T'},
      {coord:{x:0,y:0,z:2},s:'P'},{coord:{x:1,y:0,z:2},s:'A'},{coord:{x:2,y:0,z:2},s:'N'},
      {coord:{x:0,y:1,z:2},s:'I'},{coord:{x:1,y:1,z:2},s:'N'},{coord:{x:2,y:1,z:2},s:'K'},
      {coord:{x:0,y:2,z:2},s:'Y'},{coord:{x:1,y:2,z:2},s:'E'},{coord:{x:2,y:2,z:2},s:'W'},
    ],
    words: [
      {id:'x1',axis:'x',num:1,clue:'Feline pet',coords:[{x:0,y:0,z:0},{x:1,y:0,z:0},{x:2,y:0,z:0}],answer:'CAT'},
      {id:'x2',axis:'x',num:2,clue:'Single unit',coords:[{x:0,y:1,z:0},{x:1,y:1,z:0},{x:2,y:1,z:0}],answer:'ONE'},
      {id:'x3',axis:'x',num:3,clue:'Green garden pod',coords:[{x:0,y:2,z:0},{x:1,y:2,z:0},{x:2,y:2,z:0}],answer:'PEA'},
      {id:'x4',axis:'x',num:4,clue:'Cured pork',coords:[{x:0,y:0,z:1},{x:1,y:0,z:1},{x:2,y:0,z:1}],answer:'HAM'},
      {id:'x5',axis:'x',num:5,clue:'Nocturnal bird',coords:[{x:0,y:1,z:1},{x:1,y:1,z:1},{x:2,y:1,z:1}],answer:'OWL'},
      {id:'x6',axis:'x',num:6,clue:'Group of matched items',coords:[{x:0,y:2,z:1},{x:1,y:2,z:1},{x:2,y:2,z:1}],answer:'SET'},
      {id:'x7',axis:'x',num:7,clue:'Cooking vessel',coords:[{x:0,y:0,z:2},{x:1,y:0,z:2},{x:2,y:0,z:2}],answer:'PAN'},
      {id:'x8',axis:'x',num:8,clue:'Pen fluid',coords:[{x:0,y:1,z:2},{x:1,y:1,z:2},{x:2,y:1,z:2}],answer:'INK'},
      {id:'x9',axis:'x',num:9,clue:'Evergreen tree',coords:[{x:0,y:2,z:2},{x:1,y:2,z:2},{x:2,y:2,z:2}],answer:'YEW'},
      {id:'y1',axis:'y',num:1,clue:'Police officer',coords:[{x:0,y:0,z:0},{x:0,y:1,z:0},{x:0,y:2,z:0}],answer:'COP'},
      {id:'y2',axis:'y',num:2,clue:'Hot brewed drink',coords:[{x:2,y:0,z:0},{x:2,y:1,z:0},{x:2,y:2,z:0}],answer:'TEA'},
      {id:'y3',axis:'y',num:3,clue:'Filled with wonder',coords:[{x:1,y:0,z:1},{x:1,y:1,z:1},{x:1,y:2,z:1}],answer:'AWE'},
      {id:'z1',axis:'z',num:1,clue:'Large antlered animal',coords:[{x:2,y:1,z:0},{x:2,y:1,z:1},{x:2,y:1,z:2}],answer:'ELK'},
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function ck(c) { return `${c.x},${c.y},${c.z}`; }
function eq(a, b) { return a.x === b.x && a.y === b.y && a.z === b.z; }

// ── PuzzleEngine ──────────────────────────────────────────────────────────────

class PuzzleEngine {
  constructor(puzzle) {
    this.puzzle = puzzle;
    this._coordWords = new Map();   // key → WordEntry[]
    this._coordAxis  = new Map();   // "key:axis" → WordEntry

    for (const word of puzzle.words) {
      for (const coord of word.coords) {
        const k = ck(coord);
        if (!this._coordWords.has(k)) this._coordWords.set(k, []);
        this._coordWords.get(k).push(word);
        this._coordAxis.set(`${k}:${word.axis}`, word);
      }
    }
  }

  wordsForCell(coord)           { return this._coordWords.get(ck(coord)) ?? []; }
  wordForCellAxis(coord, axis)  { return this._coordAxis.get(`${ck(coord)}:${axis}`) ?? null; }
  validAxes(coord)              { return this.wordsForCell(coord).map(w => w.axis); }

  startsAt(coord) {
    return this.wordsForCell(coord)
      .filter(w => eq(w.coords[0], coord))
      .map(w => `${w.axis.toUpperCase()}${w.num}`);
  }

  idxInWord(word, coord) { return word.coords.findIndex(c => eq(c, coord)); }

  nextCell(word, coord) {
    const i = this.idxInWord(word, coord);
    return (i >= 0 && i + 1 < word.coords.length) ? word.coords[i + 1] : null;
  }

  prevCell(word, coord) {
    const i = this.idxInWord(word, coord);
    return i > 0 ? word.coords[i - 1] : null;
  }

  firstEmpty(word, entries) {
    return word.coords.find(c => !entries.get(ck(c))) ?? null;
  }

  nextEmpty(word, coord, entries) {
    const start = this.idxInWord(word, coord);
    for (let i = start + 1; i < word.coords.length; i++) {
      if (!entries.get(ck(word.coords[i]))) return word.coords[i];
    }
    for (let i = 0; i < start; i++) {
      if (!entries.get(ck(word.coords[i]))) return word.coords[i];
    }
    return null;
  }

  isSolved(entries) {
    return this.puzzle.cells.every(cell => {
      const v = entries.get(ck(cell.coord));
      return v && v.toUpperCase() === cell.s.toUpperCase();
    });
  }

  isWordCorrect(word, entries) {
    return word.coords.every((c, i) => {
      const v = entries.get(ck(c));
      return v && v.toUpperCase() === word.answer[i].toUpperCase();
    });
  }

  grouped() {
    const g = { x: [], y: [], z: [] };
    for (const w of this.puzzle.words) g[w.axis].push(w);
    for (const a of ['x','y','z']) g[a].sort((a,b) => a.num - b.num);
    return g;
  }
}

// ── Cell Texture ──────────────────────────────────────────────────────────────

const S = 256; // texture size

const PALETTE = {
  normal:   { bg:'#ffffff', border:'#d4d0c8', text:'#191817', sub:'#9e998f' },
  word:     { bg:'#eef0ff', border:'#9fa8f0', text:'#191817', sub:'#7b86e6' },
  selected: { bg:'#4b59c9', border:'#3343b0', text:'#ffffff', sub:'rgba(255,255,255,0.65)' },
  correct:  { bg:'#e8f5e9', border:'#81c784', text:'#1b5e20', sub:'#66bb6a' },
  wrong:    { bg:'#fdecea', border:'#ef9a9a', text:'#b71c1c', sub:'#ef5350' },
  revealed: { bg:'#fff8e1', border:'#ffd54f', text:'#5d4037', sub:'#ff8f00' },
};

function makeTex(letter, labels, state) {
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  const p = PALETTE[state] ?? PALETTE.normal;
  const r = 20;

  ctx.fillStyle = p.bg;
  ctx.beginPath();
  ctx.roundRect(3, 3, S - 6, S - 6, r);
  ctx.fill();

  ctx.strokeStyle = p.border;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(3, 3, S - 6, S - 6, r);
  ctx.stroke();

  if (labels.length) {
    ctx.fillStyle = p.sub;
    ctx.font = `bold ${S * 0.11}px system-ui,sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(labels.join(' '), S * 0.07, S * 0.07);
  }

  if (letter) {
    ctx.fillStyle = p.text;
    ctx.font = `bold ${S * 0.46}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter.toUpperCase(), S / 2, S * 0.56);
  }

  return new THREE.CanvasTexture(c);
}

// ── Main Game Class ───────────────────────────────────────────────────────────

class Lattice3Game {
  constructor(canvasEl) {
    this.canvas = canvasEl;

    // game state
    this.puzzle   = null;
    this.engine   = null;
    this.entries  = new Map();   // ck(coord) → letter
    this.selCoord = null;
    this.wordId   = null;
    this.axis     = null;
    this.revealed = new Set();
    this.wrong    = new Set();
    this.doneIds  = new Set();

    // three.js
    this._meshes = new Map();   // ck → Mesh
    this._geo    = new THREE.BoxGeometry(0.93, 0.93, 0.93);
    this._mouseDown = null;

    this._initThree();
  }

  // ── Three.js setup ────────────────────────────────────────────────────────

  _initThree() {
    const wrap = this.canvas.parentElement;
    const W = wrap.clientWidth  || 600;
    const H = wrap.clientHeight || 460;

    this.scene    = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfaf9f6);

    this.camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    this.camera.position.set(4.2, 3.8, 5.5);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    const amb = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.45);
    dir.position.set(6, 9, 6);
    this.scene.add(dir);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enablePan = false;
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 12;
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    // click vs drag discrimination
    this.canvas.addEventListener('mousedown', e => {
      this._mouseDown = { x: e.clientX, y: e.clientY };
    });
    this.canvas.addEventListener('click', e => {
      if (!this._mouseDown) return;
      const dx = e.clientX - this._mouseDown.x;
      const dy = e.clientY - this._mouseDown.y;
      if (dx * dx + dy * dy < 16) this._pick(e.clientX, e.clientY);
    });
    this.canvas.addEventListener('touchstart', e => {
      const t = e.touches[0];
      this._mouseDown = { x: t.clientX, y: t.clientY };
    }, { passive: true });
    this.canvas.addEventListener('touchend', e => {
      if (!this._mouseDown) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this._mouseDown.x;
      const dy = t.clientY - this._mouseDown.y;
      if (dx * dx + dy * dy < 64) this._pick(t.clientX, t.clientY);
    });

    new ResizeObserver(() => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }).observe(wrap);

    const loop = () => {
      requestAnimationFrame(loop);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  _pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width)  *  2 - 1,
      ((clientY - rect.top)  / rect.height) * -2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, this.camera);
    const hits = ray.intersectObjects([...this._meshes.values()]);
    if (hits.length) this._handleCellClick(hits[0].object.userData.coord);
  }

  // ── Puzzle loading ────────────────────────────────────────────────────────

  loadPuzzle(puzzle) {
    this.puzzle   = puzzle;
    this.engine   = new PuzzleEngine(puzzle);
    this.entries  = new Map();
    this.selCoord = null;
    this.wordId   = null;
    this.axis     = null;
    this.revealed = new Set();
    this.wrong    = new Set();
    this.doneIds  = new Set();

    this._loadState();
    this._buildScene();
    this._buildClues();
    this._updateBar();
  }

  _buildScene() {
    for (const m of this._meshes.values()) {
      this.scene.remove(m);
      m.material.map?.dispose();
      m.material.dispose();
    }
    this._meshes.clear();

    const { x: dx, y: dy, z: dz } = this.puzzle.dimensions;
    const SP = 1.18;
    const ox = ((dx - 1) * SP) / 2;
    const oy = ((dy - 1) * SP) / 2;
    const oz = ((dz - 1) * SP) / 2;

    for (const cell of this.puzzle.cells) {
      const c = cell.coord;
      const k = ck(c);
      const labels = this.engine.startsAt(c);
      const letter = this.entries.get(k) ?? '';
      const tex = makeTex(letter, labels, 'normal');
      const mat = new THREE.MeshPhongMaterial({ map: tex });
      const mesh = new THREE.Mesh(this._geo, mat);

      // Y flipped so y=0 is visually top; Z flipped so z=0 is front
      mesh.position.set(
        c.x * SP - ox,
       -c.y * SP + oy,
       -c.z * SP + oz,
      );
      mesh.userData.coord = c;
      this.scene.add(mesh);
      this._meshes.set(k, mesh);
    }

    this._paint();
  }

  // ── Cell state / painting ─────────────────────────────────────────────────

  _stateOf(coord) {
    const k = ck(coord);
    if (this.selCoord && eq(coord, this.selCoord)) return 'selected';
    if (this.wrong.has(k))    return 'wrong';
    if (this.revealed.has(k)) return 'revealed';
    if (this.wordId) {
      const w = this.puzzle.words.find(w => w.id === this.wordId);
      if (w && w.coords.some(c => eq(c, coord))) {
        return this.doneIds.has(w.id) ? 'correct' : 'word';
      }
    }
    // part of any completed word → green
    if (this.engine.wordsForCell(coord).some(w => this.doneIds.has(w.id))) return 'correct';
    return 'normal';
  }

  _paint() {
    for (const cell of this.puzzle.cells) {
      const c = cell.coord;
      const k = ck(c);
      const mesh = this._meshes.get(k);
      if (!mesh) continue;
      const labels = this.engine.startsAt(c);
      const letter = this.entries.get(k) ?? '';
      const state  = this._stateOf(c);
      const tex = makeTex(letter, labels, state);
      mesh.material.map?.dispose();
      mesh.material.map = tex;
      mesh.material.needsUpdate = true;
    }
  }

  // ── Cell interaction ──────────────────────────────────────────────────────

  _handleCellClick(coord) {
    const axes = this.engine.validAxes(coord);
    if (!axes.length) return;

    if (axes.length === 1) {
      this._activate(coord, axes[0]);
    } else if (this.selCoord && eq(this.selCoord, coord) && this.axis) {
      // cycle through axes on repeat tap
      const i = axes.indexOf(this.axis);
      this._activate(coord, axes[(i + 1) % axes.length]);
    } else {
      this._showPicker(coord, axes);
    }
  }

  _activate(coord, axis) {
    const word = this.engine.wordForCellAxis(coord, axis);
    if (!word) return;

    this.selCoord = coord;
    this.axis     = axis;
    this.wordId   = word.id;
    this.wrong.clear();

    this._paint();
    this._updateClues();
    this._updateBar();
    this._switchAxisTab(axis);
    this._scrollToActiveClue();
    document.getElementById('hidden-input')?.focus();
  }

  _showPicker(coord, axes) {
    this.selCoord = coord;
    const modal = document.getElementById('axis-picker');
    const btns  = document.getElementById('axis-picker-buttons');
    btns.innerHTML = '';

    for (const axis of axes) {
      const word = this.engine.wordForCellAxis(coord, axis);
      const btn  = document.createElement('button');
      btn.className = 'axis-btn';
      btn.innerHTML = `
        <span class="axis-label">${axis.toUpperCase()}</span>
        <span class="axis-clue-text">${word?.clue ?? ''}</span>
      `;
      btn.addEventListener('click', () => {
        modal.hidden = true;
        this._activate(coord, axis);
      });
      btns.appendChild(btn);
    }

    modal.hidden = false;
  }

  // ── Letter entry ──────────────────────────────────────────────────────────

  handleKey(key) {
    if (!this.selCoord) return;
    if (key === 'Backspace' || key === 'Delete') { this._del(); return; }
    if (key === 'Tab')                            { this._nextWord(); return; }
    if (/^[a-zA-Z]$/.test(key))                  { this._enter(key.toUpperCase()); }
  }

  _enter(letter) {
    const k = ck(this.selCoord);
    if (this.revealed.has(k)) return;

    this.entries.set(k, letter);
    this.wrong.delete(k);

    const word = this.puzzle.words.find(w => w.id === this.wordId);
    if (word) {
      const next = this.engine.nextCell(word, this.selCoord);
      if (next) this.selCoord = next;
    }

    this._refresh();
    this._save();
  }

  _del() {
    const k = ck(this.selCoord);
    if (this.revealed.has(k)) return;

    const word = this.puzzle.words.find(w => w.id === this.wordId);

    if (this.entries.get(k)) {
      this.entries.delete(k);
      this.wrong.delete(k);
    } else if (word) {
      const prev = this.engine.prevCell(word, this.selCoord);
      if (prev && !this.revealed.has(ck(prev))) {
        this.entries.delete(ck(prev));
        this.wrong.delete(ck(prev));
        this.selCoord = prev;
      }
    }

    this._refresh();
    this._save();
  }

  _nextWord() {
    if (!this.wordId) return;
    const words = this.puzzle.words;
    const i = words.findIndex(w => w.id === this.wordId);
    for (let d = 1; d <= words.length; d++) {
      const candidate = words[(i + d) % words.length];
      if (!this.engine.isWordCorrect(candidate, this.entries)) {
        const start = this.engine.firstEmpty(candidate, this.entries) ?? candidate.coords[0];
        this._activate(start, candidate.axis);
        return;
      }
    }
  }

  // ── Toolbar actions ───────────────────────────────────────────────────────

  checkLetter() {
    if (!this.selCoord) return;
    const k    = ck(this.selCoord);
    const cell = this.puzzle.cells.find(c => eq(c.coord, this.selCoord));
    const v    = this.entries.get(k);
    if (!v || !cell) return;
    if (v.toUpperCase() !== cell.s.toUpperCase()) this.wrong.add(k);
    else this.wrong.delete(k);
    this._paint();
  }

  checkWord() {
    const word = this.puzzle.words.find(w => w.id === this.wordId);
    if (!word) return;
    for (let i = 0; i < word.coords.length; i++) {
      const k = ck(word.coords[i]);
      const v = this.entries.get(k);
      if (!v) continue;
      if (v.toUpperCase() !== word.answer[i].toUpperCase()) this.wrong.add(k);
      else this.wrong.delete(k);
    }
    this._paint();
  }

  revealLetter() {
    if (!this.selCoord) return;
    const k    = ck(this.selCoord);
    const cell = this.puzzle.cells.find(c => eq(c.coord, this.selCoord));
    if (!cell) return;
    this.entries.set(k, cell.s);
    this.revealed.add(k);
    this.wrong.delete(k);

    const word = this.puzzle.words.find(w => w.id === this.wordId);
    if (word) {
      const next = this.engine.nextEmpty(word, this.selCoord, this.entries);
      if (next) this.selCoord = next;
    }

    this._refresh();
    this._save();
  }

  revealWord() {
    const word = this.puzzle.words.find(w => w.id === this.wordId);
    if (!word) return;
    for (let i = 0; i < word.coords.length; i++) {
      const k = ck(word.coords[i]);
      this.entries.set(k, word.answer[i]);
      this.revealed.add(k);
      this.wrong.delete(k);
    }
    this._refresh();
    this._save();
  }

  resetPuzzle() {
    this.entries.clear();
    this.revealed.clear();
    this.wrong.clear();
    this.doneIds.clear();
    this.selCoord = null;
    this.wordId   = null;
    this.axis     = null;
    localStorage.removeItem(this._storeKey());
    this._paint();
    this._updateClues();
    this._updateBar();
  }

  // ── Completion ────────────────────────────────────────────────────────────

  _refresh() {
    this.doneIds.clear();
    for (const w of this.puzzle.words) {
      if (this.engine.isWordCorrect(w, this.entries)) this.doneIds.add(w.id);
    }
    this._paint();
    this._updateClues();
    if (this.engine.isSolved(this.entries)) {
      setTimeout(() => this._showDone(), 350);
    }
  }

  _showDone() {
    document.getElementById('completion-modal').hidden = false;
    const sub = document.getElementById('completion-subtitle');
    if (sub) sub.textContent = `You solved "${this.puzzle.title}".`;
  }

  // ── Clue panel ────────────────────────────────────────────────────────────

  _buildClues() {
    const g = this.engine.grouped();
    for (const axis of ['x','y','z']) {
      const list = document.getElementById(`clues-${axis}`);
      if (!list) continue;
      list.innerHTML = '';
      for (const word of g[axis]) {
        const btn = document.createElement('button');
        btn.className   = 'clue-item';
        btn.dataset.wid = word.id;
        btn.innerHTML = `
          <span class="clue-num">${axis.toUpperCase()}${word.num}</span>
          <span class="clue-text">${word.clue}</span>
          <span class="clue-letters">${'_ '.repeat(word.answer.length).trim()}</span>
        `;
        btn.addEventListener('click', () => {
          const start = this.engine.firstEmpty(word, this.entries) ?? word.coords[0];
          this._activate(start, word.axis);
        });
        list.appendChild(btn);
      }
    }
    this._updateClues();
  }

  _updateClues() {
    for (const btn of document.querySelectorAll('.clue-item')) {
      const wid  = btn.dataset.wid;
      const word = this.puzzle?.words.find(w => w.id === wid);
      if (!word) continue;

      btn.classList.toggle('active',     wid === this.wordId);
      btn.classList.toggle('completed',  this.doneIds.has(wid));

      const letEl = btn.querySelector('.clue-letters');
      if (letEl) {
        letEl.textContent = word.coords.map(c => this.entries.get(ck(c)) ?? '_').join(' ');
      }
    }
  }

  _updateBar() {
    const bar = document.getElementById('active-clue-bar');
    if (!bar) return;
    if (!this.wordId) {
      bar.innerHTML = 'Drag to rotate &nbsp;·&nbsp; Tap a cell to solve';
      return;
    }
    const word = this.puzzle.words.find(w => w.id === this.wordId);
    if (word) {
      bar.innerHTML = `<strong>${word.axis.toUpperCase()}${word.num}</strong> &mdash; ${word.clue}`;
    }
  }

  _switchAxisTab(axis) {
    for (const tab of document.querySelectorAll('.clue-axis-tab')) {
      tab.classList.toggle('active', tab.dataset.axis === axis);
    }
    for (const list of document.querySelectorAll('.clue-list')) {
      list.classList.toggle('active', list.id === `clues-${axis}`);
    }
  }

  _scrollToActiveClue() {
    const active = document.querySelector('.clue-item.active');
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  _storeKey()  { return `l3:${this.puzzle.id}`; }

  _save() {
    const data = {
      e: Object.fromEntries(this.entries),
      r: [...this.revealed],
    };
    localStorage.setItem(this._storeKey(), JSON.stringify(data));
  }

  _loadState() {
    try {
      const raw = localStorage.getItem(this._storeKey());
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.e) this.entries  = new Map(Object.entries(d.e));
      if (d.r) this.revealed = new Set(d.r);
      // recompute doneIds
      if (this.engine) {
        for (const w of this.puzzle.words) {
          if (this.engine.isWordCorrect(w, this.entries)) this.doneIds.add(w.id);
        }
      }
    } catch (_) { /* ignore */ }
  }
}

// ── UI wiring ─────────────────────────────────────────────────────────────────

function wire(game) {
  // keyboard
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[a-zA-Z]$/.test(e.key) || e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab') {
      if (e.key === 'Tab') e.preventDefault();
      game.handleKey(e.key);
    }
  });

  const hi = document.getElementById('hidden-input');
  if (hi) {
    hi.addEventListener('keydown', e => {
      if (/^[a-zA-Z]$/.test(e.key) || e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab') {
        if (e.key === 'Tab') e.preventDefault();
        game.handleKey(e.key);
      }
    });
  }

  // on-screen keyboard
  for (const key of document.querySelectorAll('.osk-key')) {
    key.addEventListener('click', () => game.handleKey(key.dataset.key));
    key.addEventListener('touchstart', e => { e.preventDefault(); game.handleKey(key.dataset.key); }, { passive: false });
  }

  // toolbar buttons
  document.getElementById('btn-check-letter')?.addEventListener('click', () => game.checkLetter());
  document.getElementById('btn-check-word')?.addEventListener('click',   () => game.checkWord());
  document.getElementById('btn-reveal-letter')?.addEventListener('click',() => game.revealLetter());
  document.getElementById('btn-reveal-word')?.addEventListener('click',  () => game.revealWord());
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (confirm('Reset this puzzle? All progress will be cleared.')) game.resetPuzzle();
  });

  // clue axis tabs
  for (const tab of document.querySelectorAll('.clue-axis-tab')) {
    tab.addEventListener('click', () => {
      for (const t of document.querySelectorAll('.clue-axis-tab')) t.classList.remove('active');
      for (const l of document.querySelectorAll('.clue-list'))     l.classList.remove('active');
      tab.classList.add('active');
      document.getElementById(`clues-${tab.dataset.axis}`)?.classList.add('active');
    });
  }

  // puzzle tabs
  let currentIdx = 0;
  for (const tab of document.querySelectorAll('.puzzle-tab')) {
    tab.addEventListener('click', () => {
      const idx = parseInt(tab.dataset.puzzle, 10);
      if (idx === currentIdx) return;
      currentIdx = idx;
      for (const t of document.querySelectorAll('.puzzle-tab')) t.classList.remove('active');
      tab.classList.add('active');
      game.loadPuzzle(PUZZLES[idx]);
    });
  }

  // axis picker cancel
  document.getElementById('axis-picker-cancel')?.addEventListener('click', () => {
    document.getElementById('axis-picker').hidden = true;
  });
  document.getElementById('axis-picker')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.hidden = true;
  });

  // completion modal
  document.getElementById('completion-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.hidden = true;
  });

  document.getElementById('btn-play-again')?.addEventListener('click', () => {
    document.getElementById('completion-modal').hidden = true;
    game.resetPuzzle();
  });

  document.getElementById('btn-next-puzzle')?.addEventListener('click', () => {
    document.getElementById('completion-modal').hidden = true;
    const nextIdx = (currentIdx + 1) % PUZZLES.length;
    const nextTab = document.querySelector(`.puzzle-tab[data-puzzle="${nextIdx}"]`);
    nextTab?.click();
  });
}

// ── Entry ─────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const game = new Lattice3Game(canvas);
  wire(game);
  game.loadPuzzle(PUZZLES[0]);
});
