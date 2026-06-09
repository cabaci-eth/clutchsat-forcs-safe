import { useEffect, useState } from "react";
import { CalendarDays, Clock, Flame } from "lucide-react";

interface CountdownCardProps {
  testDate: Date;
  label: string;
}

const CountdownCard = ({ testDate, label }: CountdownCardProps) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = testDate.getTime() - now;
  if (diff <= 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        <p className="text-lg font-bold text-foreground">Test day has arrived! Good luck! 🎉</p>
      </div>
    );
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const urgencyColor = days < 14 ? "text-destructive" : days < 30 ? "text-accent-foreground" : "text-primary";
  const motivationalMessage =
    days < 7
      ? "Final stretch! Every minute counts. 🔥"
      : days < 14
        ? "Two weeks out – time to sharpen your skills!"
        : days < 30
          ? "One month away – stay consistent!"
          : "You've got time – build strong foundations!";

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-secondary/5 p-6 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { value: days, unit: "Days" },
          { value: hours, unit: "Hours" },
          { value: minutes, unit: "Min" },
          { value: seconds, unit: "Sec" },
        ].map(({ value, unit }) => (
          <div key={unit} className="text-center">
            <div className={`text-2xl sm:text-3xl font-bold font-display tabular-nums ${urgencyColor}`}>
              {String(value).padStart(2, "0")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{unit}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Flame className="h-4 w-4 text-accent" />
        <span>{motivationalMessage}</span>
      </div>
    </div>
  );
};

export default CountdownCard;
