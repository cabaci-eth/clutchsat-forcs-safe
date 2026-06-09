// N-Body Physics Engine — RK4, RK45 Adaptive, Yoshida Symplectic Integrators

export interface Body {
  id: string;
  name: string;
  mass: number;
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
  radius: number;
  showLabel: boolean;
  locked: boolean;
  trail: [number, number, number][];
}

export type CollisionMode = "merge" | "bounce" | "pass";

export interface SimState {
  bodies: Body[];
  time: number;
  G: number;
  softening: number;
  inverseCube: boolean;
}

type Vec3 = [number, number, number];

const add = (a: Vec3, b: Vec3): Vec3 => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0]*s, a[1]*s, a[2]*s];
const dot = (a: Vec3, b: Vec3): number => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const mag = (a: Vec3): number => Math.sqrt(dot(a, a));
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1]*b[2] - a[2]*b[1],
  a[2]*b[0] - a[0]*b[2],
  a[0]*b[1] - a[1]*b[0],
];

export function computeAccelerations(
  positions: Vec3[], masses: number[], G: number, softening: number, inverseCube: boolean
): Vec3[] {
  const n = positions.length;
  const accs: Vec3[] = positions.map(() => [0, 0, 0]);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const r = sub(positions[j], positions[i]);
      const dist = Math.sqrt(dot(r, r) + softening * softening);
      const forceMag = inverseCube
        ? G / (dist * dist * dist * dist)
        : G / (dist * dist * dist);
      accs[i] = add(accs[i], scale(r, forceMag * masses[j]));
      accs[j] = add(accs[j], scale(r, -forceMag * masses[i]));
    }
  }
  return accs;
}

// Standard RK4 step (clean implementation)
function rk4StepRaw(
  pos: Vec3[], vel: Vec3[], masses: number[], G: number, softening: number, inverseCube: boolean, lockedIndices: Set<number>, dt: number
): { pos: Vec3[]; vel: Vec3[] } {
  const getAccs = (p: Vec3[]) => computeAccelerations(p, masses, G, softening, inverseCube);
  const n = pos.length;

  const a1 = getAccs(pos);

  const p2 = pos.map((p, i) => add(p, scale(vel[i], dt / 2)));
  const v2 = vel.map((v, i) => add(v, scale(a1[i], dt / 2)));
  const a2 = getAccs(p2);

  const p3 = pos.map((p, i) => add(p, scale(v2[i], dt / 2)));
  const v3 = vel.map((v, i) => add(v, scale(a2[i], dt / 2)));
  const a3 = getAccs(p3);

  const p4 = pos.map((p, i) => add(p, scale(v3[i], dt)));
  const v4 = vel.map((v, i) => add(v, scale(a3[i], dt)));
  const a4 = getAccs(p4);

  const newP = pos.map((p, i) => {
    if (lockedIndices.has(i)) return p;
    return add(p, scale(
      add(add(vel[i], scale(v2[i], 2)), add(scale(v3[i], 2), v4[i])),
      dt / 6
    ));
  });
  const newV = vel.map((v, i) => {
    if (lockedIndices.has(i)) return v;
    return add(v, scale(
      add(add(a1[i], scale(a2[i], 2)), add(scale(a3[i], 2), a4[i])),
      dt / 6
    ));
  });

  return { pos: newP, vel: newV };
}

export function rk4Step(state: SimState, dt: number): SimState {
  const { bodies, G, softening, inverseCube } = state;
  if (bodies.length === 0) return { ...state, time: state.time + dt };

  const pos: Vec3[] = bodies.map(b => [...b.position] as Vec3);
  const vel: Vec3[] = bodies.map(b => [...b.velocity] as Vec3);
  const masses = bodies.map(b => b.mass);
  const lockedIndices = new Set<number>();
  bodies.forEach((b, i) => { if (b.locked) lockedIndices.add(i); });

  const result = rk4StepRaw(pos, vel, masses, G, softening, inverseCube, lockedIndices, dt);

  return {
    ...state,
    time: state.time + dt,
    bodies: bodies.map((b, i) => ({
      ...b,
      position: result.pos[i],
      velocity: result.vel[i],
    })),
  };
}

