import { useState, useEffect, useRef } from "react";
import { Search, Activity, BarChart3, Loader2 } from "lucide-react";
import { searchStockSymbols } from "@/lib/stockApi";
import type { SymbolSearchResult } from "@/lib/stockApi";

interface HeaderProps {
  onSearch: (symbol: string) => void;
  liveMode: boolean;
  onToggleLive: () => void;
}

export function Header({ onSearch, liveMode, onToggleLive }: HeaderProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<SymbolSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = input.trim();
    if (query.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchStockSymbols(query);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectSymbol = (symbol: string) => {
    setInput("");
    setSuggestions([]);
    setShowDropdown(false);
    onSearch(symbol);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      selectSymbol(input.trim().toUpperCase());
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-bold text-foreground">Stock Intelligence</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-md items-center gap-2 mx-4">
        <div className="relative flex-1" ref={dropdownRef}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Search company or ticker (e.g. Tesla, AAPL)..."
            className="h-9 w-full rounded-md border border-border bg-input pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {showDropdown && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-card shadow-lg">
              {suggestions.map((s) => (
                <button
                  key={s.symbol}
                  type="button"
                  onClick={() => selectSymbol(s.symbol)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-foreground">{s.symbol}</span>
                    <p className="truncate text-xs text-muted-foreground">{s.description}</p>
                  </div>
                  <span className="ml-2 shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Stock
                  </span>
                </button>
              ))}
            </div>
          )}
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
