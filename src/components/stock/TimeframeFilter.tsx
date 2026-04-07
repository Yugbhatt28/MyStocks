import { useState, useMemo } from "react";
import type { StockData } from "@/lib/stockData";

interface TimeframeFilterProps {
  data: StockData | null;
  onFilteredData: (prices: number[], timestamps: string[]) => void;
}

type Timeframe = "all" | "5" | "10" | "20" | "50";

export function TimeframeFilter({ data, onFilteredData }: TimeframeFilterProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("all");

  const handleChange = (tf: Timeframe) => {
    setTimeframe(tf);
    if (!data) return;
    const count = tf === "all" ? data.prices.length : Number(tf);
    const prices = data.prices.slice(-count);
    const timestamps = data.timestamps.slice(-count);
    onFilteredData(prices, timestamps);
  };

  if (!data) return null;

  const options: { value: Timeframe; label: string }[] = [
    { value: "all", label: "All" },
    { value: "50", label: "50" },
    { value: "20", label: "20" },
    { value: "10", label: "10" },
    { value: "5", label: "5" },
  ];

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground mr-1">Points:</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleChange(opt.value)}
          disabled={data.prices.length < (opt.value === "all" ? 0 : Number(opt.value))}
          className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
            timeframe === opt.value
              ? "bg-primary text-primary-foreground"
              : "bg-surface text-muted-foreground hover:text-foreground"
          } disabled:opacity-30`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
