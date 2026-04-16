import { useState, useMemo } from "react";
import { Database, ArrowUpDown, Filter } from "lucide-react";
import type { StockData } from "@/lib/stockData";

interface HistoricalAnalysisProps {
  data: StockData | null;
}

export function HistoricalAnalysis({ data }: HistoricalAnalysisProps) {
  const [lastN, setLastN] = useState<number>(0); // 0 = full dataset

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

  const effectiveN = lastN > 0 ? Math.min(lastN, data.prices.length) : data.prices.length;
  const startIdx = data.prices.length - effectiveN;

  // Slice analytics to match the selected window
  const prices = data.prices.slice(startIdx);
  const timestamps = data.timestamps.slice(startIdx);
  const spans = data.dsaAnalytics.stockSpan.slice(startIdx);
  const nges = data.dsaAnalytics.nextGreaterElement.slice(startIdx);

  const { maxPrice, minPrice, maxProfit, heapProfit } = data.dsaAnalytics;

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
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={lastN}
            onChange={(e) => setLastN(Number(e.target.value))}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"
          >
            <option value={0}>Full Dataset</option>
            <option value={10}>Last 10</option>
            <option value={20}>Last 20</option>
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Max Price" value={`$${maxPrice.toFixed(2)}`} algo="HEAP" />
        <SummaryCard label="Min Price" value={`$${minPrice.toFixed(2)}`} algo="HEAP" />
        <SummaryCard label="Greedy Profit" value={`$${maxProfit.toFixed(2)}`} algo="GREEDY" />
        <SummaryCard label="Heap Profit" value={`$${heapProfit.profit.toFixed(2)}`} algo="HEAP" detail={`Buy #${heapProfit.buyIndex} → Sell #${heapProfit.sellIndex}`} />
        <SummaryCard label="Avg Span" value={`${avgSpan} days`} algo="STACK" />
      </div>

      {/* Heap Profit Detail */}
      {heapProfit.profit > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Heap-Based Best Trade
          </h3>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Buy at: </span>
              <span className="font-mono font-bold text-profit">
                ${prices[heapProfit.buyIndex - startIdx]?.toFixed(2) ?? "—"}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">
                ({timestamps[heapProfit.buyIndex - startIdx] ?? "—"})
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Sell at: </span>
              <span className="font-mono font-bold text-loss">
                ${prices[heapProfit.sellIndex - startIdx]?.toFixed(2) ?? "—"}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">
                ({timestamps[heapProfit.sellIndex - startIdx] ?? "—"})
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Profit: </span>
              <span className="font-mono font-bold text-primary">${heapProfit.profit.toFixed(2)}</span>
            </div>
          </div>
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
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 font-medium">Span (days)</th>
                <th className="px-4 py-2 font-medium">Next Greater Price</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((price, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-2 text-muted-foreground">{startIdx + i + 1}</td>
                  <td className="px-4 py-2 text-muted-foreground">{timestamps[i]}</td>
                  <td className="px-4 py-2 font-mono font-medium text-foreground">${price.toFixed(2)}</td>
                  <td className="px-4 py-2 font-mono text-primary">
                    {spans[i] !== undefined ? `${spans[i]} days` : "—"}
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
          NGE Coverage
        </h3>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-surface overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${ngeCoverage}%` }} />
          </div>
          <span className="text-sm font-mono font-bold text-foreground">{ngeCoverage}%</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {nges.filter(v => v !== null).length} of {nges.length} prices have a next greater element
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
