import { useState, useEffect, useRef } from "react";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { searchStockSymbols } from "@/lib/stockApi";
import type { SymbolSearchResult } from "@/lib/stockApi";

interface SmartSearchInputProps {
  onSelect: (symbol: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  compact?: boolean;
}

export function SmartSearchInput({
  onSelect,
  placeholder = "Search company or ticker...",
  className = "",
  inputClassName = "",
  compact = false,
}: SmartSearchInputProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<SymbolSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = input.trim();
    if (query.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      setNoResults(false);
      return;
    }

    setSearching(true);
    setNoResults(false);
    debounceRef.current = setTimeout(async () => {
      const results = await searchStockSymbols(query);
      setSuggestions(results);
      setShowDropdown(true);
      setNoResults(results.length === 0);
      setSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input]);

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
    setNoResults(false);
    onSelect(symbol);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && suggestions.length > 0) {
      selectSymbol(suggestions[0].symbol);
    }
  };

  const h = compact ? "h-7" : "h-9";
  const textSize = compact ? "text-xs" : "text-sm";
  const iconSize = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const pad = compact ? "pl-7 pr-7" : "pl-9 pr-9";

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative" ref={dropdownRef}>
        <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground ${iconSize}`} />
        {searching && (
          <Loader2 className={`absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground ${iconSize}`} />
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => (suggestions.length > 0 || noResults) && setShowDropdown(true)}
          placeholder={placeholder}
          className={`${h} w-full rounded-md border border-border bg-input ${pad} ${textSize} text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${inputClassName}`}
        />

        {showDropdown && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-card shadow-lg">
            {noResults && !searching ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-loss" />
                <span>No stocks or companies found for "<strong className="text-foreground">{input.trim()}</strong>"</span>
              </div>
            ) : (
              suggestions.map((s) => (
                <button
                  key={s.symbol}
                  type="button"
                  onClick={() => selectSymbol(s.symbol)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
                >
                  <div className="min-w-0 flex-1">
                    <span className={`${textSize} font-semibold text-foreground`}>{s.symbol}</span>
                    <p className={`truncate ${compact ? "text-[10px]" : "text-xs"} text-muted-foreground`}>{s.description}</p>
                  </div>
                  <span className="ml-2 shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Stock
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </form>
  );
}
