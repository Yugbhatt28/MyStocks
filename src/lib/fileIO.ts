/**
 * File I/O Module — Save and Load Stock Data
 * 
 * Supports:
 * - localStorage persistence
 * - JSON file download/upload
 */

import type { StockData } from "./stockData";

const STORAGE_KEY = "stock_analysis_saved_data";

/**
 * Save stock data to localStorage.
 */
export function saveToLocalStorage(data: StockData): void {
  try {
    const existing = loadAllFromLocalStorage();
    const idx = existing.findIndex(d => d.symbol === data.symbol);
    if (idx >= 0) existing[idx] = data;
    else existing.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error("Failed to save to localStorage:", err);
    throw new Error("Storage quota exceeded or unavailable");
  }
}

/**
 * Load all saved stock data from localStorage.
 */
export function loadAllFromLocalStorage(): StockData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StockData[];
  } catch {
    return [];
  }
}

/**
 * Load a specific stock from localStorage.
 */
export function loadFromLocalStorage(symbol: string): StockData | null {
  const all = loadAllFromLocalStorage();
  return all.find(d => d.symbol === symbol) || null;
}

/**
 * Delete a stock from localStorage.
 */
export function deleteFromLocalStorage(symbol: string): void {
  const all = loadAllFromLocalStorage();
  const filtered = all.filter(d => d.symbol !== symbol);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Download stock data as a JSON file.
 */
export function downloadAsJSON(data: StockData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.symbol}_stock_data_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download stock data as CSV file.
 */
export function downloadAsCSV(data: StockData): void {
  const headers = ["Timestamp", "Price", "StockSpan", "NextGreaterElement"];
  const rows = data.prices.map((price, i) => [
    data.timestamps[i] || "",
    price.toFixed(2),
    data.dsaAnalytics.stockSpan[i]?.toString() || "",
    data.dsaAnalytics.nextGreaterElement[i]?.toString() || "None",
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.symbol}_stock_data_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Upload and parse a JSON stock data file.
 */
export function uploadJSONFile(): Promise<StockData> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) { reject(new Error("No file selected")); return; }
      try {
        const text = await file.text();
        const data = JSON.parse(text) as StockData;
        // Basic validation
        if (!data.symbol || !Array.isArray(data.prices) || !Array.isArray(data.timestamps)) {
          reject(new Error("Invalid stock data format"));
          return;
        }
        resolve(data);
      } catch (err) {
        reject(new Error(`Failed to parse file: ${err instanceof Error ? err.message : String(err)}`));
      }
    };
    input.click();
  });
}
