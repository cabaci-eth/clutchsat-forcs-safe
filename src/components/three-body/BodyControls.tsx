import { Body } from "@/lib/threeBodyPhysics";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Trash2, Lock, Unlock } from "lucide-react";
import { useState } from "react";

interface BodyControlsProps {
  bodies: Body[];
  onUpdateBody: (id: string, updates: Partial<Body>) => void;
  onDeleteBody: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function BodyControls({ bodies, onUpdateBody, onDeleteBody, selectedId, onSelect }: BodyControlsProps) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bodies ({bodies.length}/6)</h3>
      {bodies.map(body => (
        <BodyCard
          key={body.id}
          body={body}
          isSelected={selectedId === body.id}
          onSelect={() => onSelect(body.id)}
          onUpdate={(u) => onUpdateBody(body.id, u)}
          onDelete={() => onDeleteBody(body.id)}
        />
      ))}
    </div>
  );
}

function BodyCard({ body, isSelected, onSelect, onUpdate, onDelete }: {
  body: Body;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (u: Partial<Body>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={`rounded-lg border transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-border bg-card/50"}`}>
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-left"
            onClick={(e) => { onSelect(); }}
          >
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: body.color }} />
            <span className="text-sm font-medium flex-1 truncate text-foreground">{body.name}</span>
            <span className="text-[10px] text-muted-foreground font-mono">m={body.mass.toFixed(1)}</span>
            <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            {/* Mass */}
            <div>
              <label className="text-[10px] text-muted-foreground">Mass: {body.mass.toFixed(2)}</label>
              <Slider
                min={-1} max={3} step={0.01}
                value={[Math.log10(body.mass)]}
                onValueChange={([v]) => onUpdate({ mass: Math.pow(10, v) })}
              />
            </div>
            {/* Velocity */}
            {(["vx", "vy", "vz"] as const).map((axis, i) => (
              <div key={axis}>
                <label className="text-[10px] text-muted-foreground">{axis}: {body.velocity[i].toFixed(2)}</label>
                <Slider
                  min={-5} max={5} step={0.01}
                  value={[body.velocity[i]]}
                  onValueChange={([v]) => {
                    const vel = [...body.velocity] as [number, number, number];
                    vel[i] = v;
                    onUpdate({ velocity: vel });
                  }}
                />
              </div>
            ))}
            {/* Color */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground">Color</label>
              <input
                type="color"
                value={body.color}
                onChange={(e) => onUpdate({ color: e.target.value })}
                className="w-6 h-6 rounded border-0 cursor-pointer"
              />
            </div>
            {/* Radius */}
            <div>
              <label className="text-[10px] text-muted-foreground">Radius: {body.radius.toFixed(2)}</label>
              <Slider
                min={0.02} max={0.3} step={0.01}
                value={[body.radius]}
                onValueChange={([v]) => onUpdate({ radius: v })}
              />
            </div>
            {/* Toggles */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {body.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                <span className="text-[10px] text-muted-foreground">Lock</span>
              </div>
              <Switch checked={body.locked} onCheckedChange={(c) => onUpdate({ locked: c })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Show Label</span>
              <Switch checked={body.showLabel} onCheckedChange={(c) => onUpdate({ showLabel: c })} />
            </div>
            <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
              <Trash2 className="h-3 w-3 mr-1" /> Remove
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
