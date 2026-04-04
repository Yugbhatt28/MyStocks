import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Zap, DollarSign, Loader2 } from "lucide-react";
import type { StockData } from "@/lib/stockData";
import { fetchRealMarketData } from "@/lib/stockApi";
import { StockChart } from "./StockChart";

const MARKET_SYMBOLS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA", "NFLX", "JPM", "V", "BA", "DIS"];

interface MarketOverviewProps {
  onSelectStock: (symbol: string) => void;
}

export function MarketOverview({ onSelectStock }: MarketOverviewProps) {
  const [marketData, setMarketData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRealMarketData(MARKET_SYMBOLS).then(({ stocks, errors }) => {
      if (!cancelled) {
        setMarketData(stocks);
        if (errors.length > 0) console.warn("Market fetch errors:", errors);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg">Loading market data...</span>
      </div>
    );
  }

  const sorted = [...marketData];
  const topGainers = [...sorted].sort((a, b) => b.changePercent - a.changePercent).slice(0, 4);
  const topLosers = [...sorted].sort((a, b) => a.changePercent - b.changePercent).slice(0, 4);
  const mostVolatile = [...sorted].sort((a, b) => (b.dayHigh - b.dayLow) - (a.dayHigh - a.dayLow)).slice(0, 4);
  const mostProfitable = [...sorted].sort((a, b) => b.dsaAnalytics.maxProfit - a.dsaAnalytics.maxProfit).slice(0, 4);

  return (
    <div className="space-y-6">
      <Section title="Top Gainers" icon={<TrendingUp className="h-4 w-4 text-profit" />} stocks={topGainers} onSelect={onSelectStock} />
      <Section title="Top Losers" icon={<TrendingDown className="h-4 w-4 text-loss" />} stocks={topLosers} onSelect={onSelectStock} />
      <Section title="Most Volatile" icon={<Zap className="h-4 w-4 text-chart-4" />} stocks={mostVolatile} onSelect={onSelectStock} />
      <Section title="Most Profitable" icon={<DollarSign className="h-4 w-4 text-primary" />} stocks={mostProfitable} onSelect={onSelectStock} />
    </div>
  );
}

function Section({ title, icon, stocks, onSelect }: { title: string; icon: React.ReactNode; stocks: StockData[]; onSelect: (s: string) => void }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stocks.map((s) => (
          <button
            key={s.symbol}
            onClick={() => onSelect(s.symbol)}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-surface-hover"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {s.logo && <img src={s.logo} alt={s.name} className="h-5 w-5 rounded-full object-contain" />}
                <span className="text-sm font-bold text-foreground">{s.symbol}</span>
              </div>
              <span className={`text-xs font-semibold ${s.changePercent >= 0 ? "text-profit" : "text-loss"}`}>
                {s.changePercent >= 0 ? "+" : ""}{s.changePercent.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{s.name}</p>
            <p className="text-lg font-bold text-foreground">${s.currentPrice.toFixed(2)}</p>
            <div className="h-10">
              <StockChart
                prices={s.prices.slice(-20)}
                timestamps={s.timestamps.slice(-20)}
                mini
                height={40}
                showArea={false}
                color={s.changePercent >= 0 ? "oklch(0.72 0.20 155)" : "oklch(0.65 0.22 25)"}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
