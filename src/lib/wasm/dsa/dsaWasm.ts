/**
 * TypeScript wrapper for the C++ WASM DSA engine.
 * Provides: maxProfit, stockSpan, nextGreaterElement, volatility,
 *           simulateStrategy, slidingWindowAnalysis, computeCorrelation.
 *
 * The 3 new functions (strategy, sliding window, correlation) have JS fallbacks
 * that mirror the C++ algorithms exactly, used when the WASM binary hasn't been
 * recompiled with the new exports yet.
 */

import createModule from "./dsa.js";

const MAX_POINTS = 200;

let wasm: any = null;
let loading: Promise<void> | null = null;

async function ensureLoaded() {
  if (wasm) return;
  if (!loading) {
    loading = createModule().then((m: any) => { wasm = m; });
  }
  await loading;
}

/** Copy a JS number[] into WASM heap, returning pointer and clamped length. */
function toHeap(prices: number[]): { ptr: number; len: number } {
  const len = Math.min(prices.length, MAX_POINTS);
  const ptr = wasm._malloc(len * 8);
  for (let i = 0; i < len; i++) {
    wasm.HEAPF64[(ptr >> 3) + i] = prices[i];
  }
  return { ptr, len };
}

/** Read `len` doubles from a WASM buffer pointer. */
function readBuffer(bufPtr: number, len: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < len; i++) {
    out.push(wasm.HEAPF64[(bufPtr >> 3) + i]);
  }
  return out;
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

// ==================== EXISTING FUNCTIONS (UNCHANGED) ====================

export async function wasmMaxProfit(prices: number[]): Promise<number> {
  await ensureLoaded();
  const { ptr, len } = toHeap(prices);
  const result = wasm._calculateMaxProfit(ptr, len);
  wasm._free(ptr);
  return result;
}

export async function wasmStockSpan(prices: number[]): Promise<number[]> {
  await ensureLoaded();
  const { ptr, len } = toHeap(prices);
  wasm._calculateStockSpan(ptr, len);
  wasm._free(ptr);
  return readBuffer(wasm._getSpanBuffer(), len);
}

export async function wasmNextGreaterElement(prices: number[]): Promise<(number | null)[]> {
  await ensureLoaded();
  const { ptr, len } = toHeap(prices);
  wasm._calculateNextGreaterElement(ptr, len);
  wasm._free(ptr);
  return readBuffer(wasm._getNgeBuffer(), len).map(v => v === -1.0 ? null : v);
}

export async function wasmVolatility(prices: number[]): Promise<number> {
  await ensureLoaded();
  const { ptr, len } = toHeap(prices);
  const result = wasm._calculateVolatility(ptr, len);
  wasm._free(ptr);
  return result;
}

// ==================== NEW: STRATEGY SIMULATOR ====================

export interface StrategyResult {
  buyIndex: number;
  sellIndex: number;
  profit: number;
}

/** JS fallback that mirrors the C++ simulateStrategy exactly. */
function jsSimulateStrategy(prices: number[]): StrategyResult {
  if (prices.length < 2) return { buyIndex: 0, sellIndex: 0, profit: 0 };

  let bestBuy = 0;
  let minIdx = 0;
  let sellIdx = 0;
  let maxProfit = 0;

  for (let i = 1; i < prices.length; i++) {
    const profit = prices[i] - prices[minIdx];
    if (profit > maxProfit) {
      maxProfit = profit;
      bestBuy = minIdx;
      sellIdx = i;
    }
    if (prices[i] < prices[minIdx]) {
      minIdx = i;
    }
  }

  return { buyIndex: bestBuy, sellIndex: sellIdx, profit: roundCents(maxProfit) };
}

export async function wasmSimulateStrategy(prices: number[]): Promise<StrategyResult> {
  await ensureLoaded();

  // Use WASM if the new export exists, otherwise fall back to JS mirror
  if (typeof wasm._simulateStrategy === "function") {
    const { ptr, len } = toHeap(prices);
    wasm._simulateStrategy(ptr, len);
    wasm._free(ptr);
    const result = readBuffer(wasm._getStrategyResult(), 3);
    return { buyIndex: result[0], sellIndex: result[1], profit: result[2] };
  }

  return jsSimulateStrategy(prices.slice(0, MAX_POINTS));
}

// ==================== NEW: SLIDING WINDOW ANALYTICS ====================

export interface SlidingWindowResult {
  windowMax: number;
  windowMin: number;
  rollingAvg: number;
}

