import { useState, useEffect } from "react";
import { Layers, TrendingUp, TrendingDown, Activity } from "lucide-react";
import type { StockData } from "@/lib/stockData";
import { wasmSlidingWindowAnalysis, type SlidingWindowResult } from "@/lib/wasm/dsa/dsaWasm";

interface SlidingWindowCardsProps {
  data: StockData | null;
}

export function SlidingWindowCards({ data }: SlidingWindowCardsProps) {
  const [result, setResult] = useState<SlidingWindowResult | null>(null);
  const [windowSize, setWindowSize] = useState(10);

  useEffect(() => {
    if (!data || data.prices.length < 2) {
      setResult(null);
      return;
    }
    wasmSlidingWindowAnalysis(data.prices, windowSize).then(setResult);
  }, [data?.prices, windowSize]);

  if (!data || !result) return null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sliding Window Analytics</h3>
          <p className="text-[10px] text-muted-foreground">C++ Deque-based O(n) computation</p>
        </div>
        <select
          value={windowSize}
          onChange={(e) => setWindowSize(Number(e.target.value))}
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
        >
          <option value={5}>Window: 5</option>
          <option value={10}>Window: 10</option>
          <option value={20}>Window: 20</option>
          <option value={50}>Window: 50</option>
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Window Max</p>
            <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">DEQUE</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-profit" />
            <p className="text-lg font-bold text-profit">${result.windowMax.toFixed(2)}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Window Min</p>
            <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">DEQUE</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-loss" />
            <p className="text-lg font-bold text-loss">${result.windowMin.toFixed(2)}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Rolling Avg</p>
            <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">AVG</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <p className="text-lg font-bold text-primary">${result.rollingAvg.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
