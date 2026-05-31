export const COLS = 'ABCDEFGHIJ'.split('');

export const SHIPS = [
  { name: 'Carrier',    size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser',    size: 3 },
  { name: 'Submarine',  size: 3 },
  { name: 'Destroyer',  size: 2 },
];

export function idx(r, c) { return r * 10 + c; }
export function pos(i)    { return { r: Math.floor(i / 10), c: i % 10 }; }

export function shipCells(startIdx, size, ori) {
  const { r, c } = pos(startIdx);
  const cells = [];
  for (let i = 0; i < size; i++) {
    const nr = ori === 'H' ? r : r + i;
    const nc = ori === 'H' ? c + i : c;
    if (nr > 9 || nc > 9) return null;
    cells.push(idx(nr, nc));
  }
  return cells;
}

export function canPlace(grid, cells) {
  if (!cells) return false;
  return cells.every(i => !grid[i]);
}

export function placeShipOnGrid(grid, cells, shipName) {
  const g = [...grid];
  cells.forEach(i => (g[i] = shipName));
  return g;
}

export function checkSunk(shots, ships) {
  return ships.map(s => ({
    ...s,
    sunk: s.cells.every(c => shots[c] === 'hit'),
  }));
}

export function placeEnemyShips() {
  let grid = Array(100).fill(null);
  const ships = [];
  for (const ship of SHIPS) {
    let placed = false;
    while (!placed) {
      const ori      = Math.random() < 0.5 ? 'H' : 'V';
      const startIdx = Math.floor(Math.random() * 100);
      const cells    = shipCells(startIdx, ship.size, ori);
      if (cells && canPlace(grid, cells)) {
        grid   = placeShipOnGrid(grid, cells, ship.name);
        ships.push({ name: ship.name, cells, sunk: false });
        placed = true;
      }
    }
  }
  return { grid, ships };
}

// ── AI: pick next shot ──────────────────────────────────────────────────
//
// Easy: pure random from un-shot cells.
//
// Hard: Hunt/Target algorithm.
//   - HUNT mode: fire at a checkerboard pattern (every other cell) to
//     maximise the chance of hitting any ship ≥2 cells long.
//   - TARGET mode: once a hit is scored, try adjacent cells. Once two
//     hits on the same ship are found, lock onto that axis and fire
//     along it until the ship sinks, then return to HUNT mode.
//
// The AI state is stored in `aiState` inside the game state:
//   { mode: 'hunt'|'target', hits: number[], axis: 'H'|'V'|null }

function neighbors(i, shots) {
  const { r, c } = pos(i);
  const cands = [];
  if (r > 0) cands.push(idx(r - 1, c));
  if (r < 9) cands.push(idx(r + 1, c));
  if (c > 0) cands.push(idx(r, c - 1));
  if (c < 9) cands.push(idx(r, c + 1));
  return cands.filter(x => shots[x] === null);
}

function axisNeighbors(hits, shots) {
  // Given ≥2 hits, determine axis and return cells to try at both ends
  const sorted = [...hits].sort((a, b) => a - b);
  const first  = pos(sorted[0]);
  const last   = pos(sorted[sorted.length - 1]);
  const isH    = first.r === last.r;
  const cands  = [];
  if (isH) {
    if (first.c > 0) cands.push(idx(first.r, first.c - 1));
    if (last.c  < 9) cands.push(idx(last.r,  last.c  + 1));
  } else {
    if (first.r > 0) cands.push(idx(first.r - 1, first.c));
    if (last.r  < 9) cands.push(idx(last.r  + 1, last.c));
  }
  return cands.filter(x => shots[x] === null);
}

export function pickEasyShot(shots) {
  const valid = shots.map((v, i) => (v === null ? i : null)).filter(i => i !== null);
  return valid[Math.floor(Math.random() * valid.length)];
}

export function pickHardShot(shots, placedShips, aiState) {
  // Collect all hits that belong to ships NOT yet sunk
  const unsunkHits = shots
    .map((v, i) => (v === 'hit' ? i : null))
    .filter(i => i !== null)
    .filter(i => {
      const ship = placedShips.find(s => s.cells.includes(i));
      return ship && !ship.sunk;
    });

  // TARGET mode: we have hits on a live ship
  if (unsunkHits.length > 0) {
    // If ≥2 hits, try to extend along axis first
    if (unsunkHits.length >= 2) {
      const axisCands = axisNeighbors(unsunkHits, shots);
      if (axisCands.length > 0) {
        return axisCands[Math.floor(Math.random() * axisCands.length)];
      }
    }
    // 1 hit (or axis exhausted): try all neighbors of all unsunk hits
    const allNeighbors = [...new Set(unsunkHits.flatMap(h => neighbors(h, shots)))];
    if (allNeighbors.length > 0) {
      return allNeighbors[Math.floor(Math.random() * allNeighbors.length)];
    }
  }

  // HUNT mode: checkerboard parity (only fire on cells where (r+c) is even)
  const checkerboard = shots
    .map((v, i) => {
      if (v !== null) return null;
      const { r, c } = pos(i);
      return (r + c) % 2 === 0 ? i : null;
    })
    .filter(i => i !== null);

  if (checkerboard.length > 0) {
    return checkerboard[Math.floor(Math.random() * checkerboard.length)];
  }

  // Fallback: any un-shot cell
  const valid = shots.map((v, i) => (v === null ? i : null)).filter(i => i !== null);
  return valid[Math.floor(Math.random() * valid.length)];
}

export function makeInitialState(difficulty = 'easy') {
  return {
    phase:        'setup',
    difficulty,
    playerGrid:   Array(100).fill(null),
    enemyGrid:    Array(100).fill(null),
    playerShots:  Array(100).fill(null),
    enemyShots:   Array(100).fill(null),
    placedShips:  [],
    enemyShips:   [],
    selectedShip: null,
    orientation:  'H',
    turn:         'player',
    winner:       null,
    status:       'Choose a ship below, then click your grid to place it.',
  };
}