// RK45 adaptive step — uses Richardson extrapolation (two half-steps vs one full step)
export function rk45Step(state: SimState, dt: number, tol: number = 1e-8): { state: SimState; dtNext: number; error: number } {
  const { bodies, G, softening, inverseCube } = state;
  const n = bodies.length;
  if (n === 0) return { state: { ...state, time: state.time + dt }, dtNext: dt, error: 0 };

  const pos: Vec3[] = bodies.map(b => [...b.position] as Vec3);
  const vel: Vec3[] = bodies.map(b => [...b.velocity] as Vec3);
  const masses = bodies.map(b => b.mass);
  const lockedIndices = new Set<number>();
  bodies.forEach((b, i) => { if (b.locked) lockedIndices.add(i); });

  // Two half-steps
  const half = dt / 2;
  const midResult = rk4StepRaw(pos, vel, masses, G, softening, inverseCube, lockedIndices, half);
  const fullFromHalf = rk4StepRaw(midResult.pos, midResult.vel, masses, G, softening, inverseCube, lockedIndices, half);

  // One full step
  const fullDirect = rk4StepRaw(pos, vel, masses, G, softening, inverseCube, lockedIndices, dt);

  // Error estimate
  let maxErr = 0;
  for (let i = 0; i < n; i++) {
    if (lockedIndices.has(i)) continue;
    const errP = mag(sub(fullFromHalf.pos[i], fullDirect.pos[i]));
    const errV = mag(sub(fullFromHalf.vel[i], fullDirect.vel[i]));
    maxErr = Math.max(maxErr, errP, errV * dt);
  }

  // Compute next dt
  const safety = 0.84;
  let dtNext: number;
  if (maxErr > 0) {
    dtNext = safety * dt * Math.pow(tol / maxErr, 0.2);
  } else {
    dtNext = dt * 2;
  }
  dtNext = Math.max(dt * 0.1, Math.min(dt * 5, dtNext));

  // Use higher-order result (two half-steps)
  const newBodies = bodies.map((b, i) => ({
    ...b,
    position: lockedIndices.has(i) ? b.position : fullFromHalf.pos[i],
    velocity: lockedIndices.has(i) ? b.velocity : fullFromHalf.vel[i],
  }));

  return {
    state: { ...state, time: state.time + dt, bodies: newBodies },
    dtNext,
    error: maxErr,
  };
}

// Yoshida 4th-order symplectic integrator
const YOSHIDA_W0 = -Math.cbrt(2) / (2 - Math.cbrt(2));
const YOSHIDA_W1 = 1 / (2 - Math.cbrt(2));
const YOSHIDA_C = [YOSHIDA_W1 / 2, (YOSHIDA_W0 + YOSHIDA_W1) / 2, (YOSHIDA_W0 + YOSHIDA_W1) / 2, YOSHIDA_W1 / 2];
const YOSHIDA_D = [YOSHIDA_W1, YOSHIDA_W0, YOSHIDA_W1, 0];

export function yoshidaStep(state: SimState, dt: number): SimState {
  const { bodies, G, softening, inverseCube } = state;
  const n = bodies.length;
  if (n === 0) return { ...state, time: state.time + dt };

  let pos: Vec3[] = bodies.map(b => [...b.position] as Vec3);
  let vel: Vec3[] = bodies.map(b => [...b.velocity] as Vec3);
  const masses = bodies.map(b => b.mass);
  const lockedIndices = new Set<number>();
  bodies.forEach((b, i) => { if (b.locked) lockedIndices.add(i); });

  for (let s = 0; s < 4; s++) {
    pos = pos.map((p, i) => lockedIndices.has(i) ? p : add(p, scale(vel[i], YOSHIDA_C[s] * dt)));
    if (YOSHIDA_D[s] !== 0) {
      const accs = computeAccelerations(pos, masses, G, softening, inverseCube);
      vel = vel.map((v, i) => lockedIndices.has(i) ? v : add(v, scale(accs[i], YOSHIDA_D[s] * dt)));
    }
  }

  return {
    ...state,
    time: state.time + dt,
    bodies: bodies.map((b, i) => ({ ...b, position: pos[i], velocity: vel[i] })),
  };
}

// Collision detection & handling — checks body radii
export interface CollisionEvent {
  type: "merge" | "bounce";
  bodyA: string;
  bodyB: string;
  time: number;
}

