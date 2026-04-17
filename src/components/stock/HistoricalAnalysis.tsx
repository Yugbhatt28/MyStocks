import { useState, useEffect, useCallback } from "react";
import { Database, ArrowUpDown, Filter, RefreshCw, AlertTriangle, Download, Loader2 } from "lucide-react";
import type { StockData, DSAAnalytics } from "@/lib/stockData";
import { computeDSAAnalytics, hasSufficientHistory, MIN_HISTORY, INSUFFICIENT_DATA_MESSAGE } from "@/lib/wasm/dsa/dsaWasm";
import { fetchStockCandles } from "@/lib/finnhub.functions";
import { toast } from "sonner";

interface HistoricalAnalysisProps {
  data: StockData | null;
}

// Historical-tab-only buffer (isolated from real-time pipeline)
interface HistoricalBuffer {
  symbol: string;
  prices: number[];
  timestamps: string[];
  fetchedAt: number;
}

const HISTORICAL_DAYS = 180; // request ~6 months of daily candles to comfortably exceed 30
const isHistoricalMode = true; // local flag — never leaves this module

export function HistoricalAnalysis({ data }: HistoricalAnalysisProps) {
  const [lastN, setLastN] = useState<number>(0); // 0 = full dataset
  const [slicedAnalytics, setSlicedAnalytics] = useState<DSAAnalytics | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  // Isolated historical state — does not touch real-time buffer
  const [historicalBuffer, setHistoricalBuffer] = useState<HistoricalBuffer | null>(null);
  const [fullAnalytics, setFullAnalytics] = useState<DSAAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Isolated historical fetcher — separate from real-time fetch
  const fetchHistoricalData = useCallback(async (symbol: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const now = Math.floor(Date.now() / 1000);
      const from = now - HISTORICAL_DAYS * 24 * 60 * 60;
      const { candle, error } = await fetchStockCandles({
        data: { symbol, resolution: "D", fromTimestamp: from, toTimestamp: now },
      });

      if (error || !candle || candle.prices.length === 0) {
        setFetchError(error || `No historical data available for ${symbol}`);
        setHistoricalBuffer(null);
        setFullAnalytics(null);
        return;
      }

      const buffer: HistoricalBuffer = {
        symbol,
        prices: candle.prices,
        timestamps: candle.timestamps.map((t) =>
          new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
        ),
        fetchedAt: Date.now(),
      };
      setHistoricalBuffer(buffer);

      // Feed the isolated buffer into the existing DSA engine (unchanged signature)
      if (buffer.prices.length >= MIN_HISTORY) {
        const analytics = await computeDSAAnalytics(buffer.prices);
        setFullAnalytics(analytics);
      } else {
        setFullAnalytics(null);
      }
      toast.success(`Loaded ${buffer.prices.length} historical days for ${symbol}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchError(`Failed to fetch historical data: ${msg}`);
      setHistoricalBuffer(null);
      setFullAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch when symbol changes (or invalidate stale buffer)
  useEffect(() => {
    if (!data?.symbol) return;
    if (historicalBuffer?.symbol === data.symbol) return;
    fetchHistoricalData(data.symbol);
  }, [data?.symbol, historicalBuffer?.symbol, fetchHistoricalData]);

  // Recompute analytics when slicing the historical buffer
  useEffect(() => {
    if (!historicalBuffer || historicalBuffer.prices.length < MIN_HISTORY || !fullAnalytics) {
      setSlicedAnalytics(null);
      return;
    }
    const total = historicalBuffer.prices.length;
    const effectiveN = lastN > 0 ? Math.min(lastN, total) : total;
    const startIdx = total - effectiveN;

    if (startIdx === 0) {
      setSlicedAnalytics(fullAnalytics);
      return;
    }

    setRecomputing(true);
    computeDSAAnalytics(historicalBuffer.prices.slice(startIdx)).then((analytics) => {
      setSlicedAnalytics(analytics);
      setRecomputing(false);
    });
  }, [historicalBuffer, fullAnalytics, lastN]);

  // No symbol selected yet
  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Database className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">No stock selected</p>
          <p className="mt-1 text-sm">Search for a stock first from the Dashboard</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
          <p className="text-lg font-medium text-foreground">Fetching historical data for {data.symbol}…</p>
          <p className="mt-1 text-sm text-muted-foreground">Requesting up to {HISTORICAL_DAYS} days of daily candles</p>
        </div>
      </div>
    );
  }

  // Fetch error
  if (fetchError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-loss" />
          <p className="text-lg font-semibold text-foreground">Historical fetch failed</p>
          <p className="mt-2 text-sm text-muted-foreground">{fetchError}</p>
          <button
            onClick={() => fetchHistoricalData(data.symbol)}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  // Insufficient data guard (uses isolated historical buffer, not real-time data)
  if (!historicalBuffer || !hasSufficientHistory(historicalBuffer.prices)) {
    const count = historicalBuffer?.prices.length ?? 0;
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-chart-4" />
          <p className="text-lg font-semibold text-foreground">{INSUFFICIENT_DATA_MESSAGE}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.symbol} returned {count} day{count === 1 ? "" : "s"} of historical data.
            Need at least {MIN_HISTORY} to safely run Stock Span, Heap analysis, and trend algorithms.
          </p>
          <button
            onClick={() => fetchHistoricalData(data.symbol)}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Download className="h-4 w-4" /> Reload Historical Data
          </button>
        </div>
      </div>
    );
  }

  const total = historicalBuffer.prices.length;
  const effectiveN = lastN > 0 ? Math.min(lastN, total) : total;
  const startIdx = total - effectiveN;
  const prices = historicalBuffer.prices.slice(startIdx);
  const timestamps = historicalBuffer.timestamps.slice(startIdx);

  const analytics = slicedAnalytics || fullAnalytics!;
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Historical Analysis</h2>
          <p className="text-sm text-muted-foreground">
            DSA-powered analytics on {data.symbol} — {effectiveN} of {total} historical days
            {recomputing && (
              <span className="ml-2 inline-flex items-center gap-1 text-primary">
                <RefreshCw className="h-3 w-3 animate-spin" /> Recomputing...
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchHistoricalData(data.symbol)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-surface-hover"
            title="Reload historical data"
          >
            <Download className="h-3.5 w-3.5" /> Reload
          </button>
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={lastN}
            onChange={(e) => setLastN(Number(e.target.value))}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"
          >
            <option value={0}>Full Dataset ({total})</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
            <option value={120}>Last 120 days</option>
            <option value={180}>Last 180 days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Max Price" value={`$${maxPrice.toFixed(2)}`} algo="HEAP" detail="Priority queue tracking" />
        <SummaryCard label="Min Price" value={`$${minPrice.toFixed(2)}`} algo="HEAP" detail="Min-heap extraction" />
        <SummaryCard label="Greedy Profit" value={`$${maxProfit.toFixed(2)}`} algo="GREEDY" detail="Single-pass O(n)" />
        <SummaryCard label="Heap Profit" value={`$${heapProfit.profit.toFixed(2)}`} algo="HEAP" detail={`Buy #${heapProfit.buyIndex} → Sell #${heapProfit.sellIndex}`} />
        <SummaryCard label="Avg Span" value={`${avgSpan} days`} algo="STACK" detail="Monotonic stack" />
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
            Full Analytics Table {isHistoricalMode && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">HISTORICAL</span>}
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
                <th className="px-4 py-2 font-medium">Span (Days)</th>
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