/** JS fallback that mirrors the C++ slidingWindowAnalysis using deque logic. */
function jsSlidingWindowAnalysis(prices: number[], windowSize: number): SlidingWindowResult {
  if (prices.length === 0 || windowSize <= 0) {
    return { windowMax: 0, windowMin: 0, rollingAvg: 0 };
  }

  const n = prices.length;
  const w = Math.min(windowSize, n);
  const startIdx = n - w;

  // Deque-based sliding window max/min
  const maxDeque: number[] = [];
  const minDeque: number[] = [];
  let sum = 0;

  for (let i = startIdx; i < n; i++) {
    // Max deque
    while (maxDeque.length > 0 && prices[maxDeque[maxDeque.length - 1]] <= prices[i])
      maxDeque.pop();
    maxDeque.push(i);

    // Min deque
    while (minDeque.length > 0 && prices[minDeque[minDeque.length - 1]] >= prices[i])
      minDeque.pop();
    minDeque.push(i);

    // Remove out-of-window elements
    while (maxDeque.length > 0 && maxDeque[0] < startIdx) maxDeque.shift();
    while (minDeque.length > 0 && minDeque[0] < startIdx) minDeque.shift();

    sum += prices[i];
  }

  return {
    windowMax: roundCents(prices[maxDeque[0]]),
    windowMin: roundCents(prices[minDeque[0]]),
    rollingAvg: roundCents(sum / w),
  };
}

export async function wasmSlidingWindowAnalysis(
  prices: number[],
  windowSize: number = 10
): Promise<SlidingWindowResult> {
  await ensureLoaded();

  if (typeof wasm._slidingWindowAnalysis === "function") {
    const { ptr, len } = toHeap(prices);
    wasm._slidingWindowAnalysis(ptr, len, windowSize);
    wasm._free(ptr);
    const result = readBuffer(wasm._getSlidingWindowResult(), 3);
    return { windowMax: result[0], windowMin: result[1], rollingAvg: result[2] };
  }

  return jsSlidingWindowAnalysis(prices.slice(0, MAX_POINTS), windowSize);
}

// ==================== NEW: CORRELATION ANALYSIS ====================

/** JS fallback that mirrors the C++ computeCorrelation (Pearson). */
function jsComputeCorrelation(pricesA: number[], pricesB: number[]): number {
  const n = Math.min(pricesA.length, pricesB.length);
  if (n < 2) return 0;

  let meanA = 0, meanB = 0;
  for (let i = 0; i < n; i++) {
    meanA += pricesA[i];
    meanB += pricesB[i];
  }
  meanA /= n;
  meanB /= n;

  let cov = 0, varA = 0, varB = 0;
  for (let i = 0; i < n; i++) {
    const diffA = pricesA[i] - meanA;
    const diffB = pricesB[i] - meanB;
    cov += diffA * diffB;
    varA += diffA * diffA;
    varB += diffB * diffB;
  }

  const denominator = Math.sqrt(varA * varB);
  if (denominator < 1e-10) return 0;

  return Math.max(-1, Math.min(1, cov / denominator));
}

export async function wasmComputeCorrelation(
  pricesA: number[],
  pricesB: number[]
): Promise<number> {
  await ensureLoaded();

  if (typeof wasm._computeCorrelation === "function") {
    const a = toHeap(pricesA);
    const b = toHeap(pricesB);
    const result = wasm._computeCorrelation(a.ptr, a.len, b.ptr, b.len);
    wasm._free(a.ptr);
    wasm._free(b.ptr);
    return result;
  }

  return jsComputeCorrelation(
    pricesA.slice(0, MAX_POINTS),
    pricesB.slice(0, MAX_POINTS)
  );
}

// ==================== BATCH COMPUTE (EXTENDED) ====================

/** Compute all DSA analytics in one batch (single heap allocation). */
export async function computeDSAAnalytics(prices: number[]) {
  await ensureLoaded();
  const { ptr, len } = toHeap(prices);

  const maxProfit = wasm._calculateMaxProfit(ptr, len);

  wasm._calculateStockSpan(ptr, len);
  const stockSpan = readBuffer(wasm._getSpanBuffer(), len);

  wasm._calculateNextGreaterElement(ptr, len);
  const nextGreaterElement = readBuffer(wasm._getNgeBuffer(), len)
    .map(v => v === -1.0 ? null : v);

  wasm._free(ptr);

  return {
    maxPrice: Math.max(...prices),
    minPrice: Math.min(...prices),
    maxProfit,
    stockSpan,
    nextGreaterElement,
  };
}
