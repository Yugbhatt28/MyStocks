import { useState, useEffect, useRef } from "react";
import { Clock, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Zap, RotateCw } from "lucide-react";
import type { TimelineEvent } from "@/lib/stockData";
import type { StockData } from "@/lib/stockData";

interface EventTimelineProps {
  data: StockData | null;
  previousData: StockData | null;
}

export function EventTimeline({ data, previousData }: EventTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const prevMaxRef = useRef<number>(0);
  const prevMinRef = useRef<number>(Infinity);

  useEffect(() => {
    if (!data || !previousData || data.prices.length < 2) return;

    const newEvents: TimelineEvent[] = [];
    const now = Date.now();
    const currentPrice = data.currentPrice;
    const prevPrice = previousData.currentPrice;
    const pctChange = ((currentPrice - prevPrice) / prevPrice) * 100;

    // Price spike/drop detection
    if (pctChange > 2) {
      newEvents.push({
        id: crypto.randomUUID(),
        type: "spike",
        message: `Price surged ${pctChange.toFixed(1)}% to $${currentPrice.toFixed(2)}`,
        timestamp: now,
      });
    } else if (pctChange < -2) {
      newEvents.push({
        id: crypto.randomUUID(),
        type: "drop",
        message: `Price dropped ${Math.abs(pctChange).toFixed(1)}% to $${currentPrice.toFixed(2)}`,
        timestamp: now,
      });
    }

    // New max/min from DSA results
    if (data.dsaAnalytics.maxPrice > prevMaxRef.current && prevMaxRef.current > 0) {
      newEvents.push({
        id: crypto.randomUUID(),
        type: "new_max",
        message: `New session high: $${data.dsaAnalytics.maxPrice.toFixed(2)}`,
        timestamp: now,
      });
    }
    if (data.dsaAnalytics.minPrice < prevMinRef.current && prevMinRef.current < Infinity) {
      newEvents.push({
        id: crypto.randomUUID(),
        type: "new_min",
        message: `New session low: $${data.dsaAnalytics.minPrice.toFixed(2)}`,
        timestamp: now,
      });
    }

    prevMaxRef.current = data.dsaAnalytics.maxPrice;
    prevMinRef.current = data.dsaAnalytics.minPrice;

    // Trend reversal: check last 5 prices
    if (data.prices.length >= 5) {
      const last5 = data.prices.slice(-5);
      const prev3Up = last5[1] > last5[0] && last5[2] > last5[1];
      const next2Down = last5[3] < last5[2] && last5[4] < last5[3];
      const prev3Down = last5[1] < last5[0] && last5[2] < last5[1];
      const next2Up = last5[3] > last5[2] && last5[4] > last5[3];

      if (prev3Up && next2Down) {
        newEvents.push({
          id: crypto.randomUUID(),
          type: "reversal",
          message: "Bearish reversal detected",
          timestamp: now,
        });
      } else if (prev3Down && next2Up) {
        newEvents.push({
          id: crypto.randomUUID(),
          type: "reversal",
          message: "Bullish reversal detected",
          timestamp: now,
        });
      }
    }

    if (newEvents.length > 0) {
      setEvents((prev) => [...newEvents, ...prev].slice(0, 20));
    }
  }, [data?.currentPrice, data?.prices.length]);

  if (!data) return null;

  const ICON_MAP: Record<TimelineEvent["type"], React.ReactNode> = {
    spike: <TrendingUp className="h-3.5 w-3.5 text-profit" />,
    drop: <TrendingDown className="h-3.5 w-3.5 text-loss" />,
    new_max: <ArrowUp className="h-3.5 w-3.5 text-profit" />,
    new_min: <ArrowDown className="h-3.5 w-3.5 text-loss" />,
    reversal: <RotateCw className="h-3.5 w-3.5 text-chart-4" />,
    volatility_spike: <Zap className="h-3.5 w-3.5 text-chart-5" />,
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Event Timeline</h3>
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Events will appear as price changes are detected during live mode.
        </p>
      ) : (
        <div className="max-h-48 space-y-1.5 overflow-auto">
          {events.map((event) => (
            <div key={event.id} className="flex items-center gap-2 rounded-md border border-border/50 bg-surface px-2.5 py-1.5 text-xs">
              {ICON_MAP[event.type]}
              <span className="flex-1 text-foreground">{event.message}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(event.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
