// ── Core Cellular Automata Engine ──

export type GridType = 'square' | 'hexagonal' | 'triangular';
export type EdgeBehavior = 'wrap' | 'finite' | 'reflect';
export type Neighborhood = 'moore' | 'vonNeumann';
export type CollisionMode = 'merge' | 'bounce' | 'pass';
export type DrawTool = 'pen' | 'eraser' | 'line' | 'rectangle' | 'fill' | 'stamp';

export interface RuleSet {
  birth: number[];
  survival: number[];
  states: number; // 2 = binary, 3 = Brian's Brain, etc.
  name: string;
  description: string;
  ruleString: string;
}

export const PRESETS: Record<string, RuleSet> = {
  conway: { birth: [3], survival: [2, 3], states: 2, name: "Conway's Game of Life", description: "The classic. Cells are born with exactly 3 neighbors and survive with 2 or 3.", ruleString: "B3/S23" },
  highlife: { birth: [3, 6], survival: [2, 3], states: 2, name: "HighLife", description: "Like Conway but birth also at 6. Features a replicator pattern.", ruleString: "B36/S23" },
  seeds: { birth: [2], survival: [], states: 2, name: "Seeds", description: "No cell survives. Explosive, chaotic growth from any initial seed.", ruleString: "B2/S" },
  briansBrain: { birth: [2], survival: [], states: 3, name: "Brian's Brain", description: "3-state automaton: alive → dying → dead. Creates chaotic moving patterns.", ruleString: "B2/S (3-state)" },
  dayAndNight: { birth: [3, 6, 7, 8], survival: [3, 4, 6, 7, 8], states: 2, name: "Day & Night", description: "Symmetric rule — dead/alive behave identically under complement.", ruleString: "B3678/S34678" },
  anneal: { birth: [4, 6, 7, 8], survival: [3, 5, 6, 7, 8], states: 2, name: "Anneal", description: "Tends toward large blobs. Resembles annealing in metallurgy.", ruleString: "B4678/S35678" },
};

export function parseRuleString(str: string): { birth: number[]; survival: number[] } | null {
  const m = str.match(/^B(\d*)\/?S(\d*)$/i);
  if (!m) return null;
  return {
    birth: m[1] ? m[1].split('').map(Number) : [],
    survival: m[2] ? m[2].split('').map(Number) : [],
  };
}

export function ruleToString(birth: number[], survival: number[]): string {
  return `B${birth.join('')}/S${survival.join('')}`;
}

// ── Grid Creation ──

export function createGrid(width: number, height: number, states: number = 2): number[][] {
  return Array.from({ length: height }, () => Array(width).fill(0));
}

export function randomizeGrid(grid: number[][], density: number = 0.3, states: number = 2): number[][] {
  return grid.map(row => row.map(() => Math.random() < density ? (states > 2 ? 1 : 1) : 0));
}

export function cloneGrid(grid: number[][]): number[][] {
  return grid.map(r => [...r]);
}

// ── Neighbor Counting ──

function getCell(grid: number[][], r: number, c: number, edge: EdgeBehavior): number {
  const h = grid.length, w = grid[0].length;
  if (edge === 'wrap') {
    return grid[((r % h) + h) % h][((c % w) + w) % w];
  } else if (edge === 'reflect') {
    const rr = r < 0 ? -r : r >= h ? 2 * h - r - 2 : r;
    const cc = c < 0 ? -c : c >= w ? 2 * w - c - 2 : c;
    if (rr < 0 || rr >= h || cc < 0 || cc >= w) return 0;
    return grid[rr][cc];
  }
  // finite
  if (r < 0 || r >= h || c < 0 || c >= w) return 0;
  return grid[r][c];
}

const MOORE_OFFSETS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const VON_NEUMANN_OFFSETS = [[-1,0],[0,-1],[0,1],[1,0]];

// Hex axial offset neighbors (even-q offset)
const HEX_EVEN_OFFSETS = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1]];
const HEX_ODD_OFFSETS = [[-1,0],[1,0],[0,-1],[0,1],[-1,1],[1,1]];

