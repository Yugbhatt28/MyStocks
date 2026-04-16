import { BookOpen, Clock, Lightbulb } from "lucide-react";
import { useState } from "react";

interface AlgoInfo {
  name: string;
  category: string;
  description: string;
  timeComplexity: string;
  spaceComplexity: string;
  whyUsed: string;
  pseudocode: string;
}

const ALGORITHMS: AlgoInfo[] = [
  {
    name: "Stock Span (Monotonic Stack)",
    category: "Stack",
    description:
      "For each day, the stock span is the number of consecutive previous days (including today) where the stock price was less than or equal to today's price. Uses a monotonic decreasing stack to efficiently track spans.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    whyUsed:
      "Identifies how long a price has been dominant. High span = sustained uptrend. Used by traders to gauge momentum.",
    pseudocode: `stack = []
for i = 0 to n-1:
  while stack not empty AND price[stack.top()] <= price[i]:
    stack.pop()
  span[i] = (stack empty) ? i+1 : i - stack.top()
  stack.push(i)`,
  },
  {
    name: "Next Greater Element (Monotonic Stack)",
    category: "Stack",
    description:
      "For each price, find the first price to its right that is strictly greater. Uses a stack traversing right-to-left to maintain candidates.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    whyUsed:
      "Helps identify when a stock will recover or exceed current price. Useful for setting price targets and stop-loss levels.",
    pseudocode: `stack = []
for i = n-1 down to 0:
  while stack not empty AND price[stack.top()] <= price[i]:
    stack.pop()
  nge[i] = (stack empty) ? -1 : price[stack.top()]
  stack.push(i)`,
  },
  {
    name: "Max Profit (Greedy)",
    category: "Greedy",
    description:
      "Find the maximum profit from a single buy-sell transaction. Track the minimum price seen so far and compute potential profit at each step.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    whyUsed:
      "Classic interview problem. Determines the best possible single trade. Greedy approach ensures optimal solution in one pass.",
    pseudocode: `minPrice = prices[0], maxProfit = 0
for i = 1 to n-1:
  maxProfit = max(maxProfit, prices[i] - minPrice)
  minPrice = min(minPrice, prices[i])
return maxProfit`,
  },
  {
    name: "Heap-Based Min/Max Tracking",
    category: "Heap",
    description:
      "Uses a min-heap and max-heap (priority queues) to efficiently track the minimum and maximum stock prices as new data arrives. The heap maintains order with O(log n) insertions.",
    timeComplexity: "O(n log n) build, O(1) query",
    spaceComplexity: "O(n)",
    whyUsed:
      "Priority queues allow streaming min/max tracking. As live prices arrive, the heap maintains sorted order without re-sorting the entire dataset.",
    pseudocode: `maxHeap = new MaxHeap()
minHeap = new MinHeap()
for each price in prices:
  maxHeap.push(price)
  minHeap.push(price)
maxPrice = maxHeap.top()
minPrice = minHeap.top()`,
  },
  {
    name: "Heap-Based Best Trade",
    category: "Heap",
    description:
      "Uses a min-heap to track the cheapest buying opportunity seen so far. For each selling day, the heap's top gives the optimal buy price, maximizing profit.",
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(n)",
    whyUsed:
      "More powerful than greedy for scenarios with constraints (e.g., cooldown periods, multiple transactions). Demonstrates heap utility in trading strategies.",
    pseudocode: `minHeap = new MinHeap()
minHeap.push(0) // index 0
for i = 1 to n-1:
  buyIdx = minHeap.top()
  profit = prices[i] - prices[buyIdx]
  if profit > maxProfit:
    update bestBuy, bestSell
  minHeap.push(i)`,
  },
  {
    name: "Merge Sort (Stable Sort)",
    category: "Sorting",
    description:
      "Divide-and-conquer algorithm that splits the array in half, recursively sorts each half, then merges them. Stable sort preserves relative order of equal elements.",
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(n)",
    whyUsed:
      "Used to sort historical prices for percentile analysis, median calculation, and identifying top gainers/losers. Stability ensures consistent ordering.",
    pseudocode: `mergeSort(arr):
  if len(arr) <= 1: return arr
  mid = len(arr) / 2
  left = mergeSort(arr[0..mid])
  right = mergeSort(arr[mid..n])
  return merge(left, right)`,
  },
  {
    name: "Quick Sort",
    category: "Sorting",
    description:
      "Partition-based divide-and-conquer. Picks a pivot, partitions elements around it, then recursively sorts sub-arrays. Average O(n log n), worst O(n²).",
    timeComplexity: "O(n log n) average",
    spaceComplexity: "O(log n) stack",
    whyUsed:
      "Fastest in practice for large datasets due to cache efficiency. Used to rank stocks by daily change for top gainers/losers analysis.",
    pseudocode: `quickSort(arr, lo, hi):
  if lo >= hi: return
  pivot = partition(arr, lo, hi)
  quickSort(arr, lo, pivot-1)
  quickSort(arr, pivot+1, hi)`,
  },
  {
    name: "Sliding Window (Deque)",
    category: "Deque",
    description:
      "Uses a double-ended queue to maintain the maximum and minimum over a sliding window of size k. Elements outside the window are removed from the front.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(k)",
    whyUsed:
      "Efficient rolling analytics without recomputing from scratch. Used for moving averages, rolling max/min over configurable time windows.",
    pseudocode: `maxDeque = [], minDeque = []
for i in window:
  while maxDeque not empty AND arr[maxDeque.back] <= arr[i]:
    maxDeque.pop_back()
  maxDeque.push_back(i)
  // similar for minDeque
windowMax = arr[maxDeque.front]`,
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Stack: "bg-chart-1/20 text-chart-1",
  Greedy: "bg-chart-2/20 text-chart-2",
  Heap: "bg-chart-3/20 text-chart-3",
  Sorting: "bg-chart-4/20 text-chart-4",
  Deque: "bg-chart-5/20 text-chart-5",
};

export function AlgorithmExplanation() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Algorithm Explanations
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Detailed breakdown of every DSA algorithm used in this project
        </p>
      </div>

      <div className="grid gap-3">
        {ALGORITHMS.map((algo) => {
          const isOpen = expanded === algo.name;
          return (
            <div key={algo.name} className="rounded-lg border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : algo.name)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${CATEGORY_COLORS[algo.category] || "bg-muted text-muted-foreground"}`}>
                    {algo.category.toUpperCase()}
                  </span>
                  <span className="font-semibold text-foreground">{algo.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {algo.timeComplexity}
                  </span>
                  <span className="text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border p-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">What It Does</h4>
                    <p className="text-sm text-foreground">{algo.description}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md bg-surface p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold text-muted-foreground">Time Complexity</span>
                      </div>
                      <p className="text-sm font-mono font-bold text-foreground">{algo.timeComplexity}</p>
                    </div>
                    <div className="rounded-md bg-surface p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-muted-foreground">Space Complexity</span>
                      </div>
                      <p className="text-sm font-mono font-bold text-foreground">{algo.spaceComplexity}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Lightbulb className="h-3.5 w-3.5 text-chart-4" /> Why It's Used
                    </h4>
                    <p className="text-sm text-foreground">{algo.whyUsed}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pseudocode</h4>
                    <pre className="rounded-md bg-surface p-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre">
                      {algo.pseudocode}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
