// Types only — all DSA computation is done via C++ WASM (src/lib/wasm/dsa/)

export interface HeapProfitInfo {
  buyIndex: number;
  sellIndex: number;
  profit: number;
}

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
  heapProfit: HeapProfitInfo;
}

export interface TimelineEvent {
  id: string;
  type: "spike" | "drop" | "new_max" | "new_min" | "reversal" | "volatility_spike";
  message: string;
  timestamp: number;
}

export interface CustomAlert {
  id: string;
  symbol: string;
  type: "price_above" | "price_below" | "volatility_spike" | "trend_reversal";
  threshold: number;
  active: boolean;
}
