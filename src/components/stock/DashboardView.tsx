import {
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Zap,
  BarChart2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Activity,
  Pause,
  AlertTriangle,
} from "lucide-react";
import type { StockData, CustomAlert } from "@/lib/stockData";
import { StockChart } from "./StockChart";
import { StrategySimulator } from "./StrategySimulator";
import { SlidingWindowCards } from "./SlidingWindowCards";
import { EventTimeline } from "./EventTimeline";
import { AdvancedAlerts } from "./AdvancedAlerts";
import { TimeframeFilter } from "./TimeframeFilter";
import { DSAVisualizer } from "./DSAVisualizer";
import {
  hasSufficientHistory,
  MIN_HISTORY,
  INSUFFICIENT_DATA_MESSAGE,
} from "@/lib/wasm/dsa/dsaWasm";
import { useState } from "react";

interface DashboardViewProps {
  data: StockData | null;
  loading?: boolean;
  liveMode?: boolean;
  previousData?: StockData | null;
  volatility?: number;
  customAlerts?: CustomAlert[];
  onAddAlert?: (alert: CustomAlert) => void;
  onRemoveAlert?: (id: string) => void;
}

export function DashboardView({
  data,
  loading,
  liveMode,
  previousData,
  volatility = 0,
  customAlerts = [],
  onAddAlert,
  onRemoveAlert,
}: DashboardViewProps) {
  const [filteredPrices, setFilteredPrices] = useState<number[] | null>(null);
  const [filteredTimestamps, setFilteredTimestamps] = useState<string[] | null>(
    null,
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg">Fetching live data...</span>
      </div>
    );
  }

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
  const avg =
    data.prices.length > 0 ?
      Math.round(
        (data.prices.reduce((a, b) => a + b, 0) / data.prices.length) * 100,
      ) / 100
    : data.currentPrice;

  const recentPrices = data.prices.slice(-10);
  let trendUp = 0;
  for (let i = 1; i < recentPrices.length; i++) {
    if (recentPrices[i] > recentPrices[i - 1]) trendUp++;
  }
  const trendCount = Math.max(recentPrices.length - 1, 1);
  const trendStrength =
    trendUp >= trendCount * 0.66 ? "Strong Up"
    : trendUp >= trendCount * 0.44 ? "Mild Up"
    : trendUp <= trendCount * 0.22 ? "Strong Down"
    : "Mild Down";
  const trendIsUp = trendUp >= trendCount * 0.5;

  const chartPrices = filteredPrices || data.prices;
  const chartTimestamps = filteredTimestamps || data.timestamps;

  // Mode detection: real-time when LIVE & history < 30 → span in minutes; else historical → days
  const enoughHistory = hasSufficientHistory(data.prices);
  const isRealtimeMode = !!liveMode && !enoughHistory;
  const spanUnit = isRealtimeMode ? "min" : "days";

  return (
    <div className="space-y-4">
      {/* Hero Section */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            {data.logo && (
              <img
                src={data.logo}
                alt={data.name}
                className="h-8 w-8 rounded-full object-contain"
              />
            )}
            <h2 className="text-2xl font-bold text-foreground">{data.name}</h2>
            <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
              {data.symbol}
            </span>
            {liveMode ?
              <span className="flex items-center gap-1 rounded bg-profit/10 px-2 py-0.5 text-[10px] font-medium text-profit">
                <Activity className="h-3 w-3 animate-pulse" /> LIVE
              </span>
            : <span className="flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Pause className="h-3 w-3" /> STATIC
              </span>
            }
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-foreground">
              ${data.currentPrice.toFixed(2)}
            </span>
            <span
              className={`flex items-center gap-1 text-sm font-semibold ${isProfit ? "text-profit" : "text-loss"}`}
            >
              {isProfit ?
                <TrendingUp className="h-4 w-4" />
              : <TrendingDown className="h-4 w-4" />}
              {isProfit ? "+" : ""}
              {data.change.toFixed(2)} ({isProfit ? "+" : ""}
              {data.changePercent.toFixed(2)}%)
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Last updated: {data.lastUpdated}
          </p>
        </div>
        {data.prices.length >= 3 && (
          <div className="w-48">
            <StockChart
              prices={data.prices.slice(-20)}
              timestamps={data.timestamps.slice(-20)}
              mini
              height={60}
              showArea={false}
              color={isProfit ? "oklch(0.72 0.20 155)" : "oklch(0.65 0.22 25)"}
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {data.prices.length >= 3 && (
          <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Price Chart
              </h3>
              <TimeframeFilter
                data={data}
                onFilteredData={(p, t) => {
                  setFilteredPrices(p);
                  setFilteredTimestamps(t);
                }}
              />
            </div>
            <StockChart
              prices={chartPrices}
              timestamps={chartTimestamps}
              label={data.symbol}
            />
          </div>
        )}

        <div
          className={`space-y-3 ${data.prices.length < 3 ? "lg:col-span-3" : ""}`}
        >
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Stats
          </h3>
          <div
            className={`grid gap-3 ${data.prices.length < 3 ? "sm:grid-cols-2 lg:grid-cols-5" : ""}`}
          >
            <StatCard
              label="Day High"
              value={`$${data.dayHigh.toFixed(2)}`}
              icon={<ArrowUp className="h-4 w-4 text-profit" />}
            />
            <StatCard
              label="Day Low"
              value={`$${data.dayLow.toFixed(2)}`}
              icon={<ArrowDown className="h-4 w-4 text-loss" />}
            />
            <StatCard
              label="Avg Price"
              value={`$${avg.toFixed(2)}`}
              icon={<BarChart2 className="h-4 w-4 text-primary" />}
            />
            <StatCard
              label="Volatility"
              value={`$${volatility.toFixed(2)}`}
              icon={<Zap className="h-4 w-4 text-chart-4" />}
            />
            <StatCard
              label="Trend"
              value={trendStrength}
              icon={
                trendIsUp ?
                  <ChevronUp className="h-4 w-4 text-profit" />
                : <ChevronDown className="h-4 w-4 text-loss" />
              }
            />
          </div>
        </div>
      </div>

      {/* Sliding Window Analytics (C++ Deque) */}
      <SlidingWindowCards data={data} />

      {/* DSA Analytics (C++ WASM) — guarded by 30-day minimum */}
      <div>
        <h3 className="mb-1 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          DSA Analytics
        </h3>
        <p className="mb-3 text-[10px] text-muted-foreground">
          Powered by C++ WebAssembly · Mode:{" "}
          {isRealtimeMode ? "Real-Time (minutes)" : "Historical (days)"}
        </p>
        {!enoughHistory ?
          <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-chart-4" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {INSUFFICIENT_DATA_MESSAGE}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Have {data.prices.length} of {MIN_HISTORY} required data points.
                Span, heap and trend algorithms are paused until enough history
                is available.
              </p>
            </div>
          </div>
        : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <DSACard
              label="Max Price"
              value={`$${data.dsaAnalytics.maxPrice.toFixed(2)}`}
              algo="HEAP"
              colorClass="text-profit"
            />
            <DSACard
              label="Min Price"
              value={`$${data.dsaAnalytics.minPrice.toFixed(2)}`}
              algo="HEAP"
              colorClass="text-loss"
            />
            <DSACard
              label="Greedy Profit"
              value={`$${data.dsaAnalytics.maxProfit.toFixed(2)}`}
              algo="GREEDY"
              colorClass="text-primary"
            />
            <DSACard
              label="Heap Profit"
              value={`$${data.dsaAnalytics.heapProfit.profit.toFixed(2)}`}
              algo="HEAP"
              colorClass="text-primary"
            />
            <DSACard
              label="Avg Span"
              value={`${(data.dsaAnalytics.stockSpan.reduce((a, b) => a + b, 0) / data.dsaAnalytics.stockSpan.length).toFixed(1)} ${spanUnit}`}
              algo="STACK"
              colorClass="text-chart-4"
            />
            <DSACard
              label="NGE Coverage"
              value={`${Math.round((data.dsaAnalytics.nextGreaterElement.filter((v) => v !== null).length / data.dsaAnalytics.nextGreaterElement.length) * 100)}%`}
              algo="STACK"
              colorClass="text-chart-5"
            />
          </div>
        }
      </div>

      {/* Strategy Simulator */}
      <StrategySimulator data={data} />

      {/* Event Timeline & Custom Alerts side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <EventTimeline data={data} previousData={previousData || null} />
        {onAddAlert && onRemoveAlert && (
          <AdvancedAlerts
            symbol={data.symbol}
            currentPrice={data.currentPrice}
            volatility={volatility}
            alerts={customAlerts}
            onAddAlert={onAddAlert}
            onRemoveAlert={onRemoveAlert}
          />
        )}
      </div>

      {/* DSA Visualization */}
      <DSAVisualizer
        stockSpan={data.dsaAnalytics.stockSpan}
        nextGreaterElement={data.dsaAnalytics.nextGreaterElement}
        prices={data.prices}
      />

      {/* Data Table */}
      {data.prices.length > 1 && (
        <div className="rounded-lg border border-border bg-card">
          <h3 className="border-b border-border px-4 py-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Price Data
          </h3>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">Price</th>
                  <th className="px-4 py-2 font-medium">Span ({spanUnit})</th>
                  <th className="px-4 py-2 font-medium">Next Greater Price</th>
                </tr>
              </thead>
              <tbody>
                {data.prices
                  .slice(-20)
                  .reverse()
                  .map((price, i) => {
                    const idx = data.prices.length - 1 - i;
                    return (
                      <tr
                        key={idx}
                        className="border-b border-border/50 hover:bg-surface-hover transition-colors"
                      >
                        <td className="px-4 py-2 text-muted-foreground">
                          {data.timestamps[idx]}
                        </td>
                        <td className="px-4 py-2 font-mono font-medium text-foreground">
                          ${price.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 font-mono text-primary">
                          {data.dsaAnalytics.stockSpan[idx] !== undefined ?
                            `${data.dsaAnalytics.stockSpan[idx]} Hour`
                          : "—"}
                        </td>{" "}
                        {/*${spanUnit} */}
                        <td className="px-4 py-2 font-mono text-muted-foreground">
                          {data.dsaAnalytics.nextGreaterElement[idx] != null ?
                            `$${(data.dsaAnalytics.nextGreaterElement[idx] as number).toFixed(2)}`
                          : "None"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function DSACard({
  label,
  value,
  algo,
  colorClass,
}: {
  label: string;
  value: string;
  algo: string;
  colorClass: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {algo}
        </span>
      </div>
      <p className={`mt-1 text-lg font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}
