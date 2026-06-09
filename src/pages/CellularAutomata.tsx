import { useState, useRef, useCallback, useEffect } from "react";
import Layout from "@/components/Layout";
import CACanvas, { CACanvasHandle } from "@/components/cellular-automata/CACanvas";
import CAControls from "@/components/cellular-automata/CAControls";
import CAInfoPanel from "@/components/cellular-automata/CAInfoPanel";
import {
  GridType, EdgeBehavior, Neighborhood, DrawTool, RuleSet, PRESETS, Pattern,
  createGrid, randomizeGrid, stepGrid, cloneGrid,
} from "@/lib/cellularAutomata";
import { useTheme } from "@/contexts/ThemeContext";
import { RotateCcw, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEFAULT_W = 50;
const DEFAULT_H = 50;

export default function CellularAutomata() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const canvasRef = useRef<CACanvasHandle>(null);

  // Grid settings
  const [gridW, setGridW] = useState(DEFAULT_W);
  const [gridH, setGridH] = useState(DEFAULT_H);
  const [cellSize, setCellSize] = useState(10);
  const [gridType, setGridType] = useState<GridType>('square');
  const [edge, setEdge] = useState<EdgeBehavior>('wrap');
  const [neighborhood, setNeighborhood] = useState<Neighborhood>('moore');

  // Rule
  const [rule, setRule] = useState<RuleSet>(PRESETS.conway);

  // Simulation
  const [grid, setGrid] = useState(() => createGrid(DEFAULT_W, DEFAULT_H));
  const [ageGrid, setAgeGrid] = useState<number[][]>(() => createGrid(DEFAULT_W, DEFAULT_H));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [generation, setGeneration] = useState(0);
  const [history, setHistory] = useState<number[][][]>([]);
  const [historyLength, setHistoryLength] = useState(50);

  // Appearance
  const [liveColor, setLiveColor] = useState(isDark ? '#60a5fa' : '#3b82f6');
  const [deadColor, setDeadColor] = useState(isDark ? '#1e293b' : '#f1f5f9');
  const [gridLineColor, setGridLineColor] = useState(isDark ? '#334155' : '#cbd5e1');
  const [showGridLines, setShowGridLines] = useState(true);
  const [trailMode, setTrailMode] = useState(false);
  const [colorScheme, setColorScheme] = useState('mono');

  // Performance
  const [showFps, setShowFps] = useState(false);
  const [fps, setFps] = useState(0);

  // Drawing
  const [drawTool, setDrawTool] = useState<DrawTool>('pen');
  const [stampPattern, setStampPattern] = useState<Pattern | null>(null);
  const [density, setDensity] = useState(0.3);

  // Update colors when theme changes
  useEffect(() => {
    setLiveColor(isDark ? '#60a5fa' : '#3b82f6');
    setDeadColor(isDark ? '#1e293b' : '#f1f5f9');
    setGridLineColor(isDark ? '#334155' : '#cbd5e1');
  }, [isDark]);

  // Rebuild grid when dimensions change
  useEffect(() => {
    setGrid(createGrid(gridW, gridH));
    setAgeGrid(createGrid(gridW, gridH));
    setGeneration(0);
    setHistory([]);
  }, [gridW, gridH]);

  // Simulation Loop
  const playingRef = useRef(playing);
  const speedRef = useRef(speed);
  const gridRef = useRef(grid);
  const ageGridRef = useRef(ageGrid);
  const ruleRef = useRef(rule);
  const gridTypeRef = useRef(gridType);
  const neighborhoodRef = useRef(neighborhood);
  const edgeRef = useRef(edge);
  const historyRef = useRef(history);
  const historyLengthRef = useRef(historyLength);

  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { ageGridRef.current = ageGrid; }, [ageGrid]);
  useEffect(() => { ruleRef.current = rule; }, [rule]);
  useEffect(() => { gridTypeRef.current = gridType; }, [gridType]);
  useEffect(() => { neighborhoodRef.current = neighborhood; }, [neighborhood]);
  useEffect(() => { edgeRef.current = edge; }, [edge]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { historyLengthRef.current = historyLength; }, [historyLength]);

  useEffect(() => {
    let lastTime = performance.now();
    let accumulator = 0;
    let frameCount = 0;
    let fpsTimer = 0;
    let raf: number;

    const loop = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      fpsTimer += dt;
      frameCount++;

      if (fpsTimer >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        fpsTimer = 0;
      }

      if (playingRef.current) {
        const interval = 1000 / (speedRef.current * 5);
        accumulator += dt;
        if (accumulator >= interval) {
          accumulator -= interval;
          doStep();
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const doStep = useCallback(() => {
    const currentGrid = gridRef.current;
    const currentAge = ageGridRef.current;

    if (historyLengthRef.current > 0) {
      const h = [...historyRef.current, cloneGrid(currentGrid)];
      if (h.length > historyLengthRef.current) h.shift();
      setHistory(h);
    }

    const nextGrid = stepGrid(currentGrid, ruleRef.current, gridTypeRef.current, neighborhoodRef.current, edgeRef.current);
    const nextAge = currentAge.map((row, r) =>
      row.map((age, c) => nextGrid[r][c] > 0 ? age + 1 : 0)
    );

    setGrid(nextGrid);
    setAgeGrid(nextAge);
    setGeneration(g => g + 1);
  }, []);

  const handleStep = () => doStep();

  const handleStepBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setGrid(prev);
    setGeneration(g => Math.max(0, g - 1));
  };

  const handleReset = () => {
    setGrid(createGrid(gridW, gridH));
    setAgeGrid(createGrid(gridW, gridH));
    setGeneration(0);
    setHistory([]);
    setPlaying(false);
  };

  const handleRandomize = () => {
    setGrid(randomizeGrid(createGrid(gridW, gridH), density, rule.states));
    setAgeGrid(createGrid(gridW, gridH));
    setGeneration(0);
    setHistory([]);
  };

  const handleClear = () => {
    setGrid(createGrid(gridW, gridH));
    setAgeGrid(createGrid(gridW, gridH));
    setGeneration(0);
  };

  const handleResetGridSize = () => {
    setGridW(DEFAULT_W);
    setGridH(DEFAULT_H);
  };

  const handleZoomIn = useCallback(() => {
    canvasRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    canvasRef.current?.zoomOut();
  }, []);

  const handleResetView = useCallback(() => {
    canvasRef.current?.resetView();
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;
      const code = e.code;
      const lowerKey = key.toLowerCase();

      if (key === ' ' || code === 'Space') {
        e.preventDefault();
        setPlaying((p) => !p);
        return;
      }

      if (key === 'ArrowRight' || code === 'ArrowRight') {
        e.preventDefault();
        doStep();
        return;
      }

      if (key === 'ArrowLeft' || code === 'ArrowLeft') {
        e.preventDefault();
        handleStepBack();
        return;
      }

      if (lowerKey === 'r') {
        e.preventDefault();
        handleRandomize();
        return;
      }

      if (lowerKey === 'c') {
        e.preventDefault();
        handleClear();
        return;
      }

      if (lowerKey === 'd') {
        e.preventDefault();
        setDrawTool((t) => t === 'pen' ? 'eraser' : 'pen');
        return;
      }

      if (code === 'Equal' || code === 'NumpadAdd' || key === '+' || key === '=') {
        e.preventDefault();
        handleZoomIn();
        return;
      }

      if (code === 'Minus' || code === 'NumpadSubtract' || key === '-') {
        e.preventDefault();
        handleZoomOut();
        return;
      }

      if (code === 'Digit0' || code === 'Numpad0' || key === '0') {
        e.preventDefault();
        handleResetView();
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [doStep, handleStepBack, handleRandomize, handleClear, handleZoomIn, handleZoomOut, handleResetView]);

  useEffect(() => {
    document.title = "Cellular Automata Playground | ClutchSAT";
  }, []);

  const canvasProps = {
    grid, setGrid, cellSize,
    gridType, drawTool, stampPattern,
    liveColor, deadColor, gridLineColor,
    showGridLines, trailMode, ageGrid,
    colorScheme, states: rule.states,
  };

  const viewControls = (
    <div className="flex items-center gap-1">
      <Button size="icon" variant="ghost" onClick={handleZoomIn} className="h-8 w-8" title="Zoom In (+)">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" onClick={handleZoomOut} className="h-8 w-8" title="Zoom Out (-)">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" onClick={handleResetView} className="h-8 w-8" title="Reset View (0)">
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const controlsComponent = (
    <CAControls
      playing={playing} setPlaying={setPlaying}
      onStep={handleStep} onStepBack={handleStepBack} canStepBack={history.length > 0}
      onReset={handleReset} onRandomize={handleRandomize} onClear={handleClear}
      onResetGridSize={handleResetGridSize}
      speed={speed} setSpeed={setSpeed}
      generation={generation}
      gridType={gridType} setGridType={setGridType}
      gridW={gridW} setGridW={setGridW}
      gridH={gridH} setGridH={setGridH}
      cellSize={cellSize} setCellSize={setCellSize}
      edge={edge} setEdge={setEdge}
      neighborhood={neighborhood} setNeighborhood={setNeighborhood}
      rule={rule} setRule={setRule}
      liveColor={liveColor} setLiveColor={setLiveColor}
      deadColor={deadColor} setDeadColor={setDeadColor}
      gridLineColor={gridLineColor} setGridLineColor={setGridLineColor}
      showGridLines={showGridLines} setShowGridLines={setShowGridLines}
      trailMode={trailMode} setTrailMode={setTrailMode}
      colorScheme={colorScheme} setColorScheme={setColorScheme}
      historyLength={historyLength} setHistoryLength={setHistoryLength}
      showFps={showFps} setShowFps={setShowFps}
      drawTool={drawTool} setDrawTool={setDrawTool}
      stampPattern={stampPattern} setStampPattern={setStampPattern}
      density={density} setDensity={setDensity}
      grid={grid} setGrid={setGrid}
      gridMaxW={200} gridMaxH={200}
      viewControls={viewControls}
    />
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            <span className="text-gradient">Cellular Automata</span>{" "}
            <span className="text-foreground">Playground</span>
          </h1>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Explore <span className="font-semibold text-foreground/80">Conway's Game of Life</span>, custom rules, and exotic grids — draw, simulate, and discover emergent behavior.
          </p>
        </div>

        {/* Single responsive layout — one CACanvas instance. On desktop the canvas dominates; sidebar scrolls independently */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          {/* Canvas area */}
          <div className="relative w-full flex-none min-h-[320px] h-[clamp(320px,52vh,500px)] lg:h-[calc(100vh-180px)] lg:flex-1">
            <CACanvas ref={canvasRef} {...canvasProps} />
            {showFps && (
              <div className="absolute top-2 right-2 bg-background/80 text-xs font-mono px-2 py-1 rounded border border-border">
                {fps} FPS
              </div>
            )}
          </div>

          {/* Controls sidebar (right on desktop, below on mobile) */}
          <div className="w-full lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:max-h-[calc(100vh-180px)] lg:pr-1 space-y-4 pb-20 lg:pb-0">
            {controlsComponent}
          </div>
        </div>

        {/* Info panel below */}
        <div className="mt-6">
          <CAInfoPanel rule={rule} />
        </div>
      </div>
    </Layout>
  );
}
