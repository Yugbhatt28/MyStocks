/**
 * C++ WASM-powered DSA algorithms for stock analytics.
 * Functions: maxProfit (Greedy), stockSpan (Stack), nextGreaterElement (Stack), volatility (Stats).
 */

import createModule from "./dsa.js";

let moduleInstance: any = null;
let initPromise: Promise<void> | null = null;

async function ensureLoaded() {
  if (moduleInstance) return;
  if (!initPromise) {
    initPromise = createModule().then((m: any) => {
      moduleInstance = m;
    });
  }
  await initPromise;
}

function allocateDoubleArray(prices: number[]): { ptr: number; n: number } {
  const n = Math.min(prices.length, 200);
  const ptr = moduleInstance._malloc(n * 8); // 8 bytes per double
  for (let i = 0; i < n; i++) {
    moduleInstance.HEAPF64[(ptr >> 3) + i] = prices[i];
  }
  return { ptr, n };
}

export async function wasmMaxProfit(prices: number[]): Promise<number> {
  await ensureLoaded();
  const { ptr, n } = allocateDoubleArray(prices);
  const result = moduleInstance._calculateMaxProfit(ptr, n);
  moduleInstance._free(ptr);
  return result;
}

export async function wasmStockSpan(prices: number[]): Promise<number[]> {
  await ensureLoaded();
  const { ptr, n } = allocateDoubleArray(prices);
  moduleInstance._calculateStockSpan(ptr, n);
  moduleInstance._free(ptr);

  const bufPtr = moduleInstance._getSpanBuffer();
  const span: number[] = [];
  for (let i = 0; i < n; i++) {
    span.push(moduleInstance.HEAPF64[(bufPtr >> 3) + i]);
  }
  return span;
}

export async function wasmNextGreaterElement(prices: number[]): Promise<(number | null)[]> {
  await ensureLoaded();
  const { ptr, n } = allocateDoubleArray(prices);
  moduleInstance._calculateNextGreaterElement(ptr, n);
  moduleInstance._free(ptr);

  const bufPtr = moduleInstance._getNgeBuffer();
  const nge: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    const val = moduleInstance.HEAPF64[(bufPtr >> 3) + i];
    nge.push(val === -1.0 ? null : val);
  }
  return nge;
}

export async function wasmVolatility(prices: number[]): Promise<number> {
  await ensureLoaded();
  const { ptr, n } = allocateDoubleArray(prices);
  const result = moduleInstance._calculateVolatility(ptr, n);
  moduleInstance._free(ptr);
  return result;
}

/**
 * Compute all DSA analytics at once using C++ WASM.
 */
export async function computeDSAAnalytics(prices: number[]) {
  await ensureLoaded();
  const { ptr, n } = allocateDoubleArray(prices);

  const maxProfit = moduleInstance._calculateMaxProfit(ptr, n);
  moduleInstance._calculateStockSpan(ptr, n);
  const spanBuf = moduleInstance._getSpanBuffer();
  const stockSpan: number[] = [];
  for (let i = 0; i < n; i++) {
    stockSpan.push(moduleInstance.HEAPF64[(spanBuf >> 3) + i]);
  }

  moduleInstance._calculateNextGreaterElement(ptr, n);
  const ngeBuf = moduleInstance._getNgeBuffer();
  const nextGreaterElement: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    const val = moduleInstance.HEAPF64[(ngeBuf >> 3) + i];
    nextGreaterElement.push(val === -1.0 ? null : val);
  }

  moduleInstance._free(ptr);

  return {
    maxPrice: Math.max(...prices),
    minPrice: Math.min(...prices),
    maxProfit,
    stockSpan,
    nextGreaterElement,
  };
}
