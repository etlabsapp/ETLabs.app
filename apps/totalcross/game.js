// Total Cross — Game Logic

(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────
  const SUPABASE_URL = 'https://ygfnplpkztkcxmofkyci.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZm5wbHBrenRrY3htb2ZreWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyOTc0NzgsImV4cCI6MjA5Mzg3MzQ3OH0.8A1SUGb7hDxnUjE2RSG2KinJs-_NLZMYMNYfpHhRR-M';
  const LAUNCH_DATE  = new Date('2026-05-08T00:00:00');
  const HINT_PENALTY = 60; // seconds per hint
  const USERNAME_KEY = 'tc_username';
  const DEVICE_KEY   = 'tc_device_id';
  const STATS_KEY    = 'totalcross_stats';

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // ── STATE ───────────────────────────────────────────────
  let puzzle       = null;
  let grid         = [];
  let words        = [];
  let selectedCell = null;
  let selectedWord = null;
  let timerInterval = null;
  let timerSeconds  = 0;
  let hintsUsed     = 0;
  let gameComplete  = false;
  let puzzleNumber  = 1;

  // ── HELPERS ─────────────────────────────────────────────

  function getPuzzleNumber() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const launch = new Date(LAUNCH_DATE);
    launch.setHours(0, 0, 0, 0);
    return Math.max(1, Math.floor((today - launch) / 86400000) + 1);
  }

  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function letterValue(ch) {
    return ch.toUpperCase().charCodeAt(0) - 64;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  // ── TUTORIAL DATA ───────────────────────────────────────

  const TUTORIAL_PUZZLE = {
    acrossTheme: 'US Presidents',
    downTheme: 'Planets & Space',
    grid: [
      [1,1,1,1,1,0],
      [1,0,0,0,1,0],
      [1,0,0,0,1,0],
      [1,1,1,1,1,1],
      [1,0,0,0,0,0],
      [1,0,0,0,0,0],
      [1,0,0,0,0,0],
    ],
    words: [
      { id:'1A', direction:'across', row:0, col:0, length:5, answer:'NIXON',   sum:76 },
      { id:'2A', direction:'across', row:3, col:0, length:6, answer:'TRUMAN',  sum:87 },
      { id:'1D', direction:'down',   row:0, col:0, length:7, answer:'NEPTUNE', sum:95 },
      { id:'2D', direction:'down',   row:0, col:4, length:4, answer:'NOVA',    sum:52 },
    ],
  };

  const TUTORIAL_STEPS = [
    {
      title: 'Welcome to Total Cross',
      body:  'A crossword where letters have values — A=1, B=2 … Z=26. Every word must add up to its target number. Let\'s try a mini-puzzle.',
      highlight: null, fill: null,
    },
    {
      title: 'Two themes',
      body:  '<strong>Across</strong> words are US Presidents. <strong>Down</strong> words are Planets &amp; Space. The target sum is your only clue.',
      highlight: 'themes', fill: null,
    },
    {
      title: 'Find 1-Across',
      body:  '1&#8209;Across is a US President, 5 letters, target sum <strong>76</strong>.<br><br>N(14) + I(9) + X(24) + O(15) + N(14) = 76 → <strong>NIXON</strong>',
      highlight: '1A', fill: '1A',
    },
    {
      title: 'Intersections lock letters',
      body:  'The N at the start and the N at the end of NIXON are shared with the Down words. Those letters narrow down what the Down words can be.',
      highlight: 'intersections', fill: null,
    },
    {
      title: 'Find 1-Down',
      body:  '1&#8209;Down is a Planet, 7 letters, starts with <strong>N</strong> (locked from NIXON), target sum <strong>95</strong>.<br><br>NEPTUNE = 95 ✓',
      highlight: '1D', fill: '1D',
    },
    {
      title: 'Chain reaction',
      body:  'Filling NEPTUNE revealed <strong>T</strong> at the start of 2&#8209;Across and <strong>U</strong> in the middle. TRUMAN (87) and NOVA (52) drop right in.',
      highlight: null, fill: '2A+2D',
    },
    {
      title: 'That\'s it!',
      body:  'Theme + target sum = find the word. Crossings give you free letters. Need help? Hints reveal a letter for +60 seconds on your clock.',
      highlight: null, fill: null,
    },
  ];

  let tutStep = 0;
  let tutGrid = [];
  let tutWords = [];

  // ── INIT ────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    puzzleNumber = getPuzzleNumber();
    puzzle = getTodaysPuzzle();
    setupPuzzleMeta();
    setupModals();

    const savedSolve = JSON.parse(localStorage.getItem('tc_solved_' + puzzleNumber) || 'null');
    if (savedSolve) {
      timerSeconds = savedSolve.time;
      hintsUsed    = savedSolve.hints;
      gameComplete = true;
      startGame();
      stopTimer();
      updateTimerDisplay();
      showCompleteModal();
    } else {
      startGame();
      const seen = localStorage.getItem('tc_tutorial_done');
      if (!seen) startTutorial();
    }

    loadSolveCount();
  }

  function setupPuzzleMeta() {
    const now = new Date();
    document.getElementById('puzzle-num').textContent = puzzleNumber;

    const barNum = document.getElementById('bar-puzzle-num');
    if (barNum) barNum.textContent = `# ${puzzleNumber} / Daily Puzzle`;

    const barDate = document.getElementById('bar-live-date');
    if (barDate) {
      barDate.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      });
    }

    document.getElementById('across-theme').textContent = puzzle.acrossTheme;
    document.getElementById('down-theme').textContent   = puzzle.downTheme;

    const themeEl = document.getElementById('puzzle-theme-display');
    if (themeEl) {
      themeEl.innerHTML =
        `<span class="theme-direction">Across</span>` +
        `<span class="theme-value">${escapeHtml(puzzle.acrossTheme)}</span>` +
        `<span class="theme-sep">·</span>` +
        `<span class="theme-direction">Down</span>` +
        `<span class="theme-value">${escapeHtml(puzzle.downTheme)}</span>`;
    }
  }

  // ── TUTORIAL ────────────────────────────────────────────

  function startTutorial() {
    tutStep = 0;
    buildTutorialGrid();
    renderTutorialGrid();
    renderTutorialStep();
    document.getElementById('tutorial-overlay').removeAttribute('hidden');
    document.getElementById('tut-next').addEventListener('click', advanceTutorial);
    document.getElementById('tut-skip').addEventListener('click', endTutorial);
  }

  function buildTutorialGrid() {
    const p = TUTORIAL_PUZZLE;
    tutWords = p.words.map(w => ({ ...w, cells: getCellsForWord(w) }));
    tutGrid = p.grid.map((row, r) =>
      row.map((val, c) => ({ row: r, col: c, active: val === 1, letter: '', el: null, inputEl: null, wordIds: [] }))
    );
    tutWords.forEach(w => w.cells.forEach(pos => tutGrid[pos.row][pos.col].wordIds.push(w.id)));

    let num = 1;
    const numbered = {};
    [...tutWords].sort((a,b) => a.row !== b.row ? a.row - b.row : a.col - b.col).forEach(w => {
      const key = `${w.row},${w.col}`;
      if (!numbered[key]) numbered[key] = num++;
      w.displayNumber = numbered[key];
    });
  }

  function renderTutorialGrid() {
    const gridEl = document.getElementById('tut-grid');
    gridEl.innerHTML = '';
    const rows = TUTORIAL_PUZZLE.grid.length;
    const cols = TUTORIAL_PUZZLE.grid[0].length;
    gridEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
    gridEl.style.gridTemplateRows    = `repeat(${rows}, var(--cell-size))`;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = tutGrid[r][c];
        const el = document.createElement('div');
        el.className = 'cell ' + (cell.active ? 'active' : 'blocked');
        el.dataset.row = r; el.dataset.col = c;
        cell.el = el;

        if (cell.active) {
          const word = tutWords.find(w => w.cells.some(p => p.row === r && p.col === c));
          if (word && tutGrid[r][c].wordIds[0] === word.id) {
            const numEl = document.createElement('span');
            numEl.className = 'cell-number';
            const isStart = tutWords.some(w => w.row === r && w.col === c);
            if (isStart) numEl.textContent = word.displayNumber;
            el.appendChild(numEl);
          }
          const input = document.createElement('input');
          input.type = 'text'; input.maxLength = 1; input.className = 'cell-letter';
          input.readOnly = true;
          el.appendChild(input);
          cell.inputEl = input;
        }
        gridEl.appendChild(el);
      }
    }

    requestAnimationFrame(() => {
      const wrap = document.getElementById('tut-grid-wrap');
      wrap.querySelectorAll('.sum-chip').forEach(e => e.remove());
      const cellEl = gridEl.querySelector('.cell.active');
      if (!cellEl) return;
      const cs = cellEl.getBoundingClientRect().width;
      const wr = wrap.getBoundingClientRect();
      tutWords.forEach(w => {
        const chip = document.createElement('div');
        chip.className = 'sum-chip'; chip.textContent = w.sum; chip.dataset.id = w.id;
        let left, top;
        if (w.direction === 'across') {
          const lc = gridEl.querySelector(`[data-row="${w.row}"][data-col="${w.col+w.length-1}"]`);
          if (lc) { const cr = lc.getBoundingClientRect(); left = cr.right - wr.left + 4; top = cr.top - wr.top + cs/2; chip.style.transform = 'translateY(-50%)'; }
        } else {
          const lr = gridEl.querySelector(`[data-row="${w.row+w.length-1}"][data-col="${w.col}"]`);
          if (lr) { const cr = lr.getBoundingClientRect(); left = cr.left - wr.left + cs/2; top = cr.bottom - wr.top + 4; chip.style.transform = 'translateX(-50%)'; }
        }
        if (left !== undefined) { chip.style.left = left+'px'; chip.style.top = top+'px'; wrap.appendChild(chip); }
      });
    });
  }

  function renderTutorialStep() {
    const step = TUTORIAL_STEPS[tutStep];
    document.getElementById('tut-title').textContent = step.title;
    document.getElementById('tut-body').innerHTML = step.body;
    document.getElementById('tut-next').textContent = tutStep === TUTORIAL_STEPS.length - 1 ? 'Start playing →' : 'Next →';

    const dotsEl = document.getElementById('tut-dots');
    dotsEl.innerHTML = '';
    TUTORIAL_STEPS.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.className = 'tut-dot' + (i === tutStep ? ' active' : '');
      dotsEl.appendChild(dot);
    });

    tutGrid.forEach(row => row.forEach(cell => {
      if (cell.el) cell.el.classList.remove('word-active', 'selected', 'tut-intersection');
    }));

    if (['1A','1D','2A','2D'].includes(step.highlight)) {
      const w = tutWords.find(w => w.id === step.highlight);
      if (w) w.cells.forEach(pos => tutGrid[pos.row][pos.col].el?.classList.add('word-active'));
    } else if (step.highlight === 'intersections') {
      tutWords.forEach(w => w.cells.forEach(pos => {
        if (tutGrid[pos.row][pos.col].wordIds.length >= 2)
          tutGrid[pos.row][pos.col].el?.classList.add('tut-intersection');
      }));
    }

    if (step.fill) {
      const toFill = step.fill === '2A+2D' ? ['2A','2D'] : [step.fill];
      toFill.forEach(id => {
        const w = tutWords.find(w => w.id === id);
        if (!w) return;
        w.cells.forEach((pos, i) => {
          const cell = tutGrid[pos.row][pos.col];
          if (cell.inputEl) cell.inputEl.value = w.answer[i];
          if (cell.el) cell.el.classList.add('correct');
        });
        const chip = document.querySelector(`#tut-grid-wrap .sum-chip[data-id="${id}"]`);
        if (chip) chip.classList.add('matched');
      });
    }
  }

  function advanceTutorial() {
    if (tutStep >= TUTORIAL_STEPS.length - 1) { endTutorial(); return; }
    tutStep++;
    renderTutorialStep();
  }

  function endTutorial() {
    localStorage.setItem('tc_tutorial_done', '1');
    document.getElementById('tutorial-overlay').setAttribute('hidden', '');
  }

  // ── MODALS ──────────────────────────────────────────────

  function setupModals() {
    document.getElementById('btn-how-to-play').addEventListener('click', () => openModal('modal-howto'));
    document.getElementById('btn-stats').addEventListener('click', () => {
      populateStats();
      loadLeaderboard(document.getElementById('stats-leaderboard-list'));
      openModal('modal-stats');
    });
    document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', closeAllModals));
    document.querySelectorAll('.modal-backdrop').forEach(bd => bd.addEventListener('click', closeAllModals));
    document.getElementById('btn-take-tutorial').addEventListener('click', () => {
      closeAllModals();
      tutStep = 0;
      buildTutorialGrid();
      renderTutorialGrid();
      renderTutorialStep();
      document.getElementById('tutorial-overlay').removeAttribute('hidden');
    });
    document.getElementById('btn-share').addEventListener('click', shareResult);
    document.getElementById('btn-view-solution').addEventListener('click', closeAllModals);
    document.getElementById('btn-username-save').addEventListener('click', saveUsername);
    document.getElementById('username-input').addEventListener('keydown', e => { if (e.key === 'Enter') saveUsername(); });
  }

  function saveUsername() {
    const input = document.getElementById('username-input');
    const name = input.value.trim().slice(0, 20);
    if (!name) return;
    localStorage.setItem(USERNAME_KEY, name);
    document.getElementById('username-prompt').setAttribute('hidden', '');
    if (gameComplete) submitScore(name);
  }

  function openModal(id)    { document.getElementById(id).removeAttribute('hidden'); }
  function closeAllModals() { document.querySelectorAll('.modal').forEach(m => m.setAttribute('hidden', '')); }

  // ── GAME START ──────────────────────────────────────────

  function startGame() {
    hintsUsed    = 0;
    gameComplete = false;
    timerSeconds = 0;

    buildWordObjects();
    buildGrid();
    renderGrid();
    renderClues();
    renderLetterRef();
    startTimer();
    updateHintCount();

    document.getElementById('btn-hint').addEventListener('click', revealLetter);

    const firstWord = words.find(w => w.direction === 'across') || words[0];
    if (firstWord) {
      selectedWord = firstWord;
      selectedCell = firstWord.cells[0];
      const cell = grid[selectedCell.row][selectedCell.col];
      if (cell.inputEl) setTimeout(() => cell.inputEl.focus(), 50);
      highlightWord();
    }
  }

  // ── WORD OBJECTS ────────────────────────────────────────

  function buildWordObjects() {
    words = puzzle.words.map(w => ({
      ...w,
      solved: false,
      cells: getCellsForWord(w),
    }));
  }

  function getCellsForWord(w) {
    const cells = [];
    for (let i = 0; i < w.length; i++) {
      cells.push(w.direction === 'across'
        ? { row: w.row, col: w.col + i }
        : { row: w.row + i, col: w.col });
    }
    return cells;
  }

  // ── GRID BUILD ──────────────────────────────────────────

  function buildGrid() {
    const rows = puzzle.grid.length;
    const cols = puzzle.grid[0].length;
    grid = [];

    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        grid[r][c] = {
          row: r, col: c,
          active: puzzle.grid[r][c] === 1,
          letter: '',
          revealed: false,
          wordIds: [],
          number: null,
          el: null,
          inputEl: null,
        };
      }
    }

    let num = 1;
    const numbered = {};
    const sortedWords = [...words].sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
    sortedWords.forEach(w => {
      const key = `${w.row},${w.col}`;
      if (!numbered[key]) numbered[key] = num++;
      w.displayNumber = numbered[key];
    });

    words.forEach(w => {
      const startCell = grid[w.row][w.col];
      if (startCell.number === null) startCell.number = w.displayNumber;
      w.cells.forEach(pos => grid[pos.row][pos.col].wordIds.push(w.id));
    });
  }

  // ── GRID RENDER ─────────────────────────────────────────

  function renderGrid() {
    const gridEl = document.getElementById('puzzle-grid');
    gridEl.innerHTML = '';
    const rows = puzzle.grid.length;
    const cols = puzzle.grid[0].length;

    gridEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
    gridEl.style.gridTemplateRows    = `repeat(${rows}, var(--cell-size))`;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        const el = document.createElement('div');
        el.className = 'cell ' + (cell.active ? 'active' : 'blocked');
        el.dataset.row = r;
        el.dataset.col = c;
        cell.el = el;

        if (cell.active) {
          if (cell.number !== null) {
            const numEl = document.createElement('span');
            numEl.className = 'cell-number';
            numEl.textContent = cell.number;
            el.appendChild(numEl);
          }

          const input = document.createElement('input');
          input.type = 'text';
          input.maxLength = 1;
          input.className = 'cell-letter';
          input.autocomplete = 'off';
          input.autocorrect = 'off';
          input.autocapitalize = 'characters';
          input.spellcheck = false;
          input.inputMode = 'text';
          input.setAttribute('aria-label', `Row ${r + 1}, Col ${c + 1}`);

          input.addEventListener('focus', () => onCellFocus(r, c));
          input.addEventListener('keydown', e => onCellKeydown(e, r, c));
          input.addEventListener('input', e => onCellInput(e, r, c));
          input.addEventListener('click', () => onCellClick(r, c));

          el.appendChild(input);
          cell.inputEl = input;
        }

        gridEl.appendChild(el);
      }
    }

    renderSumChips();
  }

  function renderSumChips() {
    const wrapper = document.getElementById('grid-wrapper');
    wrapper.querySelectorAll('.sum-chip').forEach(el => el.remove());

    requestAnimationFrame(() => {
      const cellEl = document.querySelector('.cell.active');
      if (!cellEl) return;
      const cellSize = cellEl.getBoundingClientRect().width;
      if (!cellSize) return;
      const wrapRect = wrapper.getBoundingClientRect();

      words.forEach(w => {
        const chip = document.createElement('div');
        chip.className = 'sum-chip';
        chip.textContent = w.sum;
        chip.dataset.id = w.id;

        let left, top;
        if (w.direction === 'across') {
          const lastEl = document.querySelector(`[data-row="${w.row}"][data-col="${w.col + w.length - 1}"]`);
          if (lastEl) {
            const cr = lastEl.getBoundingClientRect();
            left = cr.right - wrapRect.left + 4;
            top  = cr.top - wrapRect.top + cellSize / 2;
            chip.style.transform = 'translateY(-50%)';
          }
        } else {
          const lastEl = document.querySelector(`[data-row="${w.row + w.length - 1}"][data-col="${w.col}"]`);
          if (lastEl) {
            const cr = lastEl.getBoundingClientRect();
            left = cr.left - wrapRect.left + cellSize / 2;
            top  = cr.bottom - wrapRect.top + 4;
            chip.style.transform = 'translateX(-50%)';
          }
        }

        if (left !== undefined) {
          chip.style.left = left + 'px';
          chip.style.top  = top + 'px';
          wrapper.appendChild(chip);
        }
      });
    });
  }

  // ── GRID INTERACTION ────────────────────────────────────

  function onCellClick(r, c) {
    const cell = grid[r][c];
    if (!cell.active) return;
    if (selectedCell && selectedCell.row === r && selectedCell.col === c) {
      toggleDirection(r, c);
      return;
    }
    selectCell(r, c);
  }

  function onCellFocus(r, c) {
    if (!selectedCell || selectedCell.row !== r || selectedCell.col !== c) {
      selectCell(r, c);
    }
  }

  function selectCell(r, c) {
    selectedCell = { row: r, col: c };
    const cell = grid[r][c];
    if (cell.wordIds.length === 0) return;

    let word = null;
    if (selectedWord && cell.wordIds.includes(selectedWord.id)) {
      word = selectedWord;
    } else {
      word = words.find(w => w.direction === 'across' && cell.wordIds.includes(w.id))
          || words.find(w => cell.wordIds.includes(w.id));
    }
    selectedWord = word;
    highlightWord();
  }

  function toggleDirection(r, c) {
    const cell = grid[r][c];
    if (cell.wordIds.length < 2) return;
    const currentIdx = cell.wordIds.indexOf(selectedWord ? selectedWord.id : cell.wordIds[0]);
    const nextId = cell.wordIds[(currentIdx + 1) % cell.wordIds.length];
    selectedWord = words.find(w => w.id === nextId);
    highlightWord();
  }

  function highlightWord() {
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (cell.el) cell.el.classList.remove('selected', 'word-active');
      }
    }
    document.querySelectorAll('.sum-chip').forEach(el => el.classList.remove('active'));

    if (!selectedWord || !selectedCell) return;

    selectedWord.cells.forEach(pos => {
      if (grid[pos.row][pos.col].el) grid[pos.row][pos.col].el.classList.add('word-active');
    });

    const sc = grid[selectedCell.row][selectedCell.col];
    if (sc.el) sc.el.classList.add('selected');

    const chip = document.querySelector(`.sum-chip[data-id="${selectedWord.id}"]`);
    if (chip) chip.classList.add('active');

    document.querySelectorAll('.clue-item').forEach(li => li.classList.remove('active'));
    const clueEl = document.querySelector(`.clue-item[data-id="${selectedWord.id}"]`);
    if (clueEl) {
      clueEl.classList.add('active');
      clueEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function onCellKeydown(e, r, c) {
    if (gameComplete) return;
    const cell = grid[r][c];

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (!cell.revealed && cell.letter) {
        cell.letter = '';
        cell.inputEl.value = '';
        updateClueSum(getWordsForCell(r, c));
      } else if (!cell.revealed) {
        moveFocus(-1);
      }
      return;
    }
    if (e.key === 'ArrowRight') { e.preventDefault(); moveInDirection('across', 1);  return; }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); moveInDirection('across', -1); return; }
    if (e.key === 'ArrowDown')  { e.preventDefault(); moveInDirection('down', 1);    return; }
    if (e.key === 'ArrowUp')    { e.preventDefault(); moveInDirection('down', -1);   return; }
    if (e.key === 'Tab')        { e.preventDefault(); moveToNextWord(e.shiftKey ? -1 : 1); return; }
  }

  function onCellInput(e, r, c) {
    if (gameComplete) return;
    const cell = grid[r][c];
    if (cell.revealed) return;

    const raw = e.target.value.replace(/[^a-zA-Z]/g, '').slice(-1).toUpperCase();
    cell.letter = raw;
    e.target.value = raw;

    if (raw) {
      updateClueSum(getWordsForCell(r, c));
      checkWordsSolved(getWordsForCell(r, c));
      moveFocus(1);
    }
  }

  function moveFocus(dir) {
    if (!selectedWord || !selectedCell) return;
    const cells = selectedWord.cells;
    const idx = cells.findIndex(p => p.row === selectedCell.row && p.col === selectedCell.col);
    const next = idx + dir;
    if (next >= 0 && next < cells.length) {
      const pos = cells[next];
      const cell = grid[pos.row][pos.col];
      if (cell.inputEl && !cell.revealed) {
        selectedCell = pos;
        cell.inputEl.focus();
        highlightWord();
      }
    }
  }

  function moveInDirection(direction, delta) {
    if (!selectedCell) return;
    let r = selectedCell.row, c = selectedCell.col;
    if (direction === 'across') c += delta;
    else r += delta;
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return;
    const cell = grid[r][c];
    if (!cell.active || !cell.inputEl) return;
    selectedCell = { row: r, col: c };
    const w = words.find(w => w.direction === direction && w.cells.some(p => p.row === r && p.col === c));
    if (w) selectedWord = w;
    cell.inputEl.focus();
    highlightWord();
  }

  function moveToNextWord(delta) {
    if (!selectedWord) return;
    const idx = words.indexOf(selectedWord);
    let next = words[(idx + delta + words.length) % words.length];
    let tries = 0;
    while (next.solved && tries < words.length) {
      next = words[(words.indexOf(next) + delta + words.length) % words.length];
      tries++;
    }
    selectedWord = next;
    const firstEmpty = next.cells.find(p => !grid[p.row][p.col].letter && !grid[p.row][p.col].revealed);
    const target = firstEmpty || next.cells[0];
    selectedCell = target;
    const cell = grid[target.row][target.col];
    if (cell.inputEl) cell.inputEl.focus();
    highlightWord();
  }

  function getWordsForCell(r, c) {
    return words.filter(w => w.cells.some(p => p.row === r && p.col === c));
  }

  // ── CLUES ───────────────────────────────────────────────

  function renderClues() {
    const acrossEl = document.getElementById('clues-across');
    const downEl   = document.getElementById('clues-down');
    acrossEl.innerHTML = '';
    downEl.innerHTML   = '';

    words.forEach(w => {
      const li = document.createElement('li');
      li.className = 'clue-item';
      li.dataset.id = w.id;

      const numSpan = document.createElement('span');
      numSpan.className = 'clue-num';
      numSpan.textContent = `${w.displayNumber}${w.direction === 'across' ? 'A' : 'D'}`;

      const sumSpan = document.createElement('span');
      sumSpan.className = 'clue-sum';
      sumSpan.innerHTML =
        `<span class="clue-current">0</span>` +
        `<span class="clue-sep">/</span>` +
        `<span class="clue-target">${w.sum}</span>`;

      const checkSpan = document.createElement('span');
      checkSpan.className = 'clue-check';
      checkSpan.textContent = '✓';

      li.appendChild(numSpan);
      li.appendChild(sumSpan);
      li.appendChild(checkSpan);

      li.addEventListener('click', () => {
        selectedWord = w;
        const pos = w.cells.find(p => !grid[p.row][p.col].revealed) || w.cells[0];
        selectedCell = pos;
        const cell = grid[pos.row][pos.col];
        if (cell.inputEl) cell.inputEl.focus();
        highlightWord();
      });

      if (w.direction === 'across') acrossEl.appendChild(li);
      else downEl.appendChild(li);
    });
  }

  function updateClueSum(affectedWords) {
    affectedWords.forEach(w => {
      const currentSum = w.cells.reduce((s, pos) => {
        const ch = grid[pos.row][pos.col].letter || '';
        return s + (ch ? letterValue(ch) : 0);
      }, 0);

      const allFilled = w.cells.every(pos => grid[pos.row][pos.col].letter || grid[pos.row][pos.col].revealed);
      const matched   = allFilled && currentSum === w.sum;

      const currentEl = document.querySelector(`.clue-item[data-id="${w.id}"] .clue-current`);
      if (currentEl) {
        currentEl.textContent = currentSum;
        currentEl.classList.toggle('matched', matched);
      }

      const chip = document.querySelector(`.sum-chip[data-id="${w.id}"]`);
      if (chip) chip.classList.toggle('matched', w.solved);

      if (allFilled && !matched && !w.solved) {
        w.cells.forEach(pos => {
          const cellEl = grid[pos.row][pos.col].el;
          if (cellEl && !cellEl.classList.contains('wrong-flash')) {
            cellEl.classList.add('wrong-flash');
            setTimeout(() => cellEl.classList.remove('wrong-flash'), 700);
          }
        });
      }
    });
  }

  // ── WORD SOLVING ────────────────────────────────────────

  function checkWordsSolved(affectedWords) {
    affectedWords.forEach(w => {
      if (w.solved) return;
      const correct = w.cells.every((pos, i) => {
        const cell = grid[pos.row][pos.col];
        return (cell.letter || '').toUpperCase() === w.answer[i].toUpperCase();
      });
      if (correct) {
        w.solved = true;
        markWordSolved(w);
        checkPuzzleComplete();
      }
    });
  }

  function markWordSolved(w) {
    w.cells.forEach(pos => {
      if (grid[pos.row][pos.col].el) grid[pos.row][pos.col].el.classList.add('correct');
    });
    const clueEl = document.querySelector(`.clue-item[data-id="${w.id}"]`);
    if (clueEl) clueEl.classList.add('solved');
    const chip = document.querySelector(`.sum-chip[data-id="${w.id}"]`);
    if (chip) chip.classList.add('matched');
    updateClueSum([w]);
  }

  function checkPuzzleComplete() {
    if (words.every(w => w.solved)) completePuzzle();
  }

  // ── HINTS ───────────────────────────────────────────────

  function revealLetter() {
    if (gameComplete) return;

    let targetPos = null, targetWord = null;

    if (selectedWord && !selectedWord.solved) {
      for (const pos of selectedWord.cells) {
        const cell = grid[pos.row][pos.col];
        if (!cell.revealed && !cell.letter) { targetPos = pos; targetWord = selectedWord; break; }
      }
    }

    if (!targetPos) {
      for (const w of words) {
        if (w.solved) continue;
        for (const pos of w.cells) {
          const cell = grid[pos.row][pos.col];
          if (!cell.revealed && !cell.letter) { targetPos = pos; targetWord = w; break; }
        }
        if (targetPos) break;
      }
    }

    if (!targetPos) return;

    const cell = grid[targetPos.row][targetPos.col];
    const idx  = targetWord.cells.findIndex(p => p.row === targetPos.row && p.col === targetPos.col);
    cell.letter   = targetWord.answer[idx];
    cell.revealed = true;
    if (cell.inputEl) {
      cell.inputEl.value    = cell.letter.toUpperCase();
      cell.inputEl.readOnly = true;
    }
    if (cell.el) cell.el.classList.add('prefill');

    hintsUsed++;
    timerSeconds += HINT_PENALTY;
    updateTimerDisplay();
    updateHintCount();

    updateClueSum(getWordsForCell(targetPos.row, targetPos.col));
    checkWordsSolved(getWordsForCell(targetPos.row, targetPos.col));

    // Flash the penalty on the timer
    const timerEl = document.getElementById('timer-display');
    timerEl.classList.add('timer-penalty');
    setTimeout(() => timerEl.classList.remove('timer-penalty'), 800);
  }

  function updateHintCount() {
    const el = document.getElementById('hint-count');
    if (!el) return;
    el.textContent = hintsUsed > 0
      ? `${hintsUsed} hint${hintsUsed > 1 ? 's' : ''} used (+${formatTime(hintsUsed * HINT_PENALTY)})`
      : '';
  }

  // ── LETTER REFERENCE ────────────────────────────────────

  function renderLetterRef() {
    const el = document.getElementById('letter-ref');
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    el.innerHTML = '<div class="letter-ref-label">Letter values</div>' +
      '<div class="letter-ref-grid">' +
      letters.map((l, i) =>
        `<span class="lref-item"><span class="lref-l">${l}</span><span class="lref-v">${i+1}</span></span>`
      ).join('') +
      '</div>';
    el.removeAttribute('hidden');
  }

  // ── TIMER ───────────────────────────────────────────────

  function startTimer() {
    timerSeconds = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => { timerSeconds++; updateTimerDisplay(); }, 1000);
  }

  function stopTimer() { clearInterval(timerInterval); }

  function updateTimerDisplay() {
    document.getElementById('timer-display').textContent = formatTime(timerSeconds);
  }

  // ── COMPLETION ──────────────────────────────────────────

  function completePuzzle() {
    if (gameComplete) return;
    gameComplete = true;
    stopTimer();
    localStorage.setItem('tc_solved_' + puzzleNumber, JSON.stringify({ time: timerSeconds, hints: hintsUsed }));
    const hintBtn = document.getElementById('btn-hint');
    if (hintBtn) hintBtn.disabled = true;
    saveStats();
    showCompleteModal();
  }

  function showCompleteModal() {
    const stats = loadStats();
    document.getElementById('complete-time-display').textContent = formatTime(timerSeconds);

    const hintNote = hintsUsed > 0
      ? ` · ${hintsUsed} hint${hintsUsed > 1 ? 's' : ''} (+${formatTime(hintsUsed * HINT_PENALTY)})`
      : ' · No hints';
    document.getElementById('complete-meta').textContent =
      `${puzzle.acrossTheme} · ${puzzle.downTheme}${hintNote}`;

    document.getElementById('complete-streak').textContent =
      stats.streak > 1 ? `${stats.streak} day streak` : 'First solve! Come back tomorrow to start your streak.';

    const username = localStorage.getItem(USERNAME_KEY);
    if (!username) {
      document.getElementById('username-prompt').removeAttribute('hidden');
    } else {
      document.getElementById('username-prompt').setAttribute('hidden', '');
      submitScore(username);
    }

    loadLeaderboard(document.getElementById('leaderboard-list'));
    startNextPuzzleCountdown();
    openModal('modal-complete');
  }

  let countdownInterval = null;
  function startNextPuzzleCountdown() {
    const el = document.getElementById('next-puzzle-countdown');
    if (!el) return;
    if (countdownInterval) clearInterval(countdownInterval);
    function update() {
      const now = new Date();
      const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
      const diff = Math.max(0, Math.floor((midnight - now) / 1000));
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      el.textContent = `Next puzzle in ${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    update();
    countdownInterval = setInterval(update, 1000);
  }

  // ── SUPABASE — SCORE SUBMIT ──────────────────────────────

  async function submitScore(displayName) {
    try {
      await sb.from('scores').insert({
        puzzle_number: puzzleNumber,
        puzzle_date:   todayISO(),
        display_name:  displayName,
        time_seconds:  timerSeconds,
        hints_used:    hintsUsed,
        device_id:     getDeviceId(),
      });
      loadLeaderboard(document.getElementById('leaderboard-list'));
      loadSolveCount();
    } catch { /* offline — silently skip */ }
  }

  async function loadSolveCount() {
    try {
      const { count } = await sb
        .from('scores')
        .select('*', { count: 'exact', head: true })
        .eq('puzzle_date', todayISO());
      const el = document.getElementById('bar-solved-count');
      if (el && count !== null) {
        el.textContent = count > 0 ? `${count} solved today` : '';
      }
    } catch { /* offline */ }
  }

  // ── SUPABASE — LEADERBOARD ──────────────────────────────

  async function loadLeaderboard(listEl) {
    listEl = listEl || document.getElementById('leaderboard-list');
    if (!listEl) return;
    listEl.innerHTML = '<li class="lb-loading">Loading…</li>';
    try {
      const { data, error } = await sb
        .from('scores')
        .select('display_name, time_seconds, hints_used')
        .eq('puzzle_date', todayISO())
        .order('time_seconds', { ascending: true })
        .limit(10);

      if (error) throw error;
      renderLeaderboard(data || [], listEl);
    } catch {
      listEl.innerHTML = '<li class="lb-loading">Leaderboard unavailable.</li>';
    }
  }

  function renderLeaderboard(entries, listEl) {
    const username = localStorage.getItem(USERNAME_KEY) || '';
    if (!entries.length) {
      listEl.innerHTML = '<li class="lb-loading">No scores yet — be the first!</li>';
      return;
    }
    listEl.innerHTML = entries.map((e, i) => {
      const isMe = e.display_name.toLowerCase() === username.toLowerCase();
      const hintNote = e.hints_used > 0 ? ` <span class="lb-hints">(${e.hints_used}h)</span>` : '';
      return `<li class="lb-row${isMe ? ' lb-me' : ''}">
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-name">${escapeHtml(e.display_name)}${hintNote}</span>
        <span class="lb-time">${formatTime(e.time_seconds)}</span>
      </li>`;
    }).join('');
  }

  // ── SHARE ───────────────────────────────────────────────

  function shareResult() {
    const hintLine = hintsUsed > 0 ? `\n${hintsUsed} hint${hintsUsed > 1 ? 's' : ''} used` : '\nNo hints';
    const text = [
      `Total Cross #${puzzleNumber}`,
      `Across: ${puzzle.acrossTheme}`,
      `Down: ${puzzle.downTheme}`,
      `Time: ${formatTime(timerSeconds)}${hintLine}`,
      `etlabs.app/apps/totalcross/`,
    ].join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('btn-share');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy result'; }, 2000);
      });
    }
  }

  // ── STATS ───────────────────────────────────────────────

  function loadStats() {
    try { return JSON.parse(localStorage.getItem(STATS_KEY)) || defaultStats(); }
    catch { return defaultStats(); }
  }

  function defaultStats() {
    return { solved: 0, streak: 0, bestStreak: 0, lastSolvedPuzzle: null, bestTime: null, bestHints: null };
  }

  function saveStats() {
    const stats = loadStats();

    stats.solved++;

    if (stats.lastSolvedPuzzle === null) {
      stats.streak = 1;
    } else if (stats.lastSolvedPuzzle === puzzleNumber) {
      // already solved today
    } else if (puzzleNumber - stats.lastSolvedPuzzle === 1) {
      stats.streak++;
    } else {
      stats.streak = 1;
    }

    stats.lastSolvedPuzzle = puzzleNumber;
    if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
    if (stats.bestTime === null || timerSeconds < stats.bestTime) stats.bestTime = timerSeconds;
    if (stats.bestHints === null || hintsUsed < stats.bestHints) stats.bestHints = hintsUsed;

    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  function populateStats() {
    const stats = loadStats();
    document.getElementById('stat-solved').textContent     = stats.solved;
    document.getElementById('stat-streak').textContent     = stats.streak;
    document.getElementById('stat-best-streak').textContent = stats.bestStreak;
    document.getElementById('best-time').textContent       = stats.bestTime !== null ? formatTime(stats.bestTime) : '—';
    document.getElementById('best-hints').textContent      = stats.bestHints !== null ? stats.bestHints : '—';
  }

})();
