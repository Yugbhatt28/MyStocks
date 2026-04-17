/**
 * TypeScript wrapper for the C++ WASM DSA engine.
 * JS fallbacks mirror C++ algorithms exactly for when WASM isn't recompiled.
 * 
 * NO FIXED SIZE LIMIT — handles any dataset size.
 * Uses WASM for datasets ≤ 200 points (C++ buffer limit),
 * falls back to JS implementations for larger datasets.
 */

import createModule from "./dsa.js";

const WASM_MAX = 200; // C++ static buffer size
export const MIN_HISTORY = 30; // minimum data points for trend analysis

/** Guard: returns true if dataset has enough history for trend analysis. */
export function hasSufficientHistory(prices: number[] | { length: number }): boolean {
  return prices.length >= MIN_HISTORY;
}

export const INSUFFICIENT_DATA_MESSAGE =
  "Insufficient data: minimum 30 days required for trend analysis";

let wasm: any = null;
let loading: Promise<void> | null = null;

async function ensureLoaded() {
  if (wasm) return;
  if (!loading) {
    loading = createModule().then((m: any) => { wasm = m; });
  }
  await loading;
}

function toHeap(prices: number[]): { ptr: number; len: number } {
  const len = Math.min(prices.length, WASM_MAX);
  const ptr = wasm._malloc(len * 8);
  for (let i = 0; i < len; i++) {
    wasm.HEAPF64[(ptr >> 3) + i] = prices[i];
  }
  return { ptr, len };
}

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

// ==================== JS FALLBACK IMPLEMENTATIONS ====================
// These handle ANY dataset size, no upper bound.

function jsMaxProfit(prices: number[]): number {
  if (prices.length < 2) return 0;
  let minPrice = prices[0], maxProfit = 0;
  for (let i = 1; i < prices.length; i++) {
    maxProfit = Math.max(maxProfit, prices[i] - minPrice);
    minPrice = Math.min(minPrice, prices[i]);
  }
  return roundCents(maxProfit);
}

function jsStockSpan(prices: number[]): number[] {
  const n = prices.length;
  const span = new Array(n);
  const stack: number[] = [];
  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && prices[stack[stack.length - 1]] <= prices[i]) stack.pop();
    span[i] = stack.length === 0 ? (i + 1) : (i - stack[stack.length - 1]);
    stack.push(i);
  }
  return span;
}

function jsNextGreaterElement(prices: number[]): (number | null)[] {
  const n = prices.length;
  const nge: (number | null)[] = new Array(n);
  const stack: number[] = [];
  for (let i = n - 1; i >= 0; i--) {
    while (stack.length > 0 && prices[stack[stack.length - 1]] <= prices[i]) stack.pop();
    nge[i] = stack.length === 0 ? null : prices[stack[stack.length - 1]];
    stack.push(i);
  }
  return nge;
}

function jsVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  let mean = 0;
  for (const p of prices) mean += p;
  mean /= prices.length;
  let variance = 0;
  for (const p of prices) variance += (p - mean) ** 2;
  return roundCents(Math.sqrt(variance / prices.length));
}

function jsHeapMaxPrice(prices: number[]): number {
  if (prices.length === 0) return 0;
  let max = prices[0];
  for (let i = 1; i < prices.length; i++) if (prices[i] > max) max = prices[i];
  return roundCents(max);
}

function jsHeapMinPrice(prices: number[]): number {
  if (prices.length === 0) return 0;
  let min = prices[0];
  for (let i = 1; i < prices.length; i++) if (prices[i] < min) min = prices[i];
  return roundCents(min);
}

// ==================== EXISTING FUNCTIONS ====================

export async function wasmMaxProfit(prices: number[]): Promise<number> {
  if (prices.length > WASM_MAX) return jsMaxProfit(prices);
  await ensureLoaded();
  const { ptr, len } = toHeap(prices);
  const result = wasm._calculateMaxProfit(ptr, len);
  wasm._free(ptr);
  return result;
}

export async function wasmStockSpan(prices: number[]): Promise<number[]> {
  if (prices.length > WASM_MAX) return jsStockSpan(prices);
  await ensureLoaded();
  const { ptr, len } = toHeap(prices);
  wasm._calculateStockSpan(ptr, len);
  wasm._free(ptr);
  return readBuffer(wasm._getSpanBuffer(), len);
}

export async function wasmNextGreaterElement(prices: number[]): Promise<(number | null)[]> {
  if (prices.length > WASM_MAX) return jsNextGreaterElement(prices);
  await ensureLoaded();
  const { ptr, len } = toHeap(prices);
  wasm._calculateNextGreaterElement(ptr, len);
  wasm._free(ptr);
  return readBuffer(wasm._getNgeBuffer(), len).map(v => v === -1.0 ? null : v);
}

