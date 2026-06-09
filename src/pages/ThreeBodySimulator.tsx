import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, OrthographicCamera } from "@react-three/drei";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BodyMesh, Starfield, ReferenceGrid } from "@/components/three-body/SceneObjects";
import { BodyControls } from "@/components/three-body/BodyControls";
import { StatsPanel } from "@/components/three-body/StatsPanel";
import { CenterOfMassMarker } from "@/components/three-body/CenterOfMassMarker";
import {
  Body, SimState, CollisionMode, CollisionEvent,
  rk4Step, rk45Step, yoshidaStep, handleCollisions,
  totalKineticEnergy, totalPotentialEnergy,
} from "@/lib/threeBodyPhysics";
import { presets, Preset } from "@/lib/threeBodyPresets";
import MathText from "@/components/MathText";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import {
  Play, Pause, RotateCcw, SkipForward, Camera, ChevronDown, ChevronRight,
  Plus, BookOpen, Eye, EyeOff, Maximize2, PanelRight, PanelRightClose,
  AlertTriangle, Merge, ArrowLeftRight, Ghost,
} from "lucide-react";

const DEFAULT_G = 1;
const DEFAULT_SOFTENING = 0.005; // Low softening for sharp slingshots
const DEFAULT_DT = 0.001; // Fixed physics substep size
const MAX_SUBSTEPS_PER_FRAME = 200; // Cap to prevent freezing on slow frames

let bodyIdCounter = 100;
const newBodyId = () => `body-${++bodyIdCounter}`;

type IntegratorType = "rk4" | "rk45" | "yoshida";

