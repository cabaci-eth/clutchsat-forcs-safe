import { useState, ReactNode } from "react";
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Shuffle, Trash2, Keyboard, ChevronDown, ChevronRight, Ruler, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  GridType, EdgeBehavior, Neighborhood, DrawTool, RuleSet, PRESETS, Pattern, PATTERNS, parseRuleString, ruleToString, gridToRLE, rleToGrid,
} from "@/lib/cellularAutomata";

interface Props {
  playing: boolean; setPlaying: (v: boolean) => void;
  onStep: () => void; onStepBack: () => void; canStepBack: boolean;
  onReset: () => void; onRandomize: () => void; onClear: () => void;
  onResetGridSize: () => void;
  speed: number; setSpeed: (v: number) => void;
  generation: number;
  gridType: GridType; setGridType: (v: GridType) => void;
  gridW: number; setGridW: (v: number) => void;
  gridH: number; setGridH: (v: number) => void;
  cellSize: number; setCellSize: (v: number) => void;
  edge: EdgeBehavior; setEdge: (v: EdgeBehavior) => void;
  neighborhood: Neighborhood; setNeighborhood: (v: Neighborhood) => void;
  rule: RuleSet; setRule: (v: RuleSet) => void;
  liveColor: string; setLiveColor: (v: string) => void;
  deadColor: string; setDeadColor: (v: string) => void;
  gridLineColor: string; setGridLineColor: (v: string) => void;
  showGridLines: boolean; setShowGridLines: (v: boolean) => void;
  trailMode: boolean; setTrailMode: (v: boolean) => void;
  colorScheme: string; setColorScheme: (v: string) => void;
  historyLength: number; setHistoryLength: (v: number) => void;
  showFps: boolean; setShowFps: (v: boolean) => void;
  drawTool: DrawTool; setDrawTool: (v: DrawTool) => void;
  stampPattern: Pattern | null; setStampPattern: (v: Pattern | null) => void;
  density: number; setDensity: (v: number) => void;
  grid: number[][];
  setGrid: (g: number[][]) => void;
  gridMaxW: number; gridMaxH: number;
  viewControls?: ReactNode;
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-1 text-sm font-semibold text-foreground hover:text-primary transition-colors">
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-1 pb-3 space-y-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ShortcutItem({ icon, keys, label }: { icon: ReactNode; keys: string[]; label: string }) {
  return (
    <div className="grid grid-cols-[1.25rem_auto_1fr] items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex flex-wrap items-center gap-1">
        {keys.map((key) => (
          <kbd key={key} className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground shadow-sm">
            {key}
          </kbd>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default function CAControls(props: Props) {
  const {
    playing, setPlaying, onStep, onStepBack, canStepBack, onReset, onRandomize, onClear, onResetGridSize,
    speed, setSpeed, generation,
    gridType, setGridType, gridW, setGridW, gridH, setGridH,
    cellSize, setCellSize, edge, setEdge, neighborhood, setNeighborhood,
    rule, setRule,
    liveColor, setLiveColor, deadColor, setDeadColor, gridLineColor, setGridLineColor,
    showGridLines, setShowGridLines, trailMode, setTrailMode, colorScheme, setColorScheme,
    historyLength, setHistoryLength, showFps, setShowFps,
    drawTool, setDrawTool, stampPattern, setStampPattern,
    density, setDensity,
    grid, setGrid, gridMaxW, gridMaxH,
    viewControls,
  } = props;

  const [ruleInput, setRuleInput] = useState(rule.ruleString);
  const [rleImport, setRleImport] = useState('');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const applyPreset = (key: string) => {
    const p = PRESETS[key];
    if (p) { setRule(p); setRuleInput(p.ruleString); }
  };

  const applyCustomRule = () => {
    const parsed = parseRuleString(ruleInput);
    if (parsed) {
      setRule({ ...rule, ...parsed, name: 'Custom', description: 'Custom rule', ruleString: ruleToString(parsed.birth, parsed.survival), states: rule.states });
    }
  };

  const handleExportRLE = () => {
    const rle = gridToRLE(grid);
    navigator.clipboard.writeText(rle);
  };

  const handleImportRLE = () => {
    const result = rleToGrid(rleImport, gridMaxW, gridMaxH);
    if (result) setGrid(result);
  };

  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'cellular-automata.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const tools: { id: DrawTool; label: string }[] = [
    { id: 'pen', label: '✏️ Pen' },
    { id: 'eraser', label: '🧹 Eraser' },
    { id: 'line', label: '📏 Line' },
    { id: 'rectangle', label: '⬜ Rect' },
    { id: 'fill', label: '🪣 Fill' },
    { id: 'stamp', label: '📋 Stamp' },
  ];

  return (
    <div className="space-y-1">
      {/* Top Control Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-card border border-border">
        <Button size="sm" variant={playing ? "destructive" : "default"} onClick={() => setPlaying(!playing)} className="min-h-[44px] min-w-[44px]">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="outline" onClick={onStep} disabled={playing} className="min-h-[44px]">
          <SkipForward className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onStepBack} disabled={playing || !canStepBack} className="min-h-[44px]">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onReset} className="min-h-[44px]">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onRandomize} className="min-h-[44px]">
          <Shuffle className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onClear} className="min-h-[44px]">
          <Trash2 className="h-4 w-4" />
        </Button>
        {viewControls}
        <div className="flex items-center gap-2 ml-auto">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Speed</Label>
          <Slider value={[speed]} onValueChange={([v]) => setSpeed(v)} min={0.5} max={10} step={0.5} className="w-24" />
          <span className="text-xs font-mono text-muted-foreground w-8">{speed}x</span>
        </div>
        <div className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
          Gen: {generation}
        </div>
      </div>

      <Collapsible open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <div className="rounded-xl border border-border bg-card p-3 shadow-card">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-lg text-left transition-colors hover:text-primary">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Keyboard shortcuts</p>
                <p className="text-xs text-muted-foreground">Hidden by default — expand when you need the full map.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>{shortcutsOpen ? 'Hide' : 'Show'}</span>
              {shortcutsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <ShortcutItem icon={<Play className="h-3.5 w-3.5" />} keys={["Space"]} label="Play / pause" />
              <ShortcutItem icon={<SkipForward className="h-3.5 w-3.5" />} keys={["→"]} label="Step forward" />
              <ShortcutItem icon={<SkipBack className="h-3.5 w-3.5" />} keys={["←"]} label="Step backward" />
              <ShortcutItem icon={<Shuffle className="h-3.5 w-3.5" />} keys={["R"]} label="Randomize grid" />
              <ShortcutItem icon={<Trash2 className="h-3.5 w-3.5" />} keys={["C"]} label="Clear grid" />
              <ShortcutItem icon={<ZoomIn className="h-3.5 w-3.5" />} keys={["+", "="]} label="Zoom in" />
              <ShortcutItem icon={<ZoomOut className="h-3.5 w-3.5" />} keys={["-"]} label="Zoom out" />
              <ShortcutItem icon={<Maximize2 className="h-3.5 w-3.5" />} keys={["0"]} label="Reset view" />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Sidebar Sections */}
      <div className="space-y-1">
        <Section title="Grid & Geometry">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Grid Type</Label>
              <Select value={gridType} onValueChange={(v) => setGridType(v as GridType)}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="hexagonal">Hexagonal</SelectItem>
                  <SelectItem value="triangular">Triangular</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Width: {gridW}</Label>
                <Slider value={[gridW]} onValueChange={([v]) => setGridW(v)} min={10} max={200} step={1} />
              </div>
              <div>
                <Label className="text-xs">Height: {gridH}</Label>
                <Slider value={[gridH]} onValueChange={([v]) => setGridH(v)} min={10} max={200} step={1} />
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={onResetGridSize} className="w-full min-h-[44px] text-xs">
              <Ruler className="h-3 w-3 mr-1" /> Reset Grid Size (50×50)
            </Button>
            <div>
              <Label className="text-xs">Cell Size: {cellSize}px</Label>
              <Slider value={[cellSize]} onValueChange={([v]) => setCellSize(v)} min={4} max={30} step={1} />
            </div>
            <div>
              <Label className="text-xs">Edge Behavior</Label>
              <Select value={edge} onValueChange={(v) => setEdge(v as EdgeBehavior)}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wrap">Wrap (Torus)</SelectItem>
                  <SelectItem value="finite">Finite (Dead Edges)</SelectItem>
                  <SelectItem value="reflect">Reflect</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {gridType === 'square' && (
              <div>
                <Label className="text-xs">Neighborhood</Label>
                <Select value={neighborhood} onValueChange={(v) => setNeighborhood(v as Neighborhood)}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moore">Moore (8 neighbors)</SelectItem>
                    <SelectItem value="vonNeumann">Von Neumann (4)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Section>

        <Section title="Rules">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Preset</Label>
              <Select onValueChange={applyPreset} value={Object.entries(PRESETS).find(([, v]) => v.ruleString === rule.ruleString)?.[0] || ''}>
                <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select preset…" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRESETS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">{rule.description}</p>
            <div>
              <Label className="text-xs">Custom Rule (B/S notation)</Label>
              <div className="flex gap-1">
                <Input value={ruleInput} onChange={(e) => setRuleInput(e.target.value)} placeholder="B3/S23" className="min-h-[44px] font-mono text-sm" />
                <Button size="sm" onClick={applyCustomRule} className="min-h-[44px]">Apply</Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">States: {rule.states}</Label>
              <Select value={String(rule.states)} onValueChange={(v) => setRule({ ...rule, states: parseInt(v) })}>
                <SelectTrigger className="w-20 min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3 (Brian)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Section>

        <Section title="Appearance" defaultOpen={false}>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Color Scheme</Label>
              <Select value={colorScheme} onValueChange={setColorScheme}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mono">Monochrome</SelectItem>
                  <SelectItem value="age">Heat by Age</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Live</Label>
                <input type="color" value={liveColor} onChange={(e) => setLiveColor(e.target.value)} className="w-full h-8 rounded cursor-pointer" />
              </div>
              <div>
                <Label className="text-xs">Dead</Label>
                <input type="color" value={deadColor} onChange={(e) => setDeadColor(e.target.value)} className="w-full h-8 rounded cursor-pointer" />
              </div>
              <div>
                <Label className="text-xs">Grid</Label>
                <input type="color" value={gridLineColor} onChange={(e) => setGridLineColor(e.target.value)} className="w-full h-8 rounded cursor-pointer" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Grid Lines</Label>
              <Switch checked={showGridLines} onCheckedChange={setShowGridLines} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Trail Mode (Age Fade)</Label>
              <Switch checked={trailMode} onCheckedChange={setTrailMode} />
            </div>
          </div>
        </Section>

        <Section title="History & Performance" defaultOpen={false}>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">History Length: {historyLength}</Label>
              <Slider value={[historyLength]} onValueChange={([v]) => setHistoryLength(v)} min={0} max={100} step={1} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show FPS</Label>
              <Switch checked={showFps} onCheckedChange={setShowFps} />
            </div>
          </div>
        </Section>

        <Section title="Drawing Tools">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {tools.map(t => (
                <Button key={t.id} size="sm" variant={drawTool === t.id ? 'default' : 'outline'}
                  onClick={() => { setDrawTool(t.id); if (t.id === 'stamp' && !stampPattern) setStampPattern(PATTERNS[0]); }}
                  className="min-h-[44px] text-xs">
                  {t.label}
                </Button>
              ))}
            </div>
            <div>
              <Label className="text-xs">Randomize Density: {Math.round(density * 100)}%</Label>
              <Slider value={[density]} onValueChange={([v]) => setDensity(v)} min={0.05} max={0.8} step={0.05} />
            </div>
          </div>
        </Section>

        <Section title="Patterns Library" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-1">
            {PATTERNS.map(p => (
              <Button key={p.name} size="sm" variant={stampPattern?.name === p.name ? 'default' : 'outline'}
                onClick={() => { setStampPattern(p); setDrawTool('stamp'); }}
                className="min-h-[44px] text-xs justify-start">
                {p.name}
              </Button>
            ))}
          </div>
        </Section>

        <Section title="Import / Export" defaultOpen={false}>
          <div className="space-y-3">
            <Button size="sm" variant="outline" onClick={handleExportRLE} className="w-full min-h-[44px]">
              📋 Copy RLE to Clipboard
            </Button>
            <div>
              <Label className="text-xs">Import RLE</Label>
              <textarea
                value={rleImport}
                onChange={(e) => setRleImport(e.target.value)}
                className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
                placeholder="Paste RLE here…"
              />
              <Button size="sm" variant="outline" onClick={handleImportRLE} className="w-full min-h-[44px] mt-1">
                Import
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={handleExportPNG} className="w-full min-h-[44px]">
              🖼️ Export as PNG
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}
