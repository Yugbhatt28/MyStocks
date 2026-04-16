/**
 * Sorting Algorithms for Stock Data Analysis
 * 
 * Implements Merge Sort and Quick Sort with step tracking
 * for educational visualization.
 */

export interface SortedEntry {
  price: number;
  timestamp: string;
  originalIndex: number;
}

/**
 * Merge Sort — O(n log n) stable sort.
 * Used for: sorting historical prices to find trends, percentiles, medians.
 */
export function mergeSort(arr: SortedEntry[], ascending = true): SortedEntry[] {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid), ascending);
  const right = mergeSort(arr.slice(mid), ascending);
  return merge(left, right, ascending);
}

function merge(left: SortedEntry[], right: SortedEntry[], ascending: boolean): SortedEntry[] {
  const result: SortedEntry[] = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    const cmp = ascending
      ? left[i].price <= right[j].price
      : left[i].price >= right[j].price;
    if (cmp) result.push(left[i++]);
    else result.push(right[j++]);
  }
  while (i < left.length) result.push(left[i++]);
  while (j < right.length) result.push(right[j++]);
  return result;
}

/**
 * Quick Sort — O(n log n) average, in-place concept.
 * Used for: fast sorting of large datasets, finding top/bottom N stocks.
 */
export function quickSort(arr: SortedEntry[], ascending = true): SortedEntry[] {
  const copy = [...arr];
  quickSortInPlace(copy, 0, copy.length - 1, ascending);
  return copy;
}

function quickSortInPlace(arr: SortedEntry[], low: number, high: number, ascending: boolean): void {
  if (low >= high) return;
  const pivot = partition(arr, low, high, ascending);
  quickSortInPlace(arr, low, pivot - 1, ascending);
  quickSortInPlace(arr, pivot + 1, high, ascending);
}

function partition(arr: SortedEntry[], low: number, high: number, ascending: boolean): number {
  const pivotVal = arr[high].price;
  let i = low - 1;
  for (let j = low; j < high; j++) {
    const cmp = ascending ? arr[j].price <= pivotVal : arr[j].price >= pivotVal;
    if (cmp) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
  return i + 1;
}

/**
 * Compute sorted analytics from stock data.
 */
export interface SortedAnalytics {
  sortedAsc: SortedEntry[];
  sortedDesc: SortedEntry[];
  median: number;
  p25: number;
  p75: number;
  topGainers: { from: SortedEntry; to: SortedEntry; change: number }[];
  topLosers: { from: SortedEntry; to: SortedEntry; change: number }[];
}

export function computeSortedAnalytics(prices: number[], timestamps: string[]): SortedAnalytics {
  const entries: SortedEntry[] = prices.map((price, i) => ({
    price,
    timestamp: timestamps[i] || `#${i}`,
    originalIndex: i,
  }));

  const sortedAsc = mergeSort([...entries], true);
  const sortedDesc = quickSort([...entries], false);

  const n = sortedAsc.length;
  const median = n > 0 ? sortedAsc[Math.floor(n / 2)].price : 0;
  const p25 = n > 0 ? sortedAsc[Math.floor(n * 0.25)].price : 0;
  const p75 = n > 0 ? sortedAsc[Math.floor(n * 0.75)].price : 0;

  // Compute day-over-day changes and sort them
  const changes: { from: SortedEntry; to: SortedEntry; change: number }[] = [];
  for (let i = 1; i < entries.length; i++) {
    changes.push({
      from: entries[i - 1],
      to: entries[i],
      change: ((entries[i].price - entries[i - 1].price) / entries[i - 1].price) * 100,
    });
  }
  
  const sortedChanges = mergeSort(
    changes.map((c, i) => ({ price: c.change, timestamp: `${i}`, originalIndex: i })),
    false
  );

  const topGainers = sortedChanges
    .filter(s => s.price > 0)
    .slice(0, 5)
    .map(s => changes[s.originalIndex]);

  const topLosers = sortedChanges
    .filter(s => s.price < 0)
    .slice(-5)
    .reverse()
    .map(s => changes[s.originalIndex]);

  return { sortedAsc, sortedDesc, median, p25, p75, topGainers, topLosers };
}