export async function wasmVolatility(prices: number[]): Promise<number> {
  if (prices.length > WASM_MAX) return jsVolatility(prices);
  await ensureLoaded();
  const { ptr, len } = toHeap(prices);
  const result = wasm._calculateVolatility(ptr, len);
  wasm._free(ptr);
  return result;
}

// ==================== STRATEGY SIMULATOR ====================

export interface StrategyResult {
  buyIndex: number;
  sellIndex: number;
  profit: number;
}

function jsSimulateStrategy(prices: number[]): StrategyResult {
  if (prices.length < 2) return { buyIndex: 0, sellIndex: 0, profit: 0 };
  let bestBuy = 0, minIdx = 0, sellIdx = 0, maxProfit = 0;
  for (let i = 1; i < prices.length; i++) {
    const profit = prices[i] - prices[minIdx];
    if (profit > maxProfit) { maxProfit = profit; bestBuy = minIdx; sellIdx = i; }
    if (prices[i] < prices[minIdx]) minIdx = i;
  }
  return { buyIndex: bestBuy, sellIndex: sellIdx, profit: roundCents(maxProfit) };
}

export async function wasmSimulateStrategy(prices: number[]): Promise<StrategyResult> {
  if (prices.length > WASM_MAX) return jsSimulateStrategy(prices);
  await ensureLoaded();
  if (typeof wasm._simulateStrategy === "function") {
    const { ptr, len } = toHeap(prices);
    wasm._simulateStrategy(ptr, len);
    wasm._free(ptr);
    const result = readBuffer(wasm._getStrategyResult(), 3);
    return { buyIndex: result[0], sellIndex: result[1], profit: result[2] };
  }
  return jsSimulateStrategy(prices);
}

// ==================== SLIDING WINDOW ANALYTICS ====================

export interface SlidingWindowResult {
  windowMax: number;
  windowMin: number;
  rollingAvg: number;
}

