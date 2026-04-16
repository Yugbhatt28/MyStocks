/**
 * TypeScript wrapper for the C++ WASM DSA engine.
 * JS fallbacks mirror C++ algorithms exactly for when WASM isn't recompiled.
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

function toHeap(prices: number[]): { ptr: number; len: number } {
  const len = Math.min(prices.length, MAX_POINTS);
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

// ==================== EXISTING FUNCTIONS ====================

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
  await ensureLoaded();
  if (typeof wasm._simulateStrategy === "function") {
    const { ptr, len } = toHeap(prices);
    wasm._simulateStrategy(ptr, len);
    wasm._free(ptr);
    const result = readBuffer(wasm._getStrategyResult(), 3);
    return { buyIndex: result[0], sellIndex: result[1], profit: result[2] };
  }
  return jsSimulateStrategy(prices.slice(0, MAX_POINTS));
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
  await ensureLoaded();
  if (typeof wasm._computeCorrelation === "function") {
    const a = toHeap(pricesA);
    const b = toHeap(pricesB);
    const result = wasm._computeCorrelation(a.ptr, a.len, b.ptr, b.len);
    wasm._free(a.ptr);
    wasm._free(b.ptr);
    return result;
  }
  return jsComputeCorrelation(pricesA.slice(0, MAX_POINTS), pricesB.slice(0, MAX_POINTS));
}

// ==================== HEAP-BASED MAX/MIN PRICE ====================

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

export async function wasmHeapMaxPrice(prices: number[]): Promise<number> {
  await ensureLoaded();
  if (typeof wasm._heapMaxPrice === "function") {
    const { ptr, len } = toHeap(prices);
    const result = wasm._heapMaxPrice(ptr, len);
    wasm._free(ptr);
    return result;
  }
  return jsHeapMaxPrice(prices.slice(0, MAX_POINTS));
}

export async function wasmHeapMinPrice(prices: number[]): Promise<number> {
  await ensureLoaded();
  if (typeof wasm._heapMinPrice === "function") {
    const { ptr, len } = toHeap(prices);
    const result = wasm._heapMinPrice(ptr, len);
    wasm._free(ptr);
    return result;
  }
  return jsHeapMinPrice(prices.slice(0, MAX_POINTS));
}

// ==================== HEAP-BASED PROFIT ====================

export interface HeapProfitResult {
  buyIndex: number;
  sellIndex: number;
  profit: number;
}

function jsHeapProfit(prices: number[]): HeapProfitResult {
  if (prices.length < 2) return { buyIndex: 0, sellIndex: 0, profit: 0 };
  let minIdx = 0, bestBuy = 0, bestSell = 0, maxProfit = 0;
  for (let i = 1; i < prices.length; i++) {
    const profit = prices[i] - prices[minIdx];
    if (profit > maxProfit) { maxProfit = profit; bestBuy = minIdx; bestSell = i; }
    if (prices[i] < prices[minIdx]) minIdx = i;
  }
  return { buyIndex: bestBuy, sellIndex: bestSell, profit: roundCents(maxProfit) };
}

export async function wasmHeapProfit(prices: number[]): Promise<HeapProfitResult> {
  await ensureLoaded();
  if (typeof wasm._heapProfit === "function") {
    const { ptr, len } = toHeap(prices);
    wasm._heapProfit(ptr, len);
    wasm._free(ptr);
    const result = readBuffer(wasm._getHeapProfitResult(), 3);
    return { buyIndex: result[0], sellIndex: result[1], profit: result[2] };
  }
  return jsHeapProfit(prices.slice(0, MAX_POINTS));
}

// ==================== BATCH COMPUTE ====================

export async function computeDSAAnalytics(prices: number[]) {
  await ensureLoaded();
  const { ptr, len } = toHeap(prices);

  const maxProfit = wasm._calculateMaxProfit(ptr, len);

  wasm._calculateStockSpan(ptr, len);
  const stockSpan = readBuffer(wasm._getSpanBuffer(), len);

  wasm._calculateNextGreaterElement(ptr, len);
  const nextGreaterElement = readBuffer(wasm._getNgeBuffer(), len).map(v => v === -1.0 ? null : v);

  // Heap-based max/min (C++ priority queue)
  let maxPrice: number;
  let minPrice: number;
  if (typeof wasm._heapMaxPrice === "function") {
    maxPrice = wasm._heapMaxPrice(ptr, len);
    minPrice = wasm._heapMinPrice(ptr, len);
  } else {
    maxPrice = jsHeapMaxPrice(prices.slice(0, MAX_POINTS));
    minPrice = jsHeapMinPrice(prices.slice(0, MAX_POINTS));
  }

  // Heap-based profit
  let heapProfit: HeapProfitResult;
  if (typeof wasm._heapProfit === "function") {
    wasm._heapProfit(ptr, len);
    const hp = readBuffer(wasm._getHeapProfitResult(), 3);
    heapProfit = { buyIndex: hp[0], sellIndex: hp[1], profit: hp[2] };
  } else {
    heapProfit = jsHeapProfit(prices.slice(0, MAX_POINTS));
  }

  wasm._free(ptr);

  return { maxPrice, minPrice, maxProfit, stockSpan, nextGreaterElement, heapProfit };
}
