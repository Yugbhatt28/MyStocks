/**
 * TypeScript wrapper for the C++ WASM DSA engine.
 * Provides: maxProfit, stockSpan, nextGreaterElement, volatility.
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
