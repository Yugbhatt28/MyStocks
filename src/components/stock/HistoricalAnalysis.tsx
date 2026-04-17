import { useState, useMemo } from "react";
import { Database, ArrowUpDown, Filter, RefreshCw, AlertTriangle } from "lucide-react";
import type { StockData } from "@/lib/stockData";
import { computeDSAAnalytics, hasSufficientHistory, MIN_HISTORY, INSUFFICIENT_DATA_MESSAGE } from "@/lib/wasm/dsa/dsaWasm";
import { useEffect } from "react";

interface HistoricalAnalysisProps {
  data: StockData | null;
}

export function HistoricalAnalysis({ data }: HistoricalAnalysisProps) {
  const [lastN, setLastN] = useState<number>(0); // 0 = full dataset
  const [slicedAnalytics, setSlicedAnalytics] = useState<StockData["dsaAnalytics"] | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  // Recompute DSA analytics whenever slicing changes
  useEffect(() => {
    if (!data || data.prices.length < 2) { setSlicedAnalytics(null); return; }

    const effectiveN = lastN > 0 ? Math.min(lastN, data.prices.length) : data.prices.length;
    const startIdx = data.prices.length - effectiveN;
    const slicedPrices = data.prices.slice(startIdx);

    // If full dataset, use existing analytics
    if (startIdx === 0) {
      setSlicedAnalytics(data.dsaAnalytics);
      return;
    }

    // Recompute for sliced data
    setRecomputing(true);
    computeDSAAnalytics(slicedPrices).then((analytics) => {
      setSlicedAnalytics(analytics);
      setRecomputing(false);
    });
  }, [data, lastN]);

  if (!data || data.prices.length < 2) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Database className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">No data for Historical Analysis</p>
          <p className="mt-1 text-sm">Search for a stock first from the Dashboard</p>
        </div>
      </div>
    );
  }

  // Guard: enforce minimum 30 days of history before running analysis
  if (!hasSufficientHistory(data.prices)) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-chart-4" />
          <p className="text-lg font-semibold text-foreground">{INSUFFICIENT_DATA_MESSAGE}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.symbol} currently has {data.prices.length} data point{data.prices.length === 1 ? "" : "s"}.
            Need at least {MIN_HISTORY} to safely run Stock Span, Heap analysis, and trend algorithms.
          </p>
        </div>
      </div>
    );
  }

  const effectiveN = lastN > 0 ? Math.min(lastN, data.prices.length) : data.prices.length;
  const startIdx = data.prices.length - effectiveN;
  const prices = data.prices.slice(startIdx);
  const timestamps = data.timestamps.slice(startIdx);

  const analytics = slicedAnalytics || data.dsaAnalytics;
  const spans = analytics.stockSpan;
  const nges = analytics.nextGreaterElement;
  const { maxPrice, minPrice, maxProfit, heapProfit } = analytics;

  const avgSpan = spans.length > 0
    ? (spans.reduce((a, b) => a + b, 0) / spans.length).toFixed(1)
    : "0";

  const ngeCoverage = nges.length > 0
    ? Math.round((nges.filter(v => v !== null).length / nges.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Historical Analysis</h2>
          <p className="text-sm text-muted-foreground">
            DSA-powered analytics on {data.symbol} — {effectiveN} data points
            {recomputing && (
              <span className="ml-2 inline-flex items-center gap-1 text-primary">
                <RefreshCw className="h-3 w-3 animate-spin" /> Recomputing...
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={lastN}
            onChange={(e) => setLastN(Number(e.target.value))}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"
          >
            <option value={0}>Full Dataset ({data.prices.length})</option>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Max Price" value={`$${maxPrice.toFixed(2)}`} algo="HEAP" detail="Priority queue tracking" />
        <SummaryCard label="Min Price" value={`$${minPrice.toFixed(2)}`} algo="HEAP" detail="Min-heap extraction" />
        <SummaryCard label="Greedy Profit" value={`$${maxProfit.toFixed(2)}`} algo="GREEDY" detail="Single-pass O(n)" />
        <SummaryCard label="Heap Profit" value={`$${heapProfit.profit.toFixed(2)}`} algo="HEAP" detail={`Buy #${heapProfit.buyIndex} → Sell #${heapProfit.sellIndex}`} />
        <SummaryCard label="Avg Span" value={`${avgSpan} hours`} algo="STACK" detail="Monotonic stack" />
      </div>

      {/* Heap Profit Detail */}
      {heapProfit.profit > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Heap-Based Best Trade (Min-Heap tracks cheapest buy)
          </h3>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Buy at: </span>
              <span className="font-mono font-bold text-profit">
                ${prices[heapProfit.buyIndex]?.toFixed(2) ?? "—"}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">
                ({timestamps[heapProfit.buyIndex] ?? "—"})
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Sell at: </span>
              <span className="font-mono font-bold text-loss">
                ${prices[heapProfit.sellIndex]?.toFixed(2) ?? "—"}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">
                ({timestamps[heapProfit.sellIndex] ?? "—"})
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Profit: </span>
              <span className="font-mono font-bold text-primary">${heapProfit.profit.toFixed(2)}</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Algorithm: For each day, the min-heap provides the lowest price seen so far in O(log n). 
            Profit = current price − heap.top(). Total: O(n log n) time, O(n) space.
          </p>
        </div>
      )}

      {/* Data Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <ArrowUpDown className="mr-1 inline h-4 w-4" />
            Full Analytics Table
          </h3>
          <span className="text-xs text-muted-foreground">{prices.length} entries</span>
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 font-medium">Span (Hourly)</th>
                <th className="px-4 py-2 font-medium">Next Greater Price</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((price, i) => (
                <tr
                  key={i}
                  className={`border-b border-border/50 hover:bg-surface-hover transition-colors ${
                    i === heapProfit.buyIndex ? "bg-profit/5" : i === heapProfit.sellIndex ? "bg-loss/5" : ""
                  }`}
                >
                  <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2 text-muted-foreground">{timestamps[i]}</td>
                  <td className="px-4 py-2 font-mono font-medium text-foreground">
                    ${price.toFixed(2)}
                    {i === heapProfit.buyIndex && <span className="ml-1 text-[10px] text-profit font-bold">BUY</span>}
                    {i === heapProfit.sellIndex && <span className="ml-1 text-[10px] text-loss font-bold">SELL</span>}
                  </td>
                  <td className="px-4 py-2 font-mono text-primary">
                    {spans[i] !== undefined ? `${spans[i]}` : "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">
                    {nges[i] != null ? `$${(nges[i] as number).toFixed(2)}` : "None"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NGE Coverage */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          NGE Coverage (Stack-Based)
        </h3>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-surface overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${ngeCoverage}%` }} />
          </div>
          <span className="text-sm font-mono font-bold text-foreground">{ngeCoverage}%</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {nges.filter(v => v !== null).length} of {nges.length} prices have a next greater element (monotonic stack, O(n))
        </p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, algo, detail }: { label: string; value: string; algo: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{algo}</span>
      </div>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
      {detail && <p className="text-[10px] text-muted-foreground">{detail}</p>}
    </div>
  );
}
