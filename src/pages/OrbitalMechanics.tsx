import { useState, useRef, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronRight, Play, Pause, RotateCcw, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import MathText from "@/components/MathText";

// ─── Types ───────────────────────────────────────────────────────────
interface Preset {
  label: string;
  e: number;
  primaryColor: string;
  primaryGlow: string;
  planetColor: string;
  planetGlow: string;
  primaryRadius: number;
  planetRadius: number;
  description: string;
}

interface Stats {
  speed: number;
  distance: number;
  speedRatio: number;
  progress: number;
  eccentricity: number;
  semiLatusRectum: number;
  energy: number;
  angularMomentum: number;
  arealVelocity: number;
}

// ─── Presets ─────────────────────────────────────────────────────────
const PRESETS: Preset[] = [
  { label: "Earth–Sun", e: 0.017, primaryColor: "#FFD700", primaryGlow: "#FFA500", planetColor: "#4A90D9", planetGlow: "#6AB0FF", primaryRadius: 14, planetRadius: 7, description: "Earth orbits the Sun in a nearly circular orbit (e ≈ 0.017). The speed variation is minimal — only about 3.4% difference between perihelion and aphelion." },
  { label: "Mercury", e: 0.206, primaryColor: "#FFD700", primaryGlow: "#FFA500", planetColor: "#A0A0A0", planetGlow: "#C0C0C0", primaryRadius: 14, planetRadius: 5, description: "Mercury has the most eccentric orbit of any planet (e ≈ 0.206). Its orbital speed varies by ~50% between perihelion and aphelion, making Kepler's Second Law clearly visible." },
  { label: "Halley's Comet", e: 0.967, primaryColor: "#FFFFFF", primaryGlow: "#AACCFF", planetColor: "#CCE0FF", planetGlow: "#88BBFF", primaryRadius: 12, planetRadius: 4, description: "Halley's Comet has an extreme eccentricity (e ≈ 0.967). It spends most of its ~76-year period far from the Sun, then whips through perihelion at tremendous speed." },
  { label: "Pulsar + Companion", e: 0.617, primaryColor: "#BB88FF", primaryGlow: "#9955FF", planetColor: "#FFBB44", planetGlow: "#FFDD88", primaryRadius: 6, planetRadius: 10, description: "A pulsar is a rapidly rotating neutron star emitting beams of radiation. Binary pulsar systems provided the first indirect evidence of gravitational waves, confirming Einstein's general relativity." },
  { label: "Binary Star", e: 0.5, primaryColor: "#FF6644", primaryGlow: "#FF4422", planetColor: "#44AAFF", planetGlow: "#66CCFF", primaryRadius: 10, planetRadius: 9, description: "Binary star systems are pairs of stars orbiting a common center of mass. About half of all star systems in the Milky Way are binaries or higher-order multiples." },
  { label: "Custom", e: 0.3, primaryColor: "#FFD700", primaryGlow: "#FFA500", planetColor: "#66FFAA", planetGlow: "#33DD88", primaryRadius: 12, planetRadius: 7, description: "Adjust the eccentricity and other parameters to explore different orbital configurations and see how Kepler's Second Law applies universally." },
];

// ─── Kepler solver ───────────────────────────────────────────────────
function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 100; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

function eccentricToTrue(E: number, e: number): number {
  return 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ─── Component ───────────────────────────────────────────────────────
const OrbitalMechanics = () => {
  const [activePreset, setActivePreset] = useState(0);
  const [eccentricity, setEccentricity] = useState(PRESETS[0].e);
  const [animSpeed, setAnimSpeed] = useState(1.0);
  const [axisScale, setAxisScale] = useState(1.0);
  const [arcSize, setArcSize] = useState(2.0);
  const [trailLength, setTrailLength] = useState(80);
  const [showSweptArea, setShowSweptArea] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [showVelocity, setShowVelocity] = useState(true);
  const [showBothFoci, setShowBothFoci] = useState(false);
  const [showAxes, setShowAxes] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showRadial, setShowRadial] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [stats, setStats] = useState<Stats>({
    speed: 0, distance: 0, speedRatio: 0, progress: 0,
    eccentricity: 0, semiLatusRectum: 0, energy: 0, angularMomentum: 0, arealVelocity: 0,
  });

  // Dark mode lock
  const { lockTheme, unlockTheme } = useTheme();
  useEffect(() => {
    lockTheme("dark");
    return () => unlockTheme();
  }, [lockTheme, unlockTheme]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const meanAnomalyRef = useRef(0);
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const lastTimeRef = useRef<number>(0);

  // Use refs for all values read in animation loop to avoid restarting the loop
  const eRef = useRef(eccentricity);
  const speedRef = useRef(animSpeed);
  const scaleRef = useRef(axisScale);
  const arcRef = useRef(arcSize);
  const trailLenRef = useRef(trailLength);
  const pausedRef = useRef(paused);
  const showSweptRef = useRef(showSweptArea);
  const showTrailRef = useRef(showTrail);
  const showVelRef = useRef(showVelocity);
  const showFociRef = useRef(showBothFoci);
  const showAxesRef = useRef(showAxes);
  const showGridRef = useRef(showGrid);
  const showRadialRef = useRef(showRadial);
  const showLabelsRef = useRef(showLabels);
  const presetRef = useRef(PRESETS[activePreset]);

  // Sync refs
  useEffect(() => { eRef.current = eccentricity; }, [eccentricity]);
  useEffect(() => { speedRef.current = animSpeed; }, [animSpeed]);
  useEffect(() => { scaleRef.current = axisScale; }, [axisScale]);
  useEffect(() => { arcRef.current = arcSize; }, [arcSize]);
  useEffect(() => { trailLenRef.current = trailLength; }, [trailLength]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { showSweptRef.current = showSweptArea; }, [showSweptArea]);
  useEffect(() => { showTrailRef.current = showTrail; }, [showTrail]);
  useEffect(() => { showVelRef.current = showVelocity; }, [showVelocity]);
  useEffect(() => { showFociRef.current = showBothFoci; }, [showBothFoci]);
  useEffect(() => { showAxesRef.current = showAxes; }, [showAxes]);
  useEffect(() => { showGridRef.current = showGrid; }, [showGrid]);
  useEffect(() => { showRadialRef.current = showRadial; }, [showRadial]);
  useEffect(() => { showLabelsRef.current = showLabels; }, [showLabels]);
  useEffect(() => { presetRef.current = PRESETS[activePreset]; }, [activePreset]);

  const preset = PRESETS[activePreset];

  const selectPreset = useCallback((idx: number) => {
    setActivePreset(idx);
    setEccentricity(PRESETS[idx].e);
  }, []);

  const handleEccentricityChange = useCallback((v: number[]) => {
    setEccentricity(v[0]);
    setActivePreset(5);
  }, []);

  const resetSim = useCallback(() => {
    meanAnomalyRef.current = 0;
    trailRef.current = [];
    lastTimeRef.current = 0;
  }, []);

  // Stats update ref to avoid setStats every frame causing re-render storm
  const statsRef = useRef(stats);
  const statsTickRef = useRef(0);

  // ─── Canvas rendering loop (runs once) ──────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvas);

    lastTimeRef.current = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      const e = eRef.current;
      const scale = scaleRef.current;
      const arcSz = arcRef.current;
      const trLen = trailLenRef.current;
      const isPaused = pausedRef.current;
      const p = presetRef.current;
      const GM = 1;
      const period = 2 * Math.PI;

      if (!isPaused) {
        meanAnomalyRef.current += dt * speedRef.current * 0.8;
        if (meanAnomalyRef.current > 2 * Math.PI) meanAnomalyRef.current -= 2 * Math.PI;
      }

      const M = meanAnomalyRef.current;
      const E = solveKepler(M, e);
      const theta = eccentricToTrue(E, e);

      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;

      // Auto-scale: fit entire orbit in canvas with padding
      const padding = 60;
      const maxDim = Math.min(w - padding * 2, h - padding * 2);
      // The orbit extends from center: -a-ae (apoapsis side) to a-ae (periapsis side) = total 2a
      // Vertically: ±b. So max extent = max(2a, 2b)
      const baseA = 160 * scale;
      const baseB = baseA * Math.sqrt(Math.max(0, 1 - e * e));
      const fitScale = maxDim / (2 * Math.max(baseA, baseB + 10));
      const a = baseA * fitScale;
      const b = baseB * fitScale;

      const focusOffset = a * e;
      // Center of ellipse shifted so focus is well-positioned
      // Place the focus (star) such that the entire ellipse is centered in the canvas
      // Ellipse center: the star is at focus, offset from center by a*e
      // Ellipse goes from (center - a) to (center + a) horizontally
      // Star at center + a*e from ellipse center (or: ellipse center at star - a*e... wait)
      // Focus is at distance c = a*e from ellipse center.
      // Place ellipse center at canvas center, star at canvas_center + focusOffset
      // But that might clip. Let's center the bounding box of the orbit:
      // From focus: periapsis at distance a(1-e), apoapsis at distance a(1+e)
      // So place focus at cx where: focusX - a(1+e) and focusX + a(1-e) are symmetric about canvas center
      // i.e., focusX = canvasCenter + (a(1+e) - a(1-e))/2 = canvasCenter + a*e
      // Actually: left edge = focusX - a(1+e), right edge = focusX + a(1-e)
      // Width = a(1+e) + a(1-e) = 2a. Center of bounding box = focusX - a(1+e) + a = focusX - a*e
      // So ellipse center = focusX - a*e. We want ellipse center at canvas center:
      // focusX = cx + a*e  ... but then right edge = cx + a*e + a(1-e) = cx + a
      // left edge = cx + a*e - a(1+e) = cx - a. Good, symmetric!
      
      const cx = w / 2;
      const cy = h / 2;
      const ellipseCenterX = cx;
      const ellipseCenterY = cy;
      const starX = ellipseCenterX + focusOffset;
      const starY = cy;

      // Planet position relative to focus (star)
      const r_orbital = a * (1 - e * e) / (1 + e * Math.cos(theta));
      const px = starX + r_orbital * Math.cos(theta);
      const py = starY - r_orbital * Math.sin(theta);

      // Trail
      if (!isPaused && trLen > 0) {
        trailRef.current.push({ x: px, y: py });
        if (trailRef.current.length > trLen) {
          trailRef.current = trailRef.current.slice(-trLen);
        }
      }

      // Clear
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, h);

      // Starfield
      ctx.save();
      for (let i = 0; i < 80; i++) {
        const sx = ((i * 7919 + 13) % w);
        const sy = ((i * 6271 + 37) % h);
        const brightness = 0.12 + (i % 5) * 0.06;
        ctx.fillStyle = `rgba(255,255,255,${brightness})`;
        ctx.fillRect(sx, sy, 1, 1);
      }
      ctx.restore();

      // Grid
      if (showGridRef.current) {
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 0.5;
        for (let gx = 0; gx < w; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
        for (let gy = 0; gy < h; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
      }

      // Axes
      if (showAxesRef.current) {
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(ellipseCenterX - a, cy); ctx.lineTo(ellipseCenterX + a, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ellipseCenterX, cy - b); ctx.lineTo(ellipseCenterX, cy + b); ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw orbit ellipse
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(ellipseCenterX, ellipseCenterY, a, b, 0, 0, 2 * Math.PI);
      ctx.stroke();

      // Swept area wedge (computed via mean anomaly stepping for accuracy)
      if (showSweptRef.current) {
        const dtWedge = (arcSz / 100) * period;
        const M2 = M + dtWedge;
        const E2 = solveKepler(M2 % (2 * Math.PI), e);
        const theta2 = eccentricToTrue(E2, e);

        ctx.fillStyle = "rgba(34,197,94,0.2)";
        ctx.strokeStyle = "rgba(34,197,94,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(starX, starY);

        const steps = 50;
        for (let i = 0; i <= steps; i++) {
          const tM = M + dtWedge * (i / steps);
          const tE = solveKepler(tM % (2 * Math.PI), e);
          const tTheta = eccentricToTrue(tE, e);
          const tR = a * (1 - e * e) / (1 + e * Math.cos(tTheta));
          const xx = starX + tR * Math.cos(tTheta);
          const yy = starY - tR * Math.sin(tTheta);
          ctx.lineTo(xx, yy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Motion trail
      if (showTrailRef.current && trailRef.current.length > 1) {
        const trail = trailRef.current;
        for (let i = 1; i < trail.length; i++) {
          const alpha = i / trail.length;
          ctx.strokeStyle = `rgba(${hexToRgb(p.planetColor)},${alpha * 0.6})`;
          ctx.lineWidth = 2 * alpha;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.stroke();
        }
      }

      // Radial vector
      if (showRadialRef.current) {
        ctx.strokeStyle = "rgba(255,200,50,0.4)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(starX, starY);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Empty focus
      if (showFociRef.current) {
        const efx = ellipseCenterX - focusOffset;
        ctx.fillStyle = "rgba(160,160,160,0.6)";
        ctx.beginPath();
        ctx.arc(efx, starY, 3, 0, 2 * Math.PI);
        ctx.fill();
        if (showLabelsRef.current) {
          ctx.fillStyle = "rgba(160,160,160,0.7)";
          ctx.font = "11px sans-serif";
          ctx.fillText("Empty focus", efx - 30, starY + 16);
        }
      }

      // Periapsis / apoapsis labels
      if (showLabelsRef.current) {
        const periX = starX + a * (1 - e); // periapsis: closest to focus
        const apoX = starX - a * (1 + e);   // apoapsis: farthest from focus
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "11px sans-serif";
        ctx.fillText("Periapsis", periX + 8, cy - 6);
        ctx.fillText("Apoapsis", apoX - 55, cy - 6);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath(); ctx.arc(periX, cy, 2, 0, 2 * Math.PI); ctx.fill();
        ctx.beginPath(); ctx.arc(apoX, cy, 2, 0, 2 * Math.PI); ctx.fill();
      }

      // Primary star glow
      const starGrad = ctx.createRadialGradient(starX, starY, 0, starX, starY, p.primaryRadius * 3);
      starGrad.addColorStop(0, p.primaryGlow + "88");
      starGrad.addColorStop(1, "transparent");
      ctx.fillStyle = starGrad;
      ctx.beginPath();
      ctx.arc(starX, starY, p.primaryRadius * 3, 0, 2 * Math.PI);
      ctx.fill();

      // Primary star
      ctx.fillStyle = p.primaryColor;
      ctx.shadowColor = p.primaryGlow;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(starX, starY, p.primaryRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Planet glow
      const planetGrad = ctx.createRadialGradient(px, py, 0, px, py, p.planetRadius * 2.5);
      planetGrad.addColorStop(0, p.planetGlow + "44");
      planetGrad.addColorStop(1, "transparent");
      ctx.fillStyle = planetGrad;
      ctx.beginPath();
      ctx.arc(px, py, p.planetRadius * 2.5, 0, 2 * Math.PI);
      ctx.fill();

      // Planet
      ctx.fillStyle = p.planetColor;
      ctx.shadowColor = p.planetGlow;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(px, py, p.planetRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Velocity vector (proper tangent direction)
      if (showVelRef.current) {
        // Velocity in orbital frame using eccentric anomaly
        const dEdt = 1 / (1 - e * Math.cos(E)); // n=1 normalized
        // Position from ellipse center: X = a*cosE, Y = b*sinE
        // Velocity: dX/dt = -a*sinE * dE/dt, dY/dt = b*cosE * dE/dt
        const vxOrb = -a * Math.sin(E) * dEdt;
        const vyOrb = b * Math.cos(E) * dEdt;
        // Canvas coords (y-flipped)
        const vxCanvas = vxOrb;
        const vyCanvas = -vyOrb;
        // Normalize and scale
        const vMag = Math.sqrt(vxCanvas * vxCanvas + vyCanvas * vyCanvas);
        const arrowScale = 40 / Math.max(vMag, 0.001); // scale to reasonable length
        const arrowLen = vMag * arrowScale;
        const nx = vxCanvas / vMag;
        const ny = vyCanvas / vMag;
        const tipX = px + nx * arrowLen;
        const tipY = py + ny * arrowLen;

        // Arrow shaft
        ctx.strokeStyle = "rgba(236,72,153,0.9)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        // Arrow head (filled triangle)
        const headLen = 10;
        const headAngle = Math.atan2(tipY - py, tipX - px);
        ctx.fillStyle = "rgba(236,72,153,0.9)";
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - headLen * Math.cos(headAngle - 0.45), tipY - headLen * Math.sin(headAngle - 0.45));
        ctx.lineTo(tipX - headLen * Math.cos(headAngle + 0.45), tipY - headLen * Math.sin(headAngle + 0.45));
        ctx.closePath();
        ctx.fill();
      }

      // Stats (throttled to avoid re-render storm)
      statsTickRef.current++;
      if (statsTickRef.current % 6 === 0) {
        const rNorm = r_orbital / a;
        const spd = Math.sqrt(Math.max(0, 2 / rNorm - 1));
        const semiLatus = 1 * (1 - e * e);
        const progressPct = (M / (2 * Math.PI)) * 100;
        const sr = (1 + e) / (1 - e);
        const h = Math.sqrt(semiLatus);
        const newStats: Stats = {
          speed: spd,
          distance: rNorm,
          speedRatio: sr,
          progress: progressPct,
          eccentricity: e,
          semiLatusRectum: semiLatus,
          energy: -0.5,
          angularMomentum: h,
          arealVelocity: h / 2,
        };
        statsRef.current = newStats;
        setStats(newStats);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="container mx-auto px-4 pt-8 pb-4">
          <h1 className="font-display text-3xl font-bold md:text-4xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Orbital Mechanics Simulator
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Kepler's Second Law: A planet sweeps out equal areas in equal times.
          </p>
        </div>

        <div className="container mx-auto px-4 pb-12">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Column */}
            <div className="flex-1 min-w-0">
              {/* Presets */}
              <div className="flex flex-wrap gap-2 mb-4">
                {PRESETS.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => selectPreset(i)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      activePreset === i
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-white/10 text-gray-300 hover:bg-white/20"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Canvas */}
              <div className="relative rounded-xl border border-white/10 overflow-hidden bg-[#0a0a0a]">
                <canvas
                  ref={canvasRef}
                  className="w-full"
                  style={{ height: "clamp(300px, 50vw, 500px)" }}
                />
                {paused && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                    <span className="text-white/50 text-sm font-medium tracking-wide">PAUSED</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="mt-4 flex gap-2 flex-wrap">
                <Button size="sm" variant={paused ? "default" : "secondary"} onClick={() => setPaused(!paused)} className="gap-1.5">
                  {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  {paused ? "Resume" : "Pause"}
                </Button>
                <Button size="sm" variant="outline" onClick={resetSim} className="gap-1.5 border-white/20 text-gray-300 hover:text-white">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSidebarOpen(!sidebarOpen)} className="gap-1.5 text-gray-400 hover:text-white lg:hidden">
                  <Info className="h-3.5 w-3.5" /> Learn
                </Button>
              </div>

              {/* Sliders */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <SliderControl label="Eccentricity" value={eccentricity} min={0.01} max={0.95} step={0.001} format={(v) => v.toFixed(3)} onChange={handleEccentricityChange} />
                <SliderControl label="Animation Speed" value={animSpeed} min={0.1} max={5} step={0.1} format={(v) => `${v.toFixed(1)}×`} onChange={(v) => setAnimSpeed(v[0])} />
                <SliderControl label="Orbit Scale" value={axisScale} min={0.5} max={2} step={0.1} format={(v) => `${v.toFixed(1)}×`} onChange={(v) => setAxisScale(v[0])} />
                <SliderControl label="Swept Area Arc" value={arcSize} min={0.1} max={5} step={0.1} format={(v) => `${v.toFixed(1)}%`} onChange={(v) => setArcSize(v[0])} />
                <SliderControl label="Trail Length" value={trailLength} min={0} max={200} step={1} format={(v) => `${v}`} onChange={(v) => setTrailLength(v[0])} />
              </div>

              {/* Toggles */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <ToggleControl label="Swept Area" checked={showSweptArea} onChange={setShowSweptArea} />
                <ToggleControl label="Motion Trail" checked={showTrail} onChange={setShowTrail} />
                <ToggleControl label="Velocity Vector" checked={showVelocity} onChange={setShowVelocity} />
                <ToggleControl label="Both Foci" checked={showBothFoci} onChange={setShowBothFoci} />
                <ToggleControl label="Axis Lines" checked={showAxes} onChange={setShowAxes} />
                <ToggleControl label="Grid Overlay" checked={showGrid} onChange={setShowGrid} />
                <ToggleControl label="Radial Vector" checked={showRadial} onChange={setShowRadial} />
                <ToggleControl label="Labels" checked={showLabels} onChange={setShowLabels} />
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <StatCard label="Orbital Speed" value={`${stats.speed.toFixed(3)} AU/yr`} />
                <StatCard label="Distance" value={`${stats.distance.toFixed(3)} AU`} />
                <StatCard label="Speed Ratio" value={stats.speedRatio.toFixed(2)} />
                <StatCard label="Progress" value={`${stats.progress.toFixed(1)}%`} />
                <StatCard label="Eccentricity" value={stats.eccentricity.toFixed(3)} />
                <StatCard label="Semi-Latus Rectum" value={stats.semiLatusRectum.toFixed(3)} />
                <StatCard label="Areal Velocity" value={`${stats.arealVelocity.toFixed(4)}`} highlight />
                <StatCard label="Angular Mom." value={stats.angularMomentum.toFixed(3)} />
              </div>
            </div>

            {/* Sidebar */}
            <div className={`lg:w-80 shrink-0 ${sidebarOpen ? "block" : "hidden lg:block"}`}>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 sticky top-20 space-y-4">
                <h2 className="text-lg font-semibold text-white">Kepler's Second Law</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  A line joining a planet and the Sun sweeps out <strong className="text-gray-200">equal areas during equal intervals of time</strong>.
                  This means a planet moves faster near periapsis and slower near apoapsis.
                </p>

                <div className="p-3 rounded-lg bg-white/[0.05] border border-white/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Speed Ratio</p>
                  <MathText
                    text="$\frac{v_{\text{peri}}}{v_{\text{apo}}} = \frac{1+e}{1-e}$"
                    className="text-gray-300 text-sm"
                  />
                  <p className="text-xs text-primary font-mono mt-1">= {stats.speedRatio.toFixed(3)}</p>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.05] border border-white/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Vis-viva Equation</p>
                  <MathText
                    text="$v = \sqrt{GM\left(\frac{2}{r} - \frac{1}{a}\right)}$"
                    className="text-gray-300 text-sm"
                  />
                </div>

                <div className="p-3 rounded-lg bg-white/[0.05] border border-white/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Areal Velocity (constant)</p>
                  <MathText
                    text="$\frac{dA}{dt} = \frac{1}{2}\sqrt{GMa(1-e^2)}$"
                    className="text-gray-300 text-sm"
                  />
                  <p className="text-xs text-emerald-400 font-mono mt-1">= {stats.arealVelocity.toFixed(4)}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Preset</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{preset.description}</p>
                </div>

                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Orbital mechanics isn't on the SAT, but mastering physics concepts builds problem-solving skills. Ready to tackle SAT Math questions?
                  </p>
                  <Link to="/quiz" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    Try a Practice Quiz <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────

function SliderControl({ label, value, min, max, step, format, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label className="text-xs text-gray-400">{label}</Label>
        <span className="text-xs font-mono text-gray-300">{format(value)}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={onChange} className="[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5" />
    </div>
  );
}

function ToggleControl({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} className="scale-[0.8]" />
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-emerald-500/30 bg-emerald-500/[0.05]" : "border-white/10 bg-white/[0.03]"}`}>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-mono mt-0.5 ${highlight ? "text-emerald-300" : "text-gray-200"}`}>{value}</p>
    </div>
  );
}

export default OrbitalMechanics;
