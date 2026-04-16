import { ArrowUpDown, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import type { StockData } from "@/lib/stockData";
import { computeSortedAnalytics, type SortedAnalytics } from "@/lib/sorting";
import { useMemo, useState } from "react";

interface SortingAnalysisProps {
  data: StockData | null;
}

export function SortingAnalysis({ data }: SortingAnalysisProps) {
  const [sortAlgo, setSortAlgo] = useState<"merge" | "quick">("merge");

  const analytics: SortedAnalytics | null = useMemo(() => {
    if (!data || data.prices.length < 2) return null;
    return computeSortedAnalytics(data.prices, data.timestamps);
  }, [data?.prices, data?.timestamps]);

  if (!data || !analytics) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <ArrowUpDown className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">No data for Sorting Analysis</p>
          <p className="mt-1 text-sm">Search for a stock first from the Dashboard</p>
        </div>
      </div>
    );
  }

  const sorted = sortAlgo === "merge" ? analytics.sortedAsc : analytics.sortedDesc;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Sorting Analysis</h2>
          <p className="text-sm text-muted-foreground">
            {data.symbol} — {data.prices.length} data points sorted using DSA algorithms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortAlgo("merge")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              sortAlgo === "merge" ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            Merge Sort
          </button>
          <button
            onClick={() => setSortAlgo("quick")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              sortAlgo === "quick" ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            Quick Sort
          </button>
        </div>
      </div>

      {/* Percentile Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">25th Percentile (P25)</p>
          <p className="mt-1 text-lg font-bold text-foreground">${analytics.p25.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Lower quartile — 25% of prices below</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Median (P50)</p>
          <p className="mt-1 text-lg font-bold text-primary">${analytics.median.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Middle value of sorted prices</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">75th Percentile (P75)</p>
          <p className="mt-1 text-lg font-bold text-foreground">${analytics.p75.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Upper quartile — 75% of prices below</p>
        </div>
      </div>

      {/* Top Gainers & Losers */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-profit" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Top Gainers (Sorted by Quick Sort)
            </h3>
          </div>
          <div className="divide-y divide-border/50">
            {analytics.topGainers.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No gainers in this dataset</p>
            ) : (
              analytics.topGainers.map((g, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-xs text-muted-foreground">{g.from.timestamp} → {g.to.timestamp}</p>
                    <p className="text-sm font-mono text-foreground">${g.from.price.toFixed(2)} → ${g.to.price.toFixed(2)}</p>
                  </div>
                  <span className="text-sm font-bold text-profit">+{g.change.toFixed(2)}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-loss" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Top Losers (Sorted by Merge Sort)
            </h3>
          </div>
          <div className="divide-y divide-border/50">
            {analytics.topLosers.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No losers in this dataset</p>
            ) : (
              analytics.topLosers.map((l, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-xs text-muted-foreground">{l.from.timestamp} → {l.to.timestamp}</p>
                    <p className="text-sm font-mono text-foreground">${l.from.price.toFixed(2)} → ${l.to.price.toFixed(2)}</p>
                  </div>
                  <span className="text-sm font-bold text-loss">{l.change.toFixed(2)}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sorted Data Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            Sorted Prices ({sortAlgo === "merge" ? "Merge Sort — Ascending" : "Quick Sort — Descending"})
          </h3>
          <span className="text-xs text-muted-foreground">{sorted.length} entries</span>
        </div>
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Rank</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 font-medium">Original Date</th>
                <th className="px-4 py-2 font-medium">Original Index</th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 50).map((entry, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2 font-mono font-medium text-foreground">${entry.price.toFixed(2)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{entry.timestamp}</td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">{entry.originalIndex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sorted.length > 50 && (
          <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
            Showing top 50 of {sorted.length} entries
          </div>
        )}
      </div>
    </div>
  );
}
