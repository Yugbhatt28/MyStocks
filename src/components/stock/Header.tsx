import { Activity, BarChart3 } from "lucide-react";
import { SmartSearchInput } from "./SmartSearchInput";

interface HeaderProps {
  onSearch: (symbol: string) => void;
  liveMode: boolean;
  onToggleLive: () => void;
}

export function Header({ onSearch, liveMode, onToggleLive }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-bold text-foreground">Stock Intelligence</h1>
      </div>

      <SmartSearchInput
        onSelect={onSearch}
        placeholder="Search company or ticker (e.g. Tesla, AAPL)..."
        className="mx-4 w-full max-w-md"
      />

      <button
        onClick={onToggleLive}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          liveMode
            ? "bg-profit/20 text-profit"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        <Activity className={`h-3.5 w-3.5 ${liveMode ? "animate-pulse" : ""}`} />
        {liveMode ? "LIVE" : "STATIC"}
      </button>
    </header>
  );
}
