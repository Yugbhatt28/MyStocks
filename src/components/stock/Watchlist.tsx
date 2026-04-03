import { useState, useEffect } from "react";
import { X, Star, Loader2 } from "lucide-react";
import { type StockData } from "@/lib/stockData";
import { fetchRealMarketData } from "@/lib/stockApi";
import { StockChart } from "./StockChart";
import { SmartSearchInput } from "./SmartSearchInput";

interface WatchlistProps {
  onSelectStock: (symbol: string) => void;
}

export function Watchlist({ onSelectStock }: WatchlistProps) {
  const [symbols, setSymbols] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("watchlist");
      return saved ? JSON.parse(saved) : ["AAPL", "TSLA", "NVDA"];
    } catch {
      return ["AAPL", "TSLA", "NVDA"];
    }
  });
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem("watchlist", JSON.stringify(symbols));
  }, [symbols]);

  useEffect(() => {
    if (symbols.length === 0) {
      setStocks([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchRealMarketData(symbols).then(({ stocks: data }) => {
      if (!cancelled) {
        setStocks(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [symbols.join(",")]);

  const addSymbol = (symbol: string) => {
    const sym = symbol.toUpperCase();
    if (sym && !symbols.includes(sym)) {
      setSymbols([...symbols, sym]);
    }
  };

  const removeSymbol = (sym: string) => {
    setSymbols(symbols.filter((s) => s !== sym));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-chart-4" />
        <h2 className="text-lg font-bold text-foreground">Your Watchlist</h2>
      </div>

      <div className="flex items-center gap-2">
        <SmartSearchInput
          onSelect={addSymbol}
          placeholder="Search & add stock..."
          inputClassName="w-48"
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2">Loading watchlist...</span>
        </div>
      ) : stocks.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No stocks in watchlist. Add one above!</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stocks.map((s) => (
            <WatchlistCard key={s.symbol} stock={s} onRemove={removeSymbol} onSelect={onSelectStock} />
          ))}
        </div>
      )}
    </div>
  );
}

function WatchlistCard({ stock, onRemove, onSelect }: { stock: StockData; onRemove: (s: string) => void; onSelect: (s: string) => void }) {
  const isProfit = stock.changePercent >= 0;
  return (
    <div className="group rounded-lg border border-border bg-card p-4 transition-colors hover:bg-surface-hover">
      <div className="flex items-start justify-between">
        <button onClick={() => onSelect(stock.symbol)} className="text-left">
          <div className="flex items-center gap-2">
            {stock.logo && <img src={stock.logo} alt={stock.name} className="h-6 w-6 rounded-full object-contain" />}
            <span className="font-bold text-foreground">{stock.symbol}</span>
            <span className={`text-xs font-semibold ${isProfit ? "text-profit" : "text-loss"}`}>
              {isProfit ? "+" : ""}{stock.changePercent.toFixed(2)}%
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{stock.name}</p>
          <p className="mt-1 text-xl font-bold text-foreground">${stock.currentPrice.toFixed(2)}</p>
        </button>
        <button
          onClick={() => onRemove(stock.symbol)}
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-loss group-hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 h-12">
        <StockChart
          prices={stock.prices.slice(-20)}
          timestamps={stock.timestamps.slice(-20)}
          mini
          height={48}
          showArea={false}
          color={isProfit ? "oklch(0.72 0.20 155)" : "oklch(0.65 0.22 25)"}
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 text-xs">
        <div><span className="text-muted-foreground">High: </span><span className="text-profit">${stock.dayHigh.toFixed(2)}</span></div>
        <div><span className="text-muted-foreground">Low: </span><span className="text-loss">${stock.dayLow.toFixed(2)}</span></div>
      </div>
    </div>
  );
}
