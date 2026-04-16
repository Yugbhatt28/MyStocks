import { useState } from "react";
import { FlaskConical, Play, CheckCircle2, XCircle } from "lucide-react";
import { computeDSAAnalytics } from "@/lib/wasm/dsa/dsaWasm";

interface TestCase {
  name: string;
  input: number[];
  expected: {
    stockSpan: number[];
    maxProfit: number;
    nge: (number | null)[];
    maxPrice: number;
    minPrice: number;
  };
}

const TEST_CASES: TestCase[] = [
  {
    name: "Basic Ascending",
    input: [100, 110, 120, 130, 140],
    expected: {
      stockSpan: [1, 2, 3, 4, 5],
      maxProfit: 40,
      nge: [110, 120, 130, 140, null],
      maxPrice: 140,
      minPrice: 100,
    },
  },
  {
    name: "Basic Descending",
    input: [150, 140, 130, 120, 110],
    expected: {
      stockSpan: [1, 1, 1, 1, 1],
      maxProfit: 0,
      nge: [null, null, null, null, null],
      maxPrice: 150,
      minPrice: 110,
    },
  },
  {
    name: "V-Shape Recovery",
    input: [100, 80, 60, 80, 100, 120],
    expected: {
      stockSpan: [1, 1, 1, 2, 3, 6],
      maxProfit: 60,
      nge: [120, 100, 80, 100, 120, null],
      maxPrice: 120,
      minPrice: 60,
    },
  },
  {
    name: "Flat Market",
    input: [50, 50, 50, 50],
    expected: {
      stockSpan: [1, 2, 3, 4],
      maxProfit: 0,
      nge: [null, null, null, null],
      maxPrice: 50,
      minPrice: 50,
    },
  },
  {
    name: "Single Peak",
    input: [10, 20, 30, 20, 10],
    expected: {
      stockSpan: [1, 2, 3, 1, 1],
      maxProfit: 20,
      nge: [20, 30, null, null, null],
      maxPrice: 30,
      minPrice: 10,
    },
  },
  {
    name: "Real-world Pattern",
    input: [175.5, 178.2, 172.1, 180.5, 176.3, 185.0, 182.7],
    expected: {
      stockSpan: [1, 2, 1, 4, 1, 6, 1],
      maxProfit: 12.9,
      nge: [178.2, 180.5, 180.5, 185.0, 185.0, null, null],
      maxPrice: 185.0,
      minPrice: 172.1,
    },
  },
];

interface TestResult {
  name: string;
  passed: boolean;
  details: {
    metric: string;
    expected: string;
    actual: string;
    match: boolean;
  }[];
}

export function TestCases() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    const newResults: TestResult[] = [];

    for (const tc of TEST_CASES) {
      const analytics = await computeDSAAnalytics(tc.input);
      const details: TestResult["details"] = [];

      // Stock Span
      const spanMatch = JSON.stringify(analytics.stockSpan) === JSON.stringify(tc.expected.stockSpan);
      details.push({
        metric: "Stock Span",
        expected: JSON.stringify(tc.expected.stockSpan),
        actual: JSON.stringify(analytics.stockSpan),
        match: spanMatch,
      });

      // Max Profit (allow small floating point tolerance)
      const profitMatch = Math.abs(analytics.maxProfit - tc.expected.maxProfit) < 0.1;
      details.push({
        metric: "Max Profit",
        expected: tc.expected.maxProfit.toFixed(2),
        actual: analytics.maxProfit.toFixed(2),
        match: profitMatch,
      });

      // NGE
      const ngeMatch = JSON.stringify(analytics.nextGreaterElement) === JSON.stringify(tc.expected.nge);
      details.push({
        metric: "Next Greater Element",
        expected: JSON.stringify(tc.expected.nge),
        actual: JSON.stringify(analytics.nextGreaterElement),
        match: ngeMatch,
      });

      // Max Price
      const maxMatch = Math.abs(analytics.maxPrice - tc.expected.maxPrice) < 0.1;
      details.push({
        metric: "Max Price (Heap)",
        expected: tc.expected.maxPrice.toFixed(2),
        actual: analytics.maxPrice.toFixed(2),
        match: maxMatch,
      });

      // Min Price
      const minMatch = Math.abs(analytics.minPrice - tc.expected.minPrice) < 0.1;
      details.push({
        metric: "Min Price (Heap)",
        expected: tc.expected.minPrice.toFixed(2),
        actual: analytics.minPrice.toFixed(2),
        match: minMatch,
      });

      newResults.push({
        name: tc.name,
        passed: details.every((d) => d.match),
        details,
      });
    }

    setResults(newResults);
    setRunning(false);
  };

  const passCount = results.filter((r) => r.passed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            DSA Test Cases
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Verify correctness of all DSA algorithms with predefined inputs
          </p>
        </div>
        <button
          onClick={runTests}
          disabled={running}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Play className="h-4 w-4" />
          {running ? "Running..." : "Run All Tests"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground">
              Results: {passCount}/{results.length} passed
            </span>
            <div className="h-2 flex-1 rounded-full bg-surface overflow-hidden">
              <div
                className="h-full rounded-full bg-profit transition-all"
                style={{ width: `${(passCount / results.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Test case inputs (always visible) */}
      <div className="grid gap-3">
        {TEST_CASES.map((tc, idx) => {
          const result = results[idx];
          return (
            <div key={tc.name} className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {result ? (
                    result.passed ? (
                      <CheckCircle2 className="h-5 w-5 text-profit" />
                    ) : (
                      <XCircle className="h-5 w-5 text-loss" />
                    )
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-border" />
                  )}
                  <div>
                    <p className="font-semibold text-foreground text-sm">{tc.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      Input: [{tc.input.join(", ")}]
                    </p>
                  </div>
                </div>
              </div>

              {result && (
                <div className="border-t border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-surface">
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Metric</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Expected</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Actual</th>
                        <th className="px-4 py-2 text-center font-medium text-muted-foreground">Pass</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.details.map((d) => (
                        <tr key={d.metric} className="border-b border-border/50">
                          <td className="px-4 py-2 font-medium text-foreground">{d.metric}</td>
                          <td className="px-4 py-2 font-mono text-muted-foreground max-w-[200px] truncate">{d.expected}</td>
                          <td className="px-4 py-2 font-mono text-muted-foreground max-w-[200px] truncate">{d.actual}</td>
                          <td className="px-4 py-2 text-center">
                            {d.match ? (
                              <CheckCircle2 className="inline h-4 w-4 text-profit" />
                            ) : (
                              <XCircle className="inline h-4 w-4 text-loss" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
