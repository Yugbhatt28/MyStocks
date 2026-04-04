// Types only — all DSA computation is done via C++ WASM (src/lib/wasm/dsa/)

export interface StockData {
  symbol: string;
  name: string;
  logo: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  lastUpdated: string;
  prices: number[];
  timestamps: string[];
  dsaAnalytics: DSAAnalytics;
}

export interface DSAAnalytics {
  maxPrice: number;
  minPrice: number;
  maxProfit: number;
  stockSpan: number[];
  nextGreaterElement: (number | null)[];
}
