import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, Zap, BarChart2, ChevronUp, ChevronDown } from "lucide-react";
import type { StockData } from "@/lib/stockData";
import { calculateVolatility } from "@/lib/stockData";
import { StockChart } from "./StockChart";

interface DashboardViewProps {
  data: StockData | null;
}

export function DashboardView({ data }: DashboardViewProps) {
  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <BarChart2 className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">Search for a stock to begin</p>
          <p className="mt-1 text-sm">Try AAPL, GOOGL, TSLA, or NVDA</p>
        </div>
      </div>
    );
  }

  const isProfit = data.change >= 0;
  const volatility = calculateVolatility(data.prices);
  const avg = Math.round((data.prices.reduce((a, b) => a + b, 0) / data.prices.length) * 100) / 100;

  // Trend strength
  const recentPrices = data.prices.slice(-10);
  let trendUp = 0;
  for (let i = 1; i < recentPrices.length; i++) {
    if (recentPrices[i] > recentPrices[i - 1]) trendUp++;
  }
  const trendStrength = trendUp >= 6 ? "Strong Up" : trendUp >= 4 ? "Mild Up" : trendUp <= 2 ? "Strong Down" : "Mild Down";
  const trendIsUp = trendUp >= 5;

  return (
    <div className="space-y-4">
      {/* Hero Section */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground">{data.name}</h2>
            <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">{data.symbol}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-foreground">${data.currentPrice.toFixed(2)}</span>
            <span className={`flex items-center gap-1 text-sm font-semibold ${isProfit ? "text-profit" : "text-loss"}`}>
              {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isProfit ? "+" : ""}{data.change.toFixed(2)} ({isProfit ? "+" : ""}{data.changePercent.toFixed(2)}%)
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Last updated: {data.lastUpdated}</p>
        </div>
        <div className="w-48">
          <StockChart prices={data.prices.slice(-20)} timestamps={data.timestamps.slice(-20)} mini height={60} showArea={false} color={isProfit ? "oklch(0.72 0.20 155)" : "oklch(0.65 0.22 25)"} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main Chart */}
        <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Price Chart</h3>
          <StockChart prices={data.prices} timestamps={data.timestamps} label={data.symbol} />
        </div>

        {/* Quick Stats */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Stats</h3>
          <StatCard label="Day High" value={`$${data.dayHigh.toFixed(2)}`} icon={<ArrowUp className="h-4 w-4 text-profit" />} />
          <StatCard label="Day Low" value={`$${data.dayLow.toFixed(2)}`} icon={<ArrowDown className="h-4 w-4 text-loss" />} />
          <StatCard label="Avg Price" value={`$${avg.toFixed(2)}`} icon={<BarChart2 className="h-4 w-4 text-primary" />} />
          <StatCard label="Volatility" value={`$${volatility.toFixed(2)}`} icon={<Zap className="h-4 w-4 text-chart-4" />} />
          <StatCard
            label="Trend"
            value={trendStrength}
            icon={trendIsUp ? <ChevronUp className="h-4 w-4 text-profit" /> : <ChevronDown className="h-4 w-4 text-loss" />}
          />
        </div>
      </div>

      {/* DSA Analytics */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">DSA Analytics</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <DSACard label="Max Price" value={`$${data.dsaAnalytics.maxPrice.toFixed(2)}`} algo="HEAP" colorClass="text-profit" />
          <DSACard label="Min Price" value={`$${data.dsaAnalytics.minPrice.toFixed(2)}`} algo="HEAP" colorClass="text-loss" />
          <DSACard label="Max Profit" value={`$${data.dsaAnalytics.maxProfit.toFixed(2)}`} algo="GREEDY" colorClass="text-primary" />
          <DSACard label="Avg Span" value={(data.dsaAnalytics.stockSpan.reduce((a, b) => a + b, 0) / data.dsaAnalytics.stockSpan.length).toFixed(1)} algo="STACK" colorClass="text-chart-4" />
          <DSACard label="NGE Coverage" value={`${Math.round((data.dsaAnalytics.nextGreaterElement.filter((v) => v !== null).length / data.dsaAnalytics.nextGreaterElement.length) * 100)}%`} algo="STACK" colorClass="text-chart-5" />
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-lg border border-border bg-card">
        <h3 className="border-b border-border px-4 py-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Price Data</h3>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 font-medium">Span</th>
                <th className="px-4 py-2 font-medium">Next Greater</th>
              </tr>
            </thead>
            <tbody>
              {data.prices.slice(-20).reverse().map((price, i) => {
                const idx = data.prices.length - 1 - i;
                return (
                  <tr key={idx} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-2 text-muted-foreground">{data.timestamps[idx]}</td>
                    <td className="px-4 py-2 font-mono font-medium text-foreground">${price.toFixed(2)}</td>
                    <td className="px-4 py-2 font-mono text-primary">{data.dsaAnalytics.stockSpan[idx]}</td>
                    <td className="px-4 py-2 font-mono text-muted-foreground">
                      {data.dsaAnalytics.nextGreaterElement[idx] != null ? `$${data.dsaAnalytics.nextGreaterElement[idx]!.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function DSACard({ label, value, algo, colorClass }: { label: string; value: string; algo: string; colorClass: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{algo}</span>
      </div>
      <p className={`mt-1 text-lg font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}
