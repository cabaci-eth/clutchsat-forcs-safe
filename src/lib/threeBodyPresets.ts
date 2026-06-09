import { Body } from "./threeBodyPhysics";

export interface Preset {
  name: string;
  description: string;
  bodies: Omit<Body, "trail">[];
  G?: number;
  softening?: number;
  note?: string;
  defaultIntegrator?: "rk4" | "rk45" | "yoshida";
}

let idCounter = 0;
const uid = () => `preset-${++idCounter}`;

// Sun-Earth-Moon: proper hierarchical orbits
// Using G=1, Sun mass=100, Earth mass=0.3 at r=5, Moon mass=0.004 at r=5.15
// v_earth = sqrt(G*M_sun/r) = sqrt(100/5) = ~4.47
// v_moon_orbital = sqrt(G*M_earth/r_moon) = sqrt(0.3/0.15) = ~1.41
// Moon total v = v_earth + v_moon_orbital in same direction
const sunEarthR = 5;
const vEarth = Math.sqrt(100 / sunEarthR); // ~4.47
const moonOrbitR = 0.15;
const vMoonRel = Math.sqrt(0.3 / moonOrbitR); // ~1.41

export const presets: Preset[] = [
  {
    name: "Figure-8",
    description: "Three equal masses chasing each other in a stable figure-8 — the famous solution discovered by Moore (1993), proven by Chenciner & Montgomery (2000). Uses the exact published initial conditions.",
    note: "This orbit is periodic in theory, but floating-point arithmetic introduces tiny errors that accumulate over time. The eventual drift is physically meaningful — it demonstrates that even 'stable' solutions live on the edge of chaos.",
    bodies: [
      { id: uid(), name: "Body A", mass: 1, position: [-0.97000436, 0, 0.24308753], velocity: [0.93240737/2, 0.86473146/2, 0], color: "#ff6b6b", radius: 0.08, showLabel: true, locked: false },
      { id: uid(), name: "Body B", mass: 1, position: [0.97000436, 0, -0.24308753], velocity: [0.93240737/2, 0.86473146/2, 0], color: "#4ecdc4", radius: 0.08, showLabel: true, locked: false },
      { id: uid(), name: "Body C", mass: 1, position: [0, 0, 0], velocity: [-0.93240737, -0.86473146, 0], color: "#ffe66d", radius: 0.08, showLabel: true, locked: false },
    ],
    softening: 0.001,
  },
  {
    name: "Lagrange L4/L5",
    description: "Two large bodies orbit their centre of mass while a small trojan body sits at the L4 point (60° ahead). This triangular arrangement can be stable when the mass ratio is large enough.",
    bodies: [
      { id: uid(), name: "Star", mass: 10, position: [0, 0, 0], velocity: [0, 0.05, 0], color: "#ffd700", radius: 0.15, showLabel: true, locked: false },
      { id: uid(), name: "Planet", mass: 1, position: [3, 0, 0], velocity: [0, 1.85, 0], color: "#4a90d9", radius: 0.08, showLabel: true, locked: false },
      { id: uid(), name: "Trojan", mass: 0.001, position: [1.5, 0, 2.598], velocity: [-1.6, 0.975, 0], color: "#ff9f43", radius: 0.04, showLabel: true, locked: false },
    ],
    G: 1,
  },
  {
    name: "Chaotic Triangle",
    description: "Three unequal masses in an unstable triangular configuration. Even tiny numerical differences cause paths to diverge rapidly — a textbook example of chaos and sensitivity to initial conditions.",
    bodies: [
      { id: uid(), name: "Heavy", mass: 3, position: [0, 0, 0], velocity: [0, 0.2, 0], color: "#e74c3c", radius: 0.12, showLabel: true, locked: false },
      { id: uid(), name: "Medium", mass: 1, position: [2, 0, 1], velocity: [-0.5, -0.3, 0.1], color: "#3498db", radius: 0.08, showLabel: true, locked: false },
      { id: uid(), name: "Light", mass: 0.5, position: [-1, 0, 2], velocity: [0.4, 0.1, -0.2], color: "#2ecc71", radius: 0.06, showLabel: true, locked: false },
    ],
  },
  {
    name: "Binary + Intruder",
    description: "Two bodies orbit each other in a stable binary. A third body flies in and disrupts the system — gravitational scattering in action.",
    bodies: [
      { id: uid(), name: "Star A", mass: 2, position: [-0.5, 0, 0], velocity: [0, 0, 0.65], color: "#f39c12", radius: 0.1, showLabel: true, locked: false },
      { id: uid(), name: "Star B", mass: 2, position: [0.5, 0, 0], velocity: [0, 0, -0.65], color: "#e67e22", radius: 0.1, showLabel: true, locked: false },
      { id: uid(), name: "Intruder", mass: 1.5, position: [5, 0, 3], velocity: [-0.8, 0, -0.3], color: "#9b59b6", radius: 0.07, showLabel: true, locked: false },
    ],
  },
  {
    name: "Sun–Earth–Moon",
    description: "A scaled model of the Sun, Earth, and Moon. The Moon orbits the Earth in a tight circle while the Earth-Moon system orbits the Sun. Uses Yoshida integrator by default for long-term stability.",
    bodies: [
      { id: uid(), name: "Sun", mass: 100, position: [0, 0, 0], velocity: [0, 0, 0], color: "#ffd700", radius: 0.25, showLabel: true, locked: false },
      { id: uid(), name: "Earth", mass: 0.3, position: [sunEarthR, 0, 0], velocity: [0, 0, vEarth], color: "#4a90d9", radius: 0.06, showLabel: true, locked: false },
      { id: uid(), name: "Moon", mass: 0.004, position: [sunEarthR + moonOrbitR, 0, 0], velocity: [0, 0, vEarth + vMoonRel], color: "#bdc3c7", radius: 0.025, showLabel: true, locked: false },
    ],
    G: 1,
    softening: 0.005,
    defaultIntegrator: "yoshida",
  },
  {
    name: "Figure-8 Perturbed",
    description: "The famous figure-8 orbit with one mass slightly offset. Watch the beautiful choreography break apart — a vivid demonstration of chaotic sensitivity.",
    bodies: [
      { id: uid(), name: "Body A", mass: 1, position: [-0.97000436, 0, 0.24308753], velocity: [0.93240737/2, 0.86473146/2, 0], color: "#ff6b6b", radius: 0.08, showLabel: true, locked: false },
      { id: uid(), name: "Body B", mass: 1, position: [0.97000436, 0, -0.24308753], velocity: [0.93240737/2, 0.86473146/2, 0], color: "#4ecdc4", radius: 0.08, showLabel: true, locked: false },
      { id: uid(), name: "Body C", mass: 1, position: [0.05, 0, 0.05], velocity: [-0.93240737, -0.86473146, 0], color: "#ffe66d", radius: 0.08, showLabel: true, locked: false },
    ],
    softening: 0.001,
  },
  {
    name: "Custom",
    description: "Blank canvas. Add bodies manually and design your own configuration.",
    bodies: [],
  },
];

export function getPreset(name: string): Preset | undefined {
  return presets.find(p => p.name === name);
}
