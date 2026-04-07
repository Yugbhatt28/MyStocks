import { useState, useEffect, useMemo } from "react";
import { Play, Loader2, Target } from "lucide-react";
import type { StockData } from "@/lib/stockData";
import { wasmSimulateStrategy, type StrategyResult } from "@/lib/wasm/dsa/dsaWasm";
import { StockChart } from "./StockChart";

interface StrategySimulatorProps {
  data: StockData | null;
}

export function StrategySimulator({ data }: StrategySimulatorProps) {
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [simulated, setSimulated] = useState(false);

  // Reset when data changes
  useEffect(() => {
    setResult(null);
    setSimulated(false);
  }, [data?.symbol, data?.prices.length]);

  const simulate = async () => {
    if (!data || data.prices.length < 2) return;
    setLoading(true);
    try {
      const res = await wasmSimulateStrategy(data.prices);
      setResult(res);
      setSimulated(true);
    } finally {
      setLoading(false);
    }
  };

  if (!data || data.prices.length < 2) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Strategy Simulator</h3>
          <p className="text-[10px] text-muted-foreground">Best buy/sell via C++ Greedy algorithm</p>
        </div>
        <button
          onClick={simulate}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Simulate Strategy
        </button>
      </div>

      {simulated && result && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-border bg-surface p-2.5">
              <p className="text-[10px] text-muted-foreground">Buy Price</p>
              <p className="text-sm font-bold text-profit">${data.prices[result.buyIndex]?.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">Index {result.buyIndex}</p>
            </div>
            <div className="rounded-md border border-border bg-surface p-2.5">
              <p className="text-[10px] text-muted-foreground">Sell Price</p>
              <p className="text-sm font-bold text-loss">${data.prices[result.sellIndex]?.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">Index {result.sellIndex}</p>
            </div>
            <div className="rounded-md border border-border bg-surface p-2.5">
              <p className="text-[10px] text-muted-foreground">Max Profit</p>
              <p className="text-sm font-bold text-primary">${result.profit.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">GREEDY</p>
            </div>
          </div>

          <StrategyChart
            prices={data.prices}
            timestamps={data.timestamps}
            buyIndex={result.buyIndex}
            sellIndex={result.sellIndex}
          />
        </div>
      )}
    </div>
  );
}

function StrategyChart({
  prices,
  timestamps,
  buyIndex,
  sellIndex,
}: {
  prices: number[];
  timestamps: string[];
  buyIndex: number;
  sellIndex: number;
}) {
  // Create point colors: green for buy, red for sell
  const pointBg = prices.map((_, i) =>
    i === buyIndex ? "#22c55e" : i === sellIndex ? "#ef4444" : "transparent"
  );
  const pointRadius = prices.map((_, i) =>
    i === buyIndex || i === sellIndex ? 6 : 0
  );

  return (
    <div className="rounded-md border border-border bg-surface p-2">
      <p className="mb-1 text-[10px] text-muted-foreground">
        <span className="inline-block h-2 w-2 rounded-full bg-profit mr-1" /> Buy
        <span className="ml-3 inline-block h-2 w-2 rounded-full bg-loss mr-1" /> Sell
      </p>
      <StockChart
        prices={prices}
        timestamps={timestamps}
        label="Strategy"
        height={200}
        buyIndex={buyIndex}
        sellIndex={sellIndex}
      />
    </div>
  );
}
