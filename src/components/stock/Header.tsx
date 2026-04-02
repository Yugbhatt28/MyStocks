import { useState } from "react";
import { Search, Activity, BarChart3 } from "lucide-react";

interface HeaderProps {
  onSearch: (symbol: string) => void;
  liveMode: boolean;
  onToggleLive: () => void;
}

export function Header({ onSearch, liveMode, onToggleLive }: HeaderProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSearch(input.trim().toUpperCase());
      setInput("");
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-bold text-foreground">Stock Intelligence</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-md items-center gap-2 mx-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search ticker (e.g. AAPL, TSLA)..."
            className="h-9 w-full rounded-md border border-border bg-input pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </form>

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