export function handleCollisions(state: SimState, mode: CollisionMode): { state: SimState; events: CollisionEvent[] } {
  if (mode === "pass" || state.bodies.length < 2) return { state, events: [] };

  const events: CollisionEvent[] = [];
  let bodies = [...state.bodies];
  let changed = true;

  while (changed) {
    changed = false;
    for (let i = 0; i < bodies.length && !changed; i++) {
      for (let j = i + 1; j < bodies.length && !changed; j++) {
        const dist = mag(sub(bodies[j].position, bodies[i].position));
        const threshold = (bodies[i].radius + bodies[j].radius) * 1.1; // radii + 10% buffer
        if (dist < threshold) {
          if (mode === "merge") {
            const totalMass = bodies[i].mass + bodies[j].mass;
            const newPos = add(
              scale(bodies[i].position, bodies[i].mass / totalMass),
              scale(bodies[j].position, bodies[j].mass / totalMass)
            ) as [number, number, number];
            const newVel = add(
              scale(bodies[i].velocity, bodies[i].mass / totalMass),
              scale(bodies[j].velocity, bodies[j].mass / totalMass)
            ) as [number, number, number];
            const merged: Body = {
              ...bodies[i],
              mass: totalMass,
              position: newPos,
              velocity: newVel,
              radius: Math.cbrt(bodies[i].radius ** 3 + bodies[j].radius ** 3),
              name: `${bodies[i].name}+${bodies[j].name}`,
            };
            events.push({ type: "merge", bodyA: bodies[i].name, bodyB: bodies[j].name, time: state.time });
            bodies = bodies.filter((_, k) => k !== i && k !== j);
            bodies.push(merged);
            changed = true;
          } else if (mode === "bounce") {
            const n = sub(bodies[j].position, bodies[i].position);
            const d = mag(n);
            if (d === 0) continue;
            const un: Vec3 = scale(n, 1 / d);
            const v1n = dot(bodies[i].velocity, un);
            const v2n = dot(bodies[j].velocity, un);
            const m1 = bodies[i].mass, m2 = bodies[j].mass;
            const v1nNew = (v1n * (m1 - m2) + 2 * m2 * v2n) / (m1 + m2);
            const v2nNew = (v2n * (m2 - m1) + 2 * m1 * v1n) / (m1 + m2);
            bodies[i] = { ...bodies[i], velocity: add(bodies[i].velocity, scale(un, v1nNew - v1n)) };
            bodies[j] = { ...bodies[j], velocity: add(bodies[j].velocity, scale(un, v2nNew - v2n)) };
            const overlap = threshold - d;
            if (overlap > 0) {
              bodies[i] = { ...bodies[i], position: add(bodies[i].position, scale(un, -overlap / 2)) };
              bodies[j] = { ...bodies[j], position: add(bodies[j].position, scale(un, overlap / 2)) };
            }
            events.push({ type: "bounce", bodyA: bodies[i].name, bodyB: bodies[j].name, time: state.time });
            changed = true;
          }
        }
      }
    }
  }

  return { state: { ...state, bodies }, events };
}

export function totalKineticEnergy(bodies: Body[]): number {
  return bodies.reduce((sum, b) => sum + 0.5 * b.mass * dot(b.velocity, b.velocity), 0);
}

export function totalPotentialEnergy(bodies: Body[], G: number, softening: number): number {
  let pe = 0;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const r = sub(bodies[j].position, bodies[i].position);
      const dist = Math.sqrt(dot(r, r) + softening * softening);
      pe -= G * bodies[i].mass * bodies[j].mass / dist;
    }
  }
  return pe;
}

export function totalAngularMomentum(bodies: Body[]): Vec3 {
  let L: Vec3 = [0, 0, 0];
  for (const b of bodies) {
    const [x, y, z] = b.position;
    const [vx, vy, vz] = b.velocity;
    L[0] += b.mass * (y * vz - z * vy);
    L[1] += b.mass * (z * vx - x * vz);
    L[2] += b.mass * (x * vy - y * vx);
  }
  return L;
}

export function centerOfMass(bodies: Body[]): { pos: Vec3; vel: Vec3 } {
  let totalMass = 0;
  let pos: Vec3 = [0, 0, 0];
  let vel: Vec3 = [0, 0, 0];
  for (const b of bodies) {
    totalMass += b.mass;
    pos = add(pos, scale(b.position, b.mass));
    vel = add(vel, scale(b.velocity, b.mass));
  }
  if (totalMass > 0) {
    pos = scale(pos, 1 / totalMass);
    vel = scale(vel, 1 / totalMass);
  }
  return { pos, vel };
}

export function escapeVelocity(body: Body, allBodies: Body[], G: number): number {
  let pe = 0;
  for (const other of allBodies) {
    if (other.id === body.id) continue;
    const dist = mag(sub(other.position, body.position));
    if (dist > 0) pe += G * other.mass / dist;
  }
  return Math.sqrt(2 * pe);
}

export const vecMag = mag;
export const vecSub = sub;
export const vecAdd = add;
export const vecScale = scale;
export const vecDot = dot;
export const vecCross = cross;
