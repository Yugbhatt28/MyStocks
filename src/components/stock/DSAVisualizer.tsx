import { useState } from "react";
import { Eye, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

interface DSAVisualizerProps {
  stockSpan: number[];
  nextGreaterElement: (number | null)[];
  prices: number[];
}

export function DSAVisualizer({ stockSpan, nextGreaterElement, prices }: DSAVisualizerProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeAlgo, setActiveAlgo] = useState<"span" | "nge">("span");

  if (prices.length < 2) return null;

  // Show last 10 items for visualization
  const displayCount = Math.min(10, prices.length);
  const startIdx = prices.length - displayCount;
  const displayPrices = prices.slice(startIdx);
  const displaySpan = stockSpan.slice(startIdx);
  const displayNge = nextGreaterElement.slice(startIdx);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">DSA Visualization</h3>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveAlgo("span")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeAlgo === "span" ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"
              }`}
            >
              Stock Span (Stack)
            </button>
            <button
              onClick={() => setActiveAlgo("nge")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeAlgo === "nge" ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"
              }`}
            >
              Next Greater (Stack)
            </button>
          </div>

          {activeAlgo === "span" && (
            <div>
              <p className="mb-2 text-[10px] text-muted-foreground">
                For each day, count consecutive preceding days/hours with price ≤ today's price. Uses a monotonic stack for O(n) computation.
              </p>
              <div className="grid gap-1">
                {displayPrices.map((price, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-mono text-muted-foreground">${price.toFixed(2)}</span>
                    <div
                      className="h-4 rounded-sm bg-primary/60"
                      style={{ width: `${Math.max(8, (displaySpan[i] / displayCount) * 100)}%` }}
                    />
                    <span className="font-mono font-semibold text-primary">{displaySpan[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeAlgo === "nge" && (
            <div>
              <p className="mb-2 text-[10px] text-muted-foreground">
                For each price, find the next strictly greater price. Uses a reverse-traversal monotonic stack for O(n) computation.
              </p>
              <div className="grid gap-1">
                {displayPrices.map((price, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-mono text-muted-foreground">${price.toFixed(2)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono font-semibold text-chart-5">
                      {displayNge[i] != null ? `$${displayNge[i]!.toFixed(2)}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