// Triangular neighbors
const TRI_UP_OFFSETS = [[0,-1],[0,1],[-1,0]]; // upward triangle
const TRI_DOWN_OFFSETS = [[0,-1],[0,1],[1,0]]; // downward triangle

export function countNeighbors(
  grid: number[][],
  r: number, c: number,
  gridType: GridType,
  neighborhood: Neighborhood,
  edge: EdgeBehavior,
  states: number
): number {
  let offsets: number[][];

  if (gridType === 'hexagonal') {
    offsets = c % 2 === 0 ? HEX_EVEN_OFFSETS : HEX_ODD_OFFSETS;
  } else if (gridType === 'triangular') {
    offsets = (r + c) % 2 === 0 ? TRI_UP_OFFSETS : TRI_DOWN_OFFSETS;
  } else {
    offsets = neighborhood === 'moore' ? MOORE_OFFSETS : VON_NEUMANN_OFFSETS;
  }

  let count = 0;
  for (const [dr, dc] of offsets) {
    const val = getCell(grid, r + dr, c + dc, edge);
    if (states > 2) {
      if (val === 1) count++; // only count "alive" state, not dying
    } else {
      if (val > 0) count++;
    }
  }
  return count;
}

// ── Step Function ──

export function stepGrid(
  grid: number[][],
  rule: RuleSet,
  gridType: GridType,
  neighborhood: Neighborhood,
  edge: EdgeBehavior
): number[][] {
  const h = grid.length, w = grid[0].length;
  const next = createGrid(w, h);

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const cell = grid[r][c];
      const neighbors = countNeighbors(grid, r, c, gridType, neighborhood, edge, rule.states);

      if (rule.states === 3) {
        // Brian's Brain: 0=dead, 1=alive, 2=dying
        if (cell === 0 && rule.birth.includes(neighbors)) {
          next[r][c] = 1;
        } else if (cell === 1) {
          next[r][c] = 2; // alive -> dying
        } else {
          next[r][c] = 0; // dying -> dead
        }
      } else {
        // Binary automaton
        if (cell === 0) {
          next[r][c] = rule.birth.includes(neighbors) ? 1 : 0;
        } else {
          next[r][c] = rule.survival.includes(neighbors) ? 1 : 0;
        }
      }
    }
  }
  return next;
}

// ── Patterns (stored as [row, col] offsets) ──

export interface Pattern {
  name: string;
  cells: [number, number][];
  width: number;
  height: number;
}

export const PATTERNS: Pattern[] = [
  { name: "Glider", width: 3, height: 3, cells: [[0,1],[1,2],[2,0],[2,1],[2,2]] },
  { name: "LWSS", width: 5, height: 4, cells: [[0,1],[0,4],[1,0],[2,0],[2,4],[3,0],[3,1],[3,2],[3,3]] },
  { name: "MWSS", width: 6, height: 5, cells: [[0,2],[1,0],[1,4],[2,5],[3,0],[3,5],[4,1],[4,2],[4,3],[4,4],[4,5]] },
  { name: "Pulsar", width: 13, height: 13, cells: (() => {
    const c: [number,number][] = [];
    const rows = [
      [0, [2,3,4,8,9,10]],
      [2, [0,5,7,12]],
      [3, [0,5,7,12]],
      [4, [0,5,7,12]],
      [5, [2,3,4,8,9,10]],
      [7, [2,3,4,8,9,10]],
      [8, [0,5,7,12]],
      [9, [0,5,7,12]],
      [10, [0,5,7,12]],
      [12, [2,3,4,8,9,10]],
    ] as [number, number[]][];
    for (const [r, cols] of rows) for (const col of cols) c.push([r, col]);
    return c;
  })() },
  { name: "Gosper Glider Gun", width: 36, height: 9, cells: [
    [0,24],[1,22],[1,24],[2,12],[2,13],[2,20],[2,21],[2,34],[2,35],
    [3,11],[3,15],[3,20],[3,21],[3,34],[3,35],[4,0],[4,1],[4,10],[4,16],[4,20],[4,21],
    [5,0],[5,1],[5,10],[5,14],[5,16],[5,17],[5,22],[5,24],[6,10],[6,16],[6,24],
    [7,11],[7,15],[8,12],[8,13]
  ] },
  { name: "Diehard", width: 8, height: 3, cells: [[0,6],[1,0],[1,1],[2,1],[2,5],[2,6],[2,7]] },
  { name: "Acorn", width: 7, height: 3, cells: [[0,1],[1,3],[2,0],[2,1],[2,4],[2,5],[2,6]] },
  { name: "R-pentomino", width: 3, height: 3, cells: [[0,1],[0,2],[1,0],[1,1],[2,1]] },
];

