import { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from "react";
import { DrawTool, GridType, Pattern, floodFill, bresenhamLine, cloneGrid } from "@/lib/cellularAutomata";

interface Props {
  grid: number[][];
  setGrid: (g: number[][]) => void;
  cellSize: number;
  gridType: GridType;
  drawTool: DrawTool;
  stampPattern: Pattern | null;
  liveColor: string;
  deadColor: string;
  gridLineColor: string;
  showGridLines: boolean;
  trailMode: boolean;
  ageGrid: number[][] | null;
  colorScheme: string;
  states: number;
}

export interface CACanvasHandle {
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

const CACanvas = forwardRef<CACanvasHandle, Props>(function CACanvas({
  grid, setGrid, cellSize, gridType, drawTool, stampPattern,
  liveColor, deadColor, gridLineColor, showGridLines,
  trailMode, ageGrid, colorScheme, states
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [drawing, setDrawing] = useState(false);
  const [lineStart, setLineStart] = useState<[number, number] | null>(null);
  const [rectStart, setRectStart] = useState<[number, number] | null>(null);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const h = grid.length, w = grid[0]?.length || 0;

  // Compute grid pixel dimensions
  const gridPixelW = w * cellSize;
  const gridPixelH = h * cellSize;

  // Compute minimum zoom to fit grid with margin
  const getMinZoom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 0.1;
    const margin = 20;
    const zx = (container.clientWidth - margin * 2) / gridPixelW;
    const zy = (container.clientHeight - margin * 2) / gridPixelH;
    return Math.min(zx, zy, 1);
  }, [gridPixelW, gridPixelH]);

  const clampZoom = useCallback((z: number) => {
    return Math.max(getMinZoom(), Math.min(4, z));
  }, [getMinZoom]);

  const clampPan = useCallback((nextPan: { x: number; y: number }, z: number) => {
    const container = containerRef.current;
    if (!container) return nextPan;

    const margin = 24;
    const scaledW = gridPixelW * z;
    const scaledH = gridPixelH * z;
    const centeredX = (container.clientWidth - scaledW) / 2;
    const centeredY = (container.clientHeight - scaledH) / 2;

    let x = nextPan.x;
    let y = nextPan.y;

    if (scaledW + margin * 2 <= container.clientWidth) {
      x = centeredX;
    } else {
      const minX = container.clientWidth - scaledW - margin;
      const maxX = margin;
      x = Math.min(maxX, Math.max(minX, x));
    }

    if (scaledH + margin * 2 <= container.clientHeight) {
      y = centeredY;
    } else {
      const minY = container.clientHeight - scaledH - margin;
      const maxY = margin;
      y = Math.min(maxY, Math.max(minY, y));
    }

    return { x, y };
  }, [gridPixelW, gridPixelH]);

  // Center grid in container
  const getCenteredPan = useCallback((z: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    return {
      x: (container.clientWidth - gridPixelW * z) / 2,
      y: (container.clientHeight - gridPixelH * z) / 2,
    };
  }, [gridPixelW, gridPixelH]);

  const resetView = useCallback(() => {
    const z = getMinZoom();
    setZoom(z);
    setPan(getCenteredPan(z));
  }, [getCenteredPan, getMinZoom]);

  const zoomBy = useCallback((factor: number, cx?: number, cy?: number) => {
    setZoom(prevZ => {
      const newZ = clampZoom(prevZ * factor);
      const container = containerRef.current;
      if (!container) return newZ;
      const minZoom = getMinZoom();
      // Zoom toward center of container or cursor
      const focusX = cx ?? container.clientWidth / 2;
      const focusY = cy ?? container.clientHeight / 2;

      if (newZ <= minZoom + 0.001) {
        setPan(getCenteredPan(newZ));
        return newZ;
      }

      setPan(prevPan => clampPan({
        x: focusX - (focusX - prevPan.x) * (newZ / prevZ),
        y: focusY - (focusY - prevPan.y) * (newZ / prevZ),
      }, newZ));
      return newZ;
    });
  }, [clampPan, clampZoom, getCenteredPan, getMinZoom]);

  useImperativeHandle(ref, () => ({
    resetView,
    zoomIn: () => zoomBy(1.2),
    zoomOut: () => zoomBy(1 / 1.2),
  }), [resetView, zoomBy]);

  // Reset view when grid dimensions change
  useEffect(() => {
    // Small delay to let container render
    const t = setTimeout(resetView, 50);
    return () => clearTimeout(t);
  }, [w, h, cellSize]);

  const screenToCell = useCallback((sx: number, sy: number): [number, number] => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    const x = (sx - rect.left - pan.x) / zoom;
    const y = (sy - rect.top - pan.y) / zoom;

    if (gridType === 'hexagonal') {
      const hexW = cellSize * 1.5;
      const hexH = cellSize * Math.sqrt(3);
      const col = Math.floor(x / hexW);
      const offsetY = col % 2 === 1 ? hexH / 2 : 0;
      const row = Math.floor((y - offsetY) / hexH);
      return [Math.max(0, Math.min(h - 1, row)), Math.max(0, Math.min(w - 1, col))];
    }

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    return [Math.max(0, Math.min(h - 1, row)), Math.max(0, Math.min(w - 1, col))];
  }, [pan, zoom, cellSize, gridType, h, w]);

  const getCellColor = useCallback((val: number, r: number, c: number): string => {
    if (val === 0) return deadColor;
    if (states === 3 && val === 2) return '#666666';
    if (colorScheme === 'age' && ageGrid) {
      const age = ageGrid[r]?.[c] || 0;
      const t = Math.min(age / 50, 1);
      const rC = Math.round(255 * (1 - t) + 255 * t);
      const gC = Math.round(200 * (1 - t));
      const bC = Math.round(50 * (1 - t) + 200 * t);
      return `rgb(${rC},${gC},${bC})`;
    }
    return liveColor;
  }, [deadColor, liveColor, colorScheme, ageGrid, states]);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth * window.devicePixelRatio;
      canvas.height = container.clientHeight * window.devicePixelRatio;
      canvas.style.width = container.clientWidth + 'px';
      canvas.style.height = container.clientHeight + 'px';
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    ctx.fillStyle = deadColor;
    ctx.fillRect(0, 0, w * cellSize, h * cellSize);

    if (gridType === 'hexagonal') {
      drawHexGrid(ctx);
    } else if (gridType === 'triangular') {
      drawTriGrid(ctx);
    } else {
      drawSquareGrid(ctx);
    }

    ctx.restore();
  });

  function drawSquareGrid(ctx: CanvasRenderingContext2D) {
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (grid[r][c] > 0) {
          ctx.fillStyle = getCellColor(grid[r][c], r, c);
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }
    if (showGridLines && zoom > 0.3) {
      ctx.strokeStyle = gridLineColor;
      ctx.lineWidth = 0.5 / zoom;
      for (let r = 0; r <= h; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * cellSize); ctx.lineTo(w * cellSize, r * cellSize); ctx.stroke();
      }
      for (let c = 0; c <= w; c++) {
        ctx.beginPath(); ctx.moveTo(c * cellSize, 0); ctx.lineTo(c * cellSize, h * cellSize); ctx.stroke();
      }
    }
  }

  function drawHexGrid(ctx: CanvasRenderingContext2D) {
    const hexW = cellSize * 1.5;
    const hexH = cellSize * Math.sqrt(3);
    const hexR = cellSize;
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const cx = c * hexW + hexR;
        const cy = r * hexH + hexH / 2 + (c % 2 === 1 ? hexH / 2 : 0);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI / 180 * (60 * i - 30);
          const px = cx + hexR * Math.cos(angle);
          const py = cy + hexR * Math.sin(angle);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = getCellColor(grid[r][c], r, c);
        ctx.fill();
        if (showGridLines && zoom > 0.3) {
          ctx.strokeStyle = gridLineColor;
          ctx.lineWidth = 0.5 / zoom;
          ctx.stroke();
        }
      }
    }
  }

  function drawTriGrid(ctx: CanvasRenderingContext2D) {
    const triW = cellSize;
    const triH = cellSize * Math.sqrt(3) / 2;
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const up = (r + c) % 2 === 0;
        const x = c * triW / 2;
        const y = r * triH;
        ctx.beginPath();
        if (up) {
          ctx.moveTo(x, y + triH);
          ctx.lineTo(x + triW / 2, y);
          ctx.lineTo(x + triW, y + triH);
        } else {
          ctx.moveTo(x, y);
          ctx.lineTo(x + triW, y);
          ctx.lineTo(x + triW / 2, y + triH);
        }
        ctx.closePath();
        ctx.fillStyle = getCellColor(grid[r][c], r, c);
        ctx.fill();
        if (showGridLines && zoom > 0.3) {
          ctx.strokeStyle = gridLineColor;
          ctx.lineWidth = 0.5 / zoom;
          ctx.stroke();
        }
      }
    }
  }

  // Mouse handlers - left click = draw or pan depending on tool
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click or alt+click = pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const [r, c] = screenToCell(e.clientX, e.clientY);

    if (drawTool === 'stamp' && stampPattern) {
      const newGrid = cloneGrid(grid);
      for (const [dr, dc] of stampPattern.cells) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < h && nc >= 0 && nc < w) newGrid[nr][nc] = 1;
      }
      setGrid(newGrid);
      return;
    }

    if (drawTool === 'fill') {
      setGrid(floodFill(grid, r, c, grid[r][c] === 0 ? 1 : 0));
      return;
    }

    if (drawTool === 'line') {
      if (!lineStart) { setLineStart([r, c]); return; }
      const newGrid = cloneGrid(grid);
      for (const [lr, lc] of bresenhamLine(lineStart[0], lineStart[1], r, c)) {
        if (lr >= 0 && lr < h && lc >= 0 && lc < w) newGrid[lr][lc] = 1;
      }
      setGrid(newGrid);
      setLineStart(null);
      return;
    }

    if (drawTool === 'rectangle') {
      if (!rectStart) { setRectStart([r, c]); return; }
      const newGrid = cloneGrid(grid);
      const [r0, c0] = rectStart;
      const rMin = Math.min(r0, r), rMax = Math.max(r0, r);
      const cMin = Math.min(c0, c), cMax = Math.max(c0, c);
      for (let ri = rMin; ri <= rMax; ri++)
        for (let ci = cMin; ci <= cMax; ci++)
          if (ri < h && ci < w) newGrid[ri][ci] = 1;
      setGrid(newGrid);
      setRectStart(null);
      return;
    }

    setDrawing(true);
    const newGrid = cloneGrid(grid);
    const val = drawTool === 'eraser' ? 0 : (grid[r][c] === 0 ? 1 : 0);
    newGrid[r][c] = val;
    setGrid(newGrid);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current) {
      setPan(p => clampPan({ x: p.x + e.clientX - lastMouse.current.x, y: p.y + e.clientY - lastMouse.current.y }, zoom));
      lastMouse.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (!drawing) return;
    const [r, c] = screenToCell(e.clientX, e.clientY);
    const newGrid = cloneGrid(grid);
    newGrid[r][c] = drawTool === 'eraser' ? 0 : 1;
    setGrid(newGrid);
  };

  const handleMouseUp = () => { setDrawing(false); isPanning.current = false; };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
    zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top);
  };

  // Touch support
  const touchRef = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchRef.current = {
        dist: Math.sqrt(dx * dx + dy * dy),
        cx: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        cy: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const [r, c] = screenToCell(touch.clientX, touch.clientY);
      const newGrid = cloneGrid(grid);
      newGrid[r][c] = drawTool === 'eraser' ? 0 : (grid[r][c] === 0 ? 1 : 0);
      setGrid(newGrid);
      setDrawing(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / touchRef.current.dist;
      const containerRect = containerRef.current?.getBoundingClientRect();
      const focusX = containerRect ? ((e.touches[0].clientX + e.touches[1].clientX) / 2) - containerRect.left : undefined;
      const focusY = containerRect ? ((e.touches[0].clientY + e.touches[1].clientY) / 2) - containerRect.top : undefined;
      zoomBy(scale, focusX, focusY);
      touchRef.current.dist = dist;
    } else if (e.touches.length === 1 && drawing) {
      const [r, c] = screenToCell(e.touches[0].clientX, e.touches[0].clientY);
      if (r >= 0 && r < h && c >= 0 && c < w) {
        const newGrid = cloneGrid(grid);
        newGrid[r][c] = drawTool === 'eraser' ? 0 : 1;
        setGrid(newGrid);
      }
    }
  };

  const handleTouchEnd = () => { setDrawing(false); touchRef.current = null; };

  // Prevent page scroll when wheeling over canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const prevent = (e: WheelEvent) => { e.preventDefault(); };
    container.addEventListener('wheel', prevent, { passive: false });
    return () => container.removeEventListener('wheel', prevent);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden rounded-lg border border-border bg-muted/30 cursor-crosshair touch-none"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="block w-full h-full"
      />
    </div>
  );
});

export default CACanvas;