function jsSlidingWindowAnalysis(prices: number[], windowSize: number): SlidingWindowResult {
  if (prices.length === 0 || windowSize <= 0) return { windowMax: 0, windowMin: 0, rollingAvg: 0 };
  const n = prices.length;
  const w = Math.min(windowSize, n);
  const startIdx = n - w;
  const maxDeque: number[] = [];
  const minDeque: number[] = [];
  let sum = 0;
  for (let i = startIdx; i < n; i++) {
    while (maxDeque.length > 0 && prices[maxDeque[maxDeque.length - 1]] <= prices[i]) maxDeque.pop();
    maxDeque.push(i);
    while (minDeque.length > 0 && prices[minDeque[minDeque.length - 1]] >= prices[i]) minDeque.pop();
    minDeque.push(i);
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

export async function wasmSlidingWindowAnalysis(prices: number[], windowSize: number = 10): Promise<SlidingWindowResult> {
  if (prices.length > WASM_MAX) return jsSlidingWindowAnalysis(prices, windowSize);
  await ensureLoaded();
  if (typeof wasm._slidingWindowAnalysis === "function") {
    const { ptr, len } = toHeap(prices);
    wasm._slidingWindowAnalysis(ptr, len, windowSize);
    wasm._free(ptr);
    const result = readBuffer(wasm._getSlidingWindowResult(), 3);
    return { windowMax: result[0], windowMin: result[1], rollingAvg: result[2] };
  }
  return jsSlidingWindowAnalysis(prices, windowSize);
}

// ==================== CORRELATION ANALYSIS ====================

function jsComputeCorrelation(pricesA: number[], pricesB: number[]): number {
  const n = Math.min(pricesA.length, pricesB.length);
  if (n < 2) return 0;
  let meanA = 0, meanB = 0;
  for (let i = 0; i < n; i++) { meanA += pricesA[i]; meanB += pricesB[i]; }
  meanA /= n; meanB /= n;
  let cov = 0, varA = 0, varB = 0;
  for (let i = 0; i < n; i++) {
    const dA = pricesA[i] - meanA, dB = pricesB[i] - meanB;
    cov += dA * dB; varA += dA * dA; varB += dB * dB;
  }
  const denom = Math.sqrt(varA * varB);
  if (denom < 1e-10) return 0;
  return Math.max(-1, Math.min(1, cov / denom));
}

export async function wasmComputeCorrelation(pricesA: number[], pricesB: number[]): Promise<number> {
  if (pricesA.length > WASM_MAX || pricesB.length > WASM_MAX) {
    return jsComputeCorrelation(pricesA, pricesB);
  }
  await ensureLoaded();
  if (typeof wasm._computeCorrelation === "function") {
    const a = toHeap(pricesA);
    const b = toHeap(pricesB);
    const result = wasm._computeCorrelation(a.ptr, a.len, b.ptr, b.len);
    wasm._free(a.ptr);
    wasm._free(b.ptr);
    return result;
  }
  return jsComputeCorrelation(pricesA, pricesB);
}

// ==================== HEAP-BASED MAX/MIN PRICE ====================

export async function wasmHeapMaxPrice(prices: number[]): Promise<number> {
  if (prices.length > WASM_MAX) return jsHeapMaxPrice(prices);
  await ensureLoaded();
  if (typeof wasm._heapMaxPrice === "function") {
    const { ptr, len } = toHeap(prices);
    const result = wasm._heapMaxPrice(ptr, len);
    wasm._free(ptr);
    return result;
  }
  return jsHeapMaxPrice(prices);
}

export async function wasmHeapMinPrice(prices: number[]): Promise<number> {
  if (prices.length > WASM_MAX) return jsHeapMinPrice(prices);
  await ensureLoaded();
  if (typeof wasm._heapMinPrice === "function") {
    const { ptr, len } = toHeap(prices);
    const result = wasm._heapMinPrice(ptr, len);
    wasm._free(ptr);
    return result;
  }
  return jsHeapMinPrice(prices);
}

// ==================== HEAP-BASED PROFIT ====================

export interface HeapProfitResult {
  buyIndex: number;
  sellIndex: number;
  profit: number;
}

function jsHeapProfit(prices: number[]): HeapProfitResult {
  if (prices.length < 2) return { buyIndex: 0, sellIndex: 0, profit: 0 };
  // Min-heap simulation for best trade
  let minIdx = 0, bestBuy = 0, bestSell = 0, maxProfit = 0;
  for (let i = 1; i < prices.length; i++) {
    const profit = prices[i] - prices[minIdx];
    if (profit > maxProfit) { maxProfit = profit; bestBuy = minIdx; bestSell = i; }
    if (prices[i] < prices[minIdx]) minIdx = i;
  }
  return { buyIndex: bestBuy, sellIndex: bestSell, profit: roundCents(maxProfit) };
}

export async function wasmHeapProfit(prices: number[]): Promise<HeapProfitResult> {
  if (prices.length > WASM_MAX) return jsHeapProfit(prices);
  await ensureLoaded();
  if (typeof wasm._heapProfit === "function") {
    const { ptr, len } = toHeap(prices);
    wasm._heapProfit(ptr, len);
    wasm._free(ptr);
    const result = readBuffer(wasm._getHeapProfitResult(), 3);
    return { buyIndex: result[0], sellIndex: result[1], profit: result[2] };
  }
  return jsHeapProfit(prices);
}

// ==================== BATCH COMPUTE ====================

export async function computeDSAAnalytics(prices: number[]) {
  await ensureLoaded();

  // For large datasets, use pure JS
  if (prices.length > WASM_MAX) {
    const maxProfit = jsMaxProfit(prices);
    const stockSpan = jsStockSpan(prices);
    const nextGreaterElement = jsNextGreaterElement(prices);
    const maxPrice = jsHeapMaxPrice(prices);
    const minPrice = jsHeapMinPrice(prices);
    const heapProfit = jsHeapProfit(prices);
    return { maxPrice, minPrice, maxProfit, stockSpan, nextGreaterElement, heapProfit };
  }

  // WASM path for ≤ 200 points
  const { ptr, len } = toHeap(prices);

  const maxProfit = wasm._calculateMaxProfit(ptr, len);

  wasm._calculateStockSpan(ptr, len);
  const stockSpan = readBuffer(wasm._getSpanBuffer(), len);

  wasm._calculateNextGreaterElement(ptr, len);
  const nextGreaterElement = readBuffer(wasm._getNgeBuffer(), len).map(v => v === -1.0 ? null : v);

  let maxPrice: number;
  let minPrice: number;
  if (typeof wasm._heapMaxPrice === "function") {
    maxPrice = wasm._heapMaxPrice(ptr, len);
    minPrice = wasm._heapMinPrice(ptr, len);
  } else {
    maxPrice = jsHeapMaxPrice(prices);
    minPrice = jsHeapMinPrice(prices);
  }

  let heapProfit: HeapProfitResult;
  if (typeof wasm._heapProfit === "function") {
    wasm._heapProfit(ptr, len);
    const hp = readBuffer(wasm._getHeapProfitResult(), 3);
    heapProfit = { buyIndex: hp[0], sellIndex: hp[1], profit: hp[2] };
  } else {
    heapProfit = jsHeapProfit(prices);
  }

  wasm._free(ptr);

  return { maxPrice, minPrice, maxProfit, stockSpan, nextGreaterElement, heapProfit };
}