// ── RLE Export / Import ──

export function gridToRLE(grid: number[][]): string {
  const h = grid.length, w = grid[0].length;
  let rle = `x = ${w}, y = ${h}, rule = B3/S23\n`;
  for (let r = 0; r < h; r++) {
    let run = 0, lastChar = '';
    for (let c = 0; c < w; c++) {
      const ch = grid[r][c] > 0 ? 'o' : 'b';
      if (ch === lastChar) { run++; } 
      else {
        if (lastChar) rle += (run > 1 ? run : '') + lastChar;
        lastChar = ch; run = 1;
      }
    }
    if (lastChar) rle += (run > 1 ? run : '') + lastChar;
    rle += r < h - 1 ? '$' : '!';
  }
  return rle;
}

export function rleToGrid(rle: string, maxW: number, maxH: number): number[][] | null {
  try {
    const lines = rle.trim().split('\n');
    let dataStart = 0;
    let w = maxW, h = maxH;
    for (let i = 0; i < lines.length; i++) {
      const hdr = lines[i].match(/x\s*=\s*(\d+)\s*,\s*y\s*=\s*(\d+)/i);
      if (hdr) { w = Math.min(parseInt(hdr[1]), maxW); h = Math.min(parseInt(hdr[2]), maxH); dataStart = i + 1; break; }
      if (!lines[i].startsWith('#')) { dataStart = i; break; }
    }
    const data = lines.slice(dataStart).join('').replace(/\s/g, '');
    const grid = createGrid(w, h);
    let r = 0, c = 0, num = '';
    for (const ch of data) {
      if (ch === '!') break;
      if (ch >= '0' && ch <= '9') { num += ch; continue; }
      const count = num ? parseInt(num) : 1; num = '';
      if (ch === 'b') { c += count; }
      else if (ch === 'o') { for (let i = 0; i < count && c < w; i++, c++) if (r < h) grid[r][c] = 1; }
      else if (ch === '$') { r += count; c = 0; }
    }
    return grid;
  } catch { return null; }
}

// ── Flood Fill ──

export function floodFill(grid: number[][], r: number, c: number, newState: number): number[][] {
  const h = grid.length, w = grid[0].length;
  if (r < 0 || r >= h || c < 0 || c >= w) return grid;
  const target = grid[r][c];
  if (target === newState) return grid;
  const result = cloneGrid(grid);
  const stack: [number, number][] = [[r, c]];
  while (stack.length > 0) {
    const [cr, cc] = stack.pop()!;
    if (cr < 0 || cr >= h || cc < 0 || cc >= w) continue;
    if (result[cr][cc] !== target) continue;
    result[cr][cc] = newState;
    stack.push([cr-1,cc],[cr+1,cc],[cr,cc-1],[cr,cc+1]);
  }
  return result;
}

// ── Line drawing (Bresenham) ──

export function bresenhamLine(r0: number, c0: number, r1: number, c1: number): [number, number][] {
  const points: [number, number][] = [];
  let dr = Math.abs(r1 - r0), dc = Math.abs(c1 - c0);
  let sr = r0 < r1 ? 1 : -1, sc = c0 < c1 ? 1 : -1;
  let err = dr - dc;
  let r = r0, c = c0;
  while (true) {
    points.push([r, c]);
    if (r === r1 && c === c1) break;
    const e2 = 2 * err;
    if (e2 > -dc) { err -= dc; r += sr; }
    if (e2 < dr) { err += dr; c += sc; }
  }
  return points;
}
