import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { type StockData } from "@/lib/stockData";
import { fetchRealStockData } from "@/lib/stockApi";
import { MultiChart } from "./MultiChart";
import { SmartSearchInput } from "./SmartSearchInput";

export function CompareStocks() {
  const [symbols, setSymbols] = useState<string[]>(["AAPL", "GOOGL"]);
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(symbols.map((s) => fetchRealStockData(s))).then((results) => {
      if (!cancelled) {
        setStocks(results.filter((r) => r.data !== null).map((r) => r.data!));
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [symbols.join(",")]);

  const addSymbol = (symbol: string) => {
    const sym = symbol.toUpperCase();
    if (sym && !symbols.includes(sym) && symbols.length < 5) {
      setSymbols([...symbols, sym]);
    }
  };

  const removeSymbol = (sym: string) => {
    setSymbols(symbols.filter((s) => s !== sym));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {symbols.map((s) => (
          <span key={s} className="flex items-center gap-1 rounded-md bg-primary/20 px-2.5 py-1 text-xs font-semibold text-primary">
            {s}
            <button onClick={() => removeSymbol(s)} className="ml-1 hover:text-loss"><X className="h-3 w-3" /></button>
          </span>
        ))}
        <SmartSearchInput
          onSelect={addSymbol}
          placeholder="Add stock..."
          compact
          inputClassName="w-40"
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2">Loading comparison data...</span>
        </div>
      ) : stocks.length > 0 ? (
        <>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Price Comparison</h3>
            <MultiChart stocks={stocks} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stocks.map((s) => (
              <div key={s.symbol} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {s.logo && <img src={s.logo} alt={s.name} className="h-6 w-6 rounded-full object-contain" />}
                    <span className="font-bold text-foreground">{s.symbol}</span>
                  </div>
                  <span className={`text-xs font-semibold ${s.changePercent >= 0 ? "text-profit" : "text-loss"}`}>
                    {s.changePercent >= 0 ? "+" : ""}{s.changePercent.toFixed(2)}%
                  </span>
                </div>
                <p className="mt-1 text-lg font-bold text-foreground">${s.currentPrice.toFixed(2)}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Max Profit: </span><span className="font-semibold text-primary">${s.dsaAnalytics.maxProfit.toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground">Range: </span><span className="font-semibold text-chart-4">${(s.dayHigh - s.dayLow).toFixed(2)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
