import { Body, totalKineticEnergy, totalPotentialEnergy, totalAngularMomentum, centerOfMass, vecMag } from "@/lib/threeBodyPhysics";

interface StatsProps {
  bodies: Body[];
  G: number;
  softening: number;
  time: number;
  dt: number;
  chaosIndicator: number;
  energyDrift: number;
  initialEnergy: number | null;
  integrator: string;
}

export function StatsPanel({ bodies, G, softening, time, dt, chaosIndicator, energyDrift, initialEnergy, integrator }: StatsProps) {
  if (bodies.length === 0) return null;

  const ke = totalKineticEnergy(bodies);
  const pe = totalPotentialEnergy(bodies, G, softening);
  const totalE = ke + pe;
  const L = totalAngularMomentum(bodies);
  const Lmag = vecMag(L);
  const com = centerOfMass(bodies);

  const driftPct = Math.abs(energyDrift * 100);
  const driftColor = driftPct > 1 ? "text-destructive" : driftPct > 0.1 ? "text-yellow-500" : "text-green-500";

  const stats = [
    { label: "Time", value: time.toFixed(2) },
    { label: "Total Energy", value: totalE.toFixed(4) },
    { label: "Kinetic E", value: ke.toFixed(4) },
    { label: "Potential E", value: pe.toFixed(4) },
    { label: "|L| Angular Mom.", value: Lmag.toFixed(4) },
    { label: "CoM Position", value: `(${com.pos.map(v => v.toFixed(2)).join(", ")})` },
    { label: "Step Size", value: dt.toFixed(5) },
    { label: "Integrator", value: integrator },
  ];

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">System Stats</h3>
      
      {/* Energy drift warning */}
      <div className="bg-muted/30 rounded px-2 py-1.5">
        <div className="text-[10px] text-muted-foreground">Energy Drift</div>
        <div className={`text-xs font-mono ${driftColor}`}>
          {driftPct.toFixed(4)}%
          {driftPct > 1 && <span className="text-[10px] ml-1">⚠ reduce time scale</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {stats.map(s => (
          <div key={s.label} className="bg-muted/30 rounded px-2 py-1.5">
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
            <div className="text-xs font-mono text-foreground truncate">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chaos indicator */}
      <div className="bg-muted/30 rounded px-2 py-1.5 mt-1">
        <div className="text-[10px] text-muted-foreground mb-1">Chaos Indicator</div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(chaosIndicator * 100, 100)}%`,
              backgroundColor: chaosIndicator > 0.6 ? "#ef4444" : chaosIndicator > 0.3 ? "#f59e0b" : "#22c55e",
            }}
          />
        </div>
      </div>

      {/* Per-body speeds */}
      {bodies.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Per-Body Speed</div>
          {bodies.map(b => (
            <div key={b.id} className="flex items-center gap-2 text-xs py-0.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
              <span className="text-muted-foreground truncate flex-1">{b.name}</span>
              <span className="font-mono">{vecMag(b.velocity).toFixed(3)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
