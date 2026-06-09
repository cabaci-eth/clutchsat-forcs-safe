import { ExternalLink, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RuleSet, PRESETS } from "@/lib/cellularAutomata";

interface Props {
  rule: RuleSet;
}

const PRESET_NOTES: Record<string, { note: string; behavior: string }> = {
  conway: {
    note: "The most famous cellular automaton. Simple rules produce incredibly complex emergent behavior including gliders, oscillators, and Turing-complete computation.",
    behavior: "Creates stable structures, oscillators, and self-propelling 'spaceships' like gliders.",
  },
  highlife: {
    note: "Similar to Conway's but with an additional birth condition at 6 neighbors. Notable for its 'replicator' pattern that creates copies of itself.",
    behavior: "Produces replicators — patterns that duplicate themselves indefinitely.",
  },
  seeds: {
    note: "An explosive rule where cells are born but never survive. Any initial configuration rapidly expands into chaotic, beautiful patterns.",
    behavior: "Cells flash once and die. Produces explosive, fractal-like growth from any seed.",
  },
  briansBrain: {
    note: "A 3-state automaton where live cells always die (becoming 'dying' first). Produces self-organizing moving structures.",
    behavior: "Three states: alive → dying → dead. Creates rivers of moving cells.",
  },
  dayAndNight: {
    note: "A symmetric rule where live and dead cells follow complementary rules. Both dense and sparse regions are stable.",
    behavior: "Symmetric behavior — patterns work identically in positive and negative space.",
  },
  anneal: {
    note: "Tends to form large, stable blobs. Named after the metallurgical process of annealing where materials are heated and slowly cooled.",
    behavior: "Noise smooths into large stable regions, mimicking physical annealing.",
  },
};

export default function CAInfoPanel({ rule }: Props) {
  const presetKey = Object.entries(PRESETS).find(([, v]) => v.ruleString === rule.ruleString)?.[0];
  const presetInfo = presetKey ? PRESET_NOTES[presetKey] : null;

  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          About Cellular Automata
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Cellular automata are discrete computational systems where cells on a grid evolve based on simple local rules.
          Each cell's next state depends only on its current state and its neighbors — yet from these simple rules,
          astonishingly complex behavior can emerge, including self-replication, computation, and chaos.
        </p>

        <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground text-sm">{rule.name}</p>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary">{rule.ruleString}</span>
          </div>
          <p className="text-sm text-muted-foreground">{rule.description}</p>
          {presetInfo && (
            <>
              <p className="text-xs text-muted-foreground/80 italic">{presetInfo.note}</p>
              <p className="text-xs text-foreground/70">
                <span className="font-medium">Typical behavior:</span> {presetInfo.behavior}
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl bg-muted/50 border border-border p-4">
          <p className="font-semibold text-foreground text-xs mb-1.5">How B/S Notation Works</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">B</strong> (Birth): number of live neighbors needed for a dead cell to become alive.{" "}
            <strong className="text-foreground">S</strong> (Survival): number of live neighbors needed for a live cell to stay alive.
            For example, <span className="font-mono text-primary">B3/S23</span> means birth at exactly 3 neighbors, survival at 2 or 3.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a href="https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            Conway's Game of Life <ExternalLink className="h-3 w-3" />
          </a>
          <a href="https://en.wikipedia.org/wiki/Cellular_automaton" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            Cellular Automata <ExternalLink className="h-3 w-3" />
          </a>
          <a href="https://conwaylife.com/wiki/Main_Page" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            LifeWiki <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