export default function NBodySimulator() {
  // Dark mode lock
  const { lockTheme, unlockTheme } = useTheme();
  useEffect(() => {
    lockTheme("dark");
    return () => unlockTheme();
  }, [lockTheme, unlockTheme]);

  const [bodies, setBodies] = useState<Body[]>([]);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [G, setG] = useState(DEFAULT_G);
  const [softening, setSoftening] = useState(DEFAULT_SOFTENING);
  const [timeScale, setTimeScale] = useState(1);
  const [inverseCube, setInverseCube] = useState(false);
  const [activePreset, setActivePreset] = useState("Figure-8");
  const [selectedBody, setSelectedBody] = useState<string | null>(null);
  const [integrator, setIntegrator] = useState<IntegratorType>("rk45");
  const [collisionMode, setCollisionMode] = useState<CollisionMode>("pass");

  // Trail settings
  const [showTrails, setShowTrails] = useState(true);
  const [trailLength, setTrailLength] = useState(500);
  const [trailWidth, setTrailWidth] = useState(1);
  const [rainbowTrail, setRainbowTrail] = useState(false);

  // View
  const [ortho, setOrtho] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [cinematic, setCinematic] = useState(false);
  const [showCoM, setShowCoM] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [educationalOpen, setEducationalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState("bodies");

  // Chaos & energy tracking
  const [chaosIndicator, setChaosIndicator] = useState(0);
  const [energyDrift, setEnergyDrift] = useState(0);
  const [initialEnergy, setInitialEnergy] = useState<number | null>(null);
  const [currentDt, setCurrentDt] = useState(DEFAULT_DT);

  // Perturbation ghost
  const [showGhost, setShowGhost] = useState(false);
  const [ghostBodies, setGhostBodies] = useState<Body[]>([]);
  const [ghostDivergence, setGhostDivergence] = useState(0);

  // Refs for animation loop — these are the source of truth during simulation
  const stateRef = useRef<SimState>({ bodies: [], time: 0, G: DEFAULT_G, softening: DEFAULT_SOFTENING, inverseCube: false });
  const shadowRef = useRef<SimState | null>(null);
  const ghostRef = useRef<SimState | null>(null);
  const playingRef = useRef(false);
  const timeScaleRef = useRef(1);
  const trailLengthRef = useRef(500);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const integratorRef = useRef<IntegratorType>("rk45");
  const collisionModeRef = useRef<CollisionMode>("pass");
  const adaptiveDtRef = useRef(DEFAULT_DT);
  const initialEnergyRef = useRef<number | null>(null);
  const showGhostRef = useRef(false);
  const accumulatorRef = useRef(0); // Physics time accumulator

  // Keep refs in sync
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { timeScaleRef.current = timeScale; }, [timeScale]);
  useEffect(() => { trailLengthRef.current = trailLength; }, [trailLength]);
  useEffect(() => { integratorRef.current = integrator; }, [integrator]);
  useEffect(() => { collisionModeRef.current = collisionMode; }, [collisionMode]);
  useEffect(() => { showGhostRef.current = showGhost; }, [showGhost]);

  // SEO
  useEffect(() => {
    document.title = "N-Body Gravity Simulator — ClutchSAT";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Simulate gravitational chaos with 2–6 bodies. Explore the three-body problem, Lagrange points, and orbital mechanics with adaptive RK45 integration.");
  }, []);

  const loadPreset = useCallback((preset: Preset) => {
    const loadedBodies: Body[] = preset.bodies.map(b => ({
      ...b,
      id: newBodyId(),
      trail: [],
    }));
    setBodies(loadedBodies);
    setTime(0);
    setPlaying(false);
    setChaosIndicator(0);
    setEnergyDrift(0);
    setGhostDivergence(0);
    setGhostBodies([]);
    const newG = preset.G ?? DEFAULT_G;
    const newSoftening = preset.softening ?? DEFAULT_SOFTENING;
    setG(newG);
    setSoftening(newSoftening);
    setActivePreset(preset.name);
    setSelectedBody(null);
    adaptiveDtRef.current = DEFAULT_DT;
    accumulatorRef.current = 0;
    setCurrentDt(DEFAULT_DT);

    // Apply default integrator if preset specifies one
    if (preset.defaultIntegrator) {
      setIntegrator(preset.defaultIntegrator);
      integratorRef.current = preset.defaultIntegrator;
    }

    const newState: SimState = { bodies: loadedBodies, time: 0, G: newG, softening: newSoftening, inverseCube: false };
    stateRef.current = newState;

    if (loadedBodies.length >= 2) {
      const e0 = totalKineticEnergy(loadedBodies) + totalPotentialEnergy(loadedBodies, newG, newSoftening);
      setInitialEnergy(e0);
      initialEnergyRef.current = e0;
    } else {
      setInitialEnergy(null);
      initialEnergyRef.current = null;
    }

    // Shadow simulation for chaos detection
    if (loadedBodies.length >= 2) {
      const shadowBodies = loadedBodies.map((b, i) => ({
        ...b,
        position: (i === 0 ? [b.position[0] + 1e-8, b.position[1], b.position[2]] : [...b.position]) as [number, number, number],
        trail: [],
      }));
      shadowRef.current = { bodies: shadowBodies, time: 0, G: newG, softening: newSoftening, inverseCube: false };
    } else {
      shadowRef.current = null;
    }

    ghostRef.current = null;
  }, []);

  // Load initial preset
  useEffect(() => {
    loadPreset(presets[0]);
  }, [loadPreset]);

  // Start ghost simulation
  const startGhost = useCallback(() => {
    const state = stateRef.current;
    if (state.bodies.length < 2) return;
    const gBodies = state.bodies.map((b, i) => ({
      ...b,
      id: `ghost-${b.id}`,
      position: (i === 0 ? [b.position[0] + 1e-4, b.position[1], b.position[2]] : [...b.position]) as [number, number, number],
      trail: [],
      color: adjustColor(b.color, 0.3),
    }));
    ghostRef.current = { ...state, bodies: gBodies };
    setShowGhost(true);
    setGhostDivergence(0);
  }, []);

  // =============================================
  // CORE ANIMATION LOOP — Fixed accumulator pattern
  // Physics runs at fixed dt substeps, render reads latest state
  // =============================================
  useEffect(() => {
    let frameCount = 0;

    const step = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(step);

      if (!playingRef.current) {
        lastTimeRef.current = timestamp;
        accumulatorRef.current = 0;
        return;
      }

      // Calculate real elapsed time since last frame
      let elapsed = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      // Clamp to prevent spiral of death on slow frames
      if (elapsed > 0.1 || elapsed <= 0) elapsed = 1 / 60;

      // Scale by time scale
      const simElapsed = elapsed * timeScaleRef.current;

      // Accumulate time
      accumulatorRef.current += simElapsed;

      // Fixed physics substep size
      const fixedDt = adaptiveDtRef.current;

      let state = stateRef.current;
      let shadow = shadowRef.current;
      let ghost = ghostRef.current;
      let substepsDone = 0;
      const collisionEvents: CollisionEvent[] = [];

      // Run as many fixed-size substeps as needed to consume accumulated time
      while (accumulatorRef.current >= fixedDt && substepsDone < MAX_SUBSTEPS_PER_FRAME) {
        // Step main simulation
        if (integratorRef.current === "rk45") {
          const result = rk45Step(state, fixedDt);
          state = result.state;
          // Adapt the fixed dt for next frame based on error
          adaptiveDtRef.current = Math.max(0.0001, Math.min(0.01, result.dtNext));
        } else if (integratorRef.current === "yoshida") {
          state = yoshidaStep(state, fixedDt);
        } else {
          state = rk4Step(state, fixedDt);
        }

        // Step shadow
        if (shadow) {
          if (integratorRef.current === "yoshida") {
            shadow = yoshidaStep(shadow, fixedDt);
          } else {
            shadow = rk4Step(shadow, fixedDt);
          }
        }

        // Step ghost
        if (ghost && showGhostRef.current) {
          if (integratorRef.current === "yoshida") {
            ghost = yoshidaStep(ghost, fixedDt);
          } else {
            ghost = rk4Step(ghost, fixedDt);
          }
        }

        // Collision handling — EVERY substep
        if (collisionModeRef.current !== "pass") {
          const result = handleCollisions(state, collisionModeRef.current);
          if (result.events.length > 0) {
            state = result.state;
            collisionEvents.push(...result.events);
          }
        }

        accumulatorRef.current -= fixedDt;
        substepsDone++;
      }

      // If accumulator overflowed, drain it to prevent further buildup
      if (accumulatorRef.current > fixedDt * 5) {
        accumulatorRef.current = 0;
      }

      // Fire collision toasts (batched)
      if (collisionEvents.length > 0) {
        const first = collisionEvents[0];
        toast.info(`${first.type === "merge" ? "🔗 Merge" : "💥 Bounce"}: ${first.bodyA} & ${first.bodyB}`, { duration: 2000 });
      }

      // Update trails (once per render frame, not per substep)
      const maxTrail = trailLengthRef.current;
      state = {
        ...state,
        bodies: state.bodies.map(b => {
          const trail = [...b.trail, [...b.position] as [number, number, number]];
          if (trail.length > maxTrail) trail.splice(0, trail.length - maxTrail);
          return { ...b, trail };
        }),
      };

      if (ghost && showGhostRef.current) {
        ghost = {
          ...ghost,
          bodies: ghost.bodies.map(b => {
            const trail = [...b.trail, [...b.position] as [number, number, number]];
            if (trail.length > maxTrail) trail.splice(0, trail.length - maxTrail);
            return { ...b, trail };
          }),
        };
      }

      stateRef.current = state;
      if (shadow) shadowRef.current = shadow;
      if (ghost) ghostRef.current = ghost;

      frameCount++;
      // Update React state every 2 render frames for performance
      if (frameCount % 2 === 0) {
        if (shadow && state.bodies.length > 0) {
          let maxDiv = 0;
          for (let i = 0; i < Math.min(state.bodies.length, shadow.bodies.length); i++) {
            const dx = state.bodies[i].position[0] - shadow.bodies[i].position[0];
            const dy = state.bodies[i].position[1] - shadow.bodies[i].position[1];
            const dz = state.bodies[i].position[2] - shadow.bodies[i].position[2];
            maxDiv = Math.max(maxDiv, Math.sqrt(dx*dx + dy*dy + dz*dz));
          }
          setChaosIndicator(Math.min(1, Math.log10(1 + maxDiv * 1e6) / 8));
        }

        if (initialEnergyRef.current !== null && state.bodies.length >= 2) {
          const currentE = totalKineticEnergy(state.bodies) + totalPotentialEnergy(state.bodies, state.G, state.softening);
          const drift = (currentE - initialEnergyRef.current) / Math.abs(initialEnergyRef.current);
          setEnergyDrift(drift);
        }

        if (ghost && showGhostRef.current && state.bodies.length > 0) {
          let maxDiv = 0;
          for (let i = 0; i < Math.min(state.bodies.length, ghost.bodies.length); i++) {
            const dx = state.bodies[i].position[0] - ghost.bodies[i].position[0];
            const dy = state.bodies[i].position[1] - ghost.bodies[i].position[1];
            const dz = state.bodies[i].position[2] - ghost.bodies[i].position[2];
            maxDiv = Math.max(maxDiv, Math.sqrt(dx*dx + dy*dy + dz*dz));
          }
          setGhostDivergence(Math.min(1, maxDiv / 5));
          setGhostBodies(ghost.bodies);
        }

        setBodies(state.bodies);
        setTime(state.time);
        setCurrentDt(adaptiveDtRef.current);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Sync settings to state ref
  useEffect(() => {
    stateRef.current = { ...stateRef.current, G, softening, inverseCube };
  }, [G, softening, inverseCube]);

  const handleReset = useCallback(() => {
    const preset = presets.find(p => p.name === activePreset) || presets[0];
    loadPreset(preset);
  }, [activePreset, loadPreset]);

  const handleStepForward = () => {
    const dt = adaptiveDtRef.current * timeScale;
    let newState: SimState;
    if (integrator === "rk45") {
      const r = rk45Step(stateRef.current, dt);
      newState = r.state;
      adaptiveDtRef.current = r.dtNext;
    } else if (integrator === "yoshida") {
      newState = yoshidaStep(stateRef.current, dt);
    } else {
      newState = rk4Step(stateRef.current, dt);
    }
    const updated = {
      ...newState,
      bodies: newState.bodies.map(b => {
        const trail = [...b.trail, [...b.position] as [number, number, number]];
        if (trail.length > trailLength) trail.splice(0, trail.length - trailLength);
        return { ...b, trail };
      }),
    };
    stateRef.current = updated;
    setBodies(updated.bodies);
    setTime(updated.time);
  };

  const handleUpdateBody = (id: string, updates: Partial<Body>) => {
    setBodies(prev => {
      const next = prev.map(b => b.id === id ? { ...b, ...updates } : b);
      stateRef.current = { ...stateRef.current, bodies: next };
      setActivePreset("Custom");
      return next;
    });
  };

  const handleDeleteBody = (id: string) => {
    setBodies(prev => {
      const next = prev.filter(b => b.id !== id);
      stateRef.current = { ...stateRef.current, bodies: next };
      if (selectedBody === id) setSelectedBody(null);
      return next;
    });
  };

  const handleAddBody = () => {
    if (bodies.length >= 6) return;
    const colors = ["#ff6b6b", "#4ecdc4", "#ffe66d", "#a29bfe", "#fd79a8", "#00cec9"];
    const newBody: Body = {
      id: newBodyId(),
      name: `Body ${bodies.length + 1}`,
      mass: 1,
      position: [(Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4],
      velocity: [0, 0, 0],
      color: colors[bodies.length % colors.length],
      radius: 0.08,
      showLabel: true,
      locked: false,
      trail: [],
    };
    setBodies(prev => {
      const next = [...prev, newBody];
      stateRef.current = { ...stateRef.current, bodies: next };
      setActivePreset("Custom");
      return next;
    });
    setSelectedBody(newBody.id);
  };

  const handleScreenshot = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "n-body-simulation.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case " ": e.preventDefault(); setPlaying(p => !p); break;
        case "r": handleReset(); break;
        case "t": setShowTrails(t => !t); break;
        case "c": setCinematic(c => !c); break;
        case "m": setCollisionMode(m => m === "merge" ? "bounce" : m === "bounce" ? "pass" : "merge"); break;
        case "escape": setSelectedBody(null); break;
        case "1": case "2": case "3": case "4": case "5": case "6": {
          const idx = parseInt(e.key) - 1;
          if (idx < bodies.length) setSelectedBody(bodies[idx].id);
          break;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleReset, bodies]);

  const currentPreset = presets.find(p => p.name === activePreset);

  // =============================================
  // CONTROL PANELS — reusable across layouts
  // =============================================
  const renderSimControls = () => (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Simulation</h3>
      <div>
        <label className="text-[10px] text-muted-foreground">Time Scale: {timeScale.toFixed(1)}×</label>
        <Slider min={0.01} max={50} step={0.1} value={[timeScale]} onValueChange={([v]) => setTimeScale(v)} className="min-h-[44px]" />
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">G (Gravity): {G.toFixed(2)}</label>
        <Slider min={0.01} max={10} step={0.01} value={[G]} onValueChange={([v]) => setG(v)} className="min-h-[44px]" />
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">Softening ε: {softening.toFixed(4)}</label>
        <Slider min={0.0001} max={0.5} step={0.0001} value={[softening]} onValueChange={([v]) => setSoftening(v)} className="min-h-[44px]" />
      </div>
      <div className="flex items-center justify-between min-h-[44px]">
        <span className="text-xs text-muted-foreground">Inverse-Cube Law</span>
        <Switch checked={inverseCube} onCheckedChange={setInverseCube} />
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">Integrator</label>
        <div className="flex gap-1 mt-1">
          {(["rk4", "rk45", "yoshida"] as IntegratorType[]).map(t => (
            <Button
              key={t}
              size="sm"
              variant={integrator === t ? "default" : "secondary"}
              className="text-[10px] flex-1 min-h-[44px]"
              onClick={() => {
                setIntegrator(t);
                accumulatorRef.current = 0; // Reset accumulator on switch
              }}
            >
              {t === "rk4" ? "RK4" : t === "rk45" ? "RK45" : "Yoshida"}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">Collisions</label>
        <div className="flex gap-1 mt-1">
          {(["pass", "merge", "bounce"] as CollisionMode[]).map(m => (
            <Button
              key={m}
              size="sm"
              variant={collisionMode === m ? "default" : "secondary"}
              className="text-[10px] flex-1 min-h-[44px] capitalize"
              onClick={() => setCollisionMode(m)}
            >
              {m}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTrailControls = () => (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trails</h3>
      <div className="flex items-center justify-between min-h-[44px]">
        <span className="text-xs text-muted-foreground">Show Trails</span>
        <Switch checked={showTrails} onCheckedChange={setShowTrails} />
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">Trail Length: {trailLength}</label>
        <Slider min={0} max={2000} step={10} value={[trailLength]} onValueChange={([v]) => setTrailLength(v)} className="min-h-[44px]" />
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">Trail Width: {trailWidth}</label>
        <Slider min={1} max={5} step={0.5} value={[trailWidth]} onValueChange={([v]) => setTrailWidth(v)} className="min-h-[44px]" />
      </div>
      <div className="flex items-center justify-between min-h-[44px]">
        <span className="text-xs text-muted-foreground">Rainbow Mode</span>
        <Switch checked={rainbowTrail} onCheckedChange={setRainbowTrail} />
      </div>
    </div>
  );

  const renderViewControls = () => (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">View</h3>
      <div className="flex items-center justify-between min-h-[44px]">
        <span className="text-xs text-muted-foreground">Orthographic</span>
        <Switch checked={ortho} onCheckedChange={setOrtho} />
      </div>
      <div className="flex items-center justify-between min-h-[44px]">
        <span className="text-xs text-muted-foreground">Show Grid</span>
        <Switch checked={showGrid} onCheckedChange={setShowGrid} />
      </div>
      <div className="flex items-center justify-between min-h-[44px]">
        <span className="text-xs text-muted-foreground">Cinematic Mode</span>
        <Switch checked={cinematic} onCheckedChange={setCinematic} />
      </div>
      <div className="flex items-center justify-between min-h-[44px]">
        <span className="text-xs text-muted-foreground">Centre of Mass</span>
        <Switch checked={showCoM} onCheckedChange={setShowCoM} />
      </div>
      <div className="pt-2 space-y-2">
        <Button size="sm" variant="outline" className="w-full min-h-[44px]" onClick={() => { setShowGhost(!showGhost); if (!showGhost) startGhost(); }}>
          <Ghost className="h-3.5 w-3.5 mr-1" />
          {showGhost ? "Hide" : "Show"} Perturbation Ghost
        </Button>
        {showGhost && (
          <div className="bg-muted/30 rounded px-2 py-1.5">
            <div className="text-[10px] text-muted-foreground mb-1">Ghost Divergence</div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(ghostDivergence * 100, 100)}%`,
                  backgroundColor: ghostDivergence > 0.6 ? "#ef4444" : ghostDivergence > 0.3 ? "#f59e0b" : "#22c55e",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderBodiesPanel = () => (
    <>
      <BodyControls
        bodies={bodies}
        onUpdateBody={handleUpdateBody}
        onDeleteBody={handleDeleteBody}
        selectedId={selectedBody}
        onSelect={setSelectedBody}
      />
      {bodies.length < 6 && (
        <Button variant="outline" size="sm" className="w-full min-h-[44px]" onClick={handleAddBody}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Body
        </Button>
      )}
      {bodies.length >= 6 && (
        <p className="text-xs text-muted-foreground text-center">Maximum 6 bodies reached</p>
      )}
    </>
  );

  const renderPresets = () => (
    <div className="flex flex-wrap gap-1.5 justify-center">
      {presets.map(p => (
        <Button
          key={p.name}
          size="sm"
          variant={activePreset === p.name ? "default" : "secondary"}
          className="text-xs min-h-[44px]"
          onClick={() => loadPreset(p)}
        >
          {p.name}
        </Button>
      ))}
    </div>
  );

  const renderStatsPanel = () => (
    <StatsPanel
      bodies={bodies}
      G={G}
      softening={softening}
      time={time}
      dt={currentDt * timeScale}
      chaosIndicator={chaosIndicator}
      energyDrift={energyDrift}
      initialEnergy={initialEnergy}
      integrator={integrator.toUpperCase()}
    />
  );

  // =============================================
  // RESPONSIVE LAYOUT
  // Desktop (>900px): canvas + sidebar
  // Tablet/Mobile (<900px): canvas on top, controls below, natural page scroll
  // =============================================
  return (
    <Layout>
      {/* 
        On <900px: single column, page scrolls naturally.
        On >=900px: fixed height flex row with sidebar.
      */}
      <div className="flex flex-col min-[900px]:flex-row min-[900px]:h-[calc(100vh-4rem)] bg-background">
        {/* 3D Canvas area */}
        <div
          className="relative bg-[#0a0a0a] w-full min-[900px]:flex-1"
          style={{ minHeight: 300 }}
        >
          {/* Canvas sizing:
              <600px: 45vh clamped to min 300px
              600-900px: 55vh
              >900px: fills remaining flex space
          */}
          <div
            className="w-full h-[45vh] min-h-[300px] max-h-[50vh] min-[600px]:h-[55vh] min-[600px]:max-h-none min-[900px]:h-full min-[900px]:max-h-none"
          >
            <Canvas gl={{ preserveDrawingBuffer: true, antialias: true }} shadows style={{ touchAction: "none" }}>
              <color attach="background" args={["#0a0a0a"]} />
              <ambientLight intensity={0.15} />

              {ortho ? (
                <OrthographicCamera makeDefault position={[0, 20, 0]} zoom={40} />
              ) : (
                <PerspectiveCamera makeDefault position={[0, 8, 12]} fov={50} />
              )}

              <OrbitControls
                autoRotate={cinematic}
                autoRotateSpeed={0.5}
                enableDamping
                dampingFactor={0.1}
              />

              <Starfield />
              {showGrid && <ReferenceGrid />}
              <CenterOfMassMarker bodies={bodies} visible={showCoM} />

              {bodies.map(body => (
                <BodyMesh
                  key={body.id}
                  body={body}
                  selected={selectedBody === body.id}
                  onClick={() => setSelectedBody(body.id)}
                  trailLength={trailLength}
                  trailWidth={trailWidth}
                  showTrail={showTrails}
                  rainbowTrail={rainbowTrail}
                />
              ))}

              {showGhost && ghostBodies.map(body => (
                <BodyMesh
                  key={body.id}
                  body={body}
                  selected={false}
                  onClick={() => {}}
                  trailLength={trailLength}
                  trailWidth={trailWidth}
                  showTrail={showTrails}
                  rainbowTrail={false}
                />
              ))}
            </Canvas>
          </div>

          {/* Top overlay controls */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10">
            <Button size="sm" variant={playing ? "destructive" : "default"} onClick={() => setPlaying(!playing)} className="min-h-[44px]">
              {playing ? <Pause className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
              <span className="hidden min-[500px]:inline">{playing ? "Pause" : "Play"}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset} className="min-h-[44px]">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleStepForward} disabled={playing} className="min-h-[44px]">
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleScreenshot} className="min-h-[44px]">
              <Camera className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Bottom overlay: presets (desktop only) */}
          <div className="hidden min-[900px]:block absolute bottom-2 left-2 right-2 z-10">
            {renderPresets()}
          </div>

          {/* Sidebar toggle for 900-1200px range */}
          <button
            className="hidden min-[900px]:block absolute top-2 right-2 bg-card/80 backdrop-blur rounded-lg p-2 text-muted-foreground hover:text-foreground transition-colors z-10"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
          </button>
        </div>

        {/* =============================================
            CONTROLS: Two completely different layouts
            ============================================= */}

        {/* MOBILE / TABLET (<900px): Controls below canvas, natural page scroll */}
        <div className="min-[900px]:hidden bg-card border-t border-border pb-20">
          {/* Title + description */}
          <div className="px-4 pt-4 pb-2">
            <h1 className="text-lg font-display font-bold text-foreground">N-Body Gravity Simulator</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Simulate gravitational chaos — from stable orbits to unpredictable many-body systems.
            </p>
          </div>

          {/* Presets row */}
          <div className="px-3 py-2 border-b border-border overflow-x-auto">
            <div className="flex gap-1.5 min-w-max">
              {presets.map(p => (
                <Button
                  key={p.name}
                  size="sm"
                  variant={activePreset === p.name ? "default" : "secondary"}
                  className="text-xs min-h-[44px] whitespace-nowrap"
                  onClick={() => loadPreset(p)}
                >
                  {p.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Preset note */}
          {currentPreset && currentPreset.name !== "Custom" && (
            <div className="px-4 py-2 bg-muted/20 border-b border-border">
              <p className="text-xs text-muted-foreground">{currentPreset.description}</p>
              {currentPreset.note && (
                <p className="text-[10px] text-yellow-500/80 mt-1 flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  {currentPreset.note}
                </p>
              )}
            </div>
          )}

          {/* Tab bar */}
          <Tabs value={mobileTab} onValueChange={setMobileTab}>
            <TabsList className="mx-3 mt-3 bg-muted/50 h-11 w-[calc(100%-1.5rem)]">
              <TabsTrigger value="bodies" className="text-xs flex-1 min-h-[44px]">Bodies</TabsTrigger>
              <TabsTrigger value="sim" className="text-xs flex-1 min-h-[44px]">Sim</TabsTrigger>
              <TabsTrigger value="view" className="text-xs flex-1 min-h-[44px]">View</TabsTrigger>
              <TabsTrigger value="stats" className="text-xs flex-1 min-h-[44px]">Stats</TabsTrigger>
            </TabsList>
            <div className="px-4 py-3">
              <TabsContent value="bodies" className="mt-0 space-y-3">
                {renderBodiesPanel()}
              </TabsContent>
              <TabsContent value="sim" className="mt-0">
                {renderSimControls()}
                <div className="mt-4">{renderTrailControls()}</div>
              </TabsContent>
              <TabsContent value="view" className="mt-0">
                {renderViewControls()}
              </TabsContent>
              <TabsContent value="stats" className="mt-0">
                {renderStatsPanel()}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* DESKTOP (>=900px): Sidebar */}
        <div className={`hidden min-[900px]:flex ${sidebarOpen ? "w-80 min-[1200px]:w-96" : "w-0 overflow-hidden"} transition-all bg-card border-l border-border flex-col flex-shrink-0 overflow-y-auto`}>
          <div className="p-4 space-y-5">
            {/* Title */}
            <div>
              <h1 className="text-lg font-display font-bold text-foreground">N-Body Gravity Simulator</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Simulate gravitational chaos — from stable orbits to unpredictable many-body systems. The three-body problem is one of the most famous unsolved problems in classical physics.
              </p>
            </div>

            {/* Preset description */}
            {currentPreset && currentPreset.name !== "Custom" && (
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <p className="text-xs text-muted-foreground">{currentPreset.description}</p>
                {currentPreset.note && (
                  <p className="text-[10px] text-yellow-500/80 flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    {currentPreset.note}
                  </p>
                )}
              </div>
            )}

            {renderSimControls()}
            {renderTrailControls()}
            {renderViewControls()}
            {renderBodiesPanel()}
            {renderStatsPanel()}

            {/* Educational sidebar */}
            <Collapsible open={educationalOpen} onOpenChange={setEducationalOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 w-full text-left py-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">Learn More</span>
                  {educationalOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-3 pb-4">
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">The Three-Body Problem</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Unlike the two-body problem (which has elegant closed-form solutions), the general three-body problem has no analytical solution.
                      Henri Poincaré proved in the 1890s that the system is chaotic — infinitely sensitive to initial conditions.
                    </p>
                    <div className="bg-background/50 rounded px-3 py-2 text-center">
                      <MathText text="$F = \frac{G m_1 m_2}{r^2}$" className="text-sm" />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This simulator uses adaptive RK45 (Dormand-Prince style) and Yoshida symplectic integrators. The chaos indicator tracks
                      how quickly a shadow simulation with a tiny perturbation (10⁻⁸) diverges.
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Conservation Laws</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Total energy and angular momentum should be conserved. The energy drift indicator shows how well the integrator preserves these.
                      The Yoshida integrator is symplectic — it conserves energy structurally and is better for long-run simulations.
                    </p>
                    <div className="bg-background/50 rounded px-3 py-2 text-center">
                      <MathText text="$E = \sum \frac{1}{2}m_i v_i^2 - \sum_{i<j} \frac{G m_i m_j}{r_{ij}}$" className="text-sm" />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Keyboard shortcuts */}
            <div className="text-[10px] text-muted-foreground/50 space-y-0.5 pb-4">
              <p className="font-semibold uppercase tracking-wider mb-1">Shortcuts</p>
              <p>Space — Play/Pause</p>
              <p>R — Reset</p>
              <p>T — Toggle trails</p>
              <p>C — Cinematic mode</p>
              <p>M — Cycle collision mode</p>
              <p>1-6 — Select body</p>
              <p>Esc — Deselect</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function adjustColor(hex: string, saturation: number): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const gray = 0.3 * r + 0.59 * g + 0.11 * b;
  const nr = Math.round((gray + (r - gray) * saturation) * 255);
  const ng = Math.round((gray + (g - gray) * saturation) * 255);
  const nb = Math.round((gray + (b - gray) * saturation) * 255);
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}
