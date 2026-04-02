// Types
export interface StockData {
  symbol: string;
  name: string;
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

// Stock names map
const STOCK_NAMES: Record<string, string> = {
  AAPL: "Apple Inc.",
  GOOGL: "Alphabet Inc.",
  MSFT: "Microsoft Corp.",
  AMZN: "Amazon.com Inc.",
  TSLA: "Tesla Inc.",
  META: "Meta Platforms",
  NVDA: "NVIDIA Corp.",
  NFLX: "Netflix Inc.",
  JPM: "JPMorgan Chase",
  V: "Visa Inc.",
  BA: "Boeing Co.",
  DIS: "Walt Disney Co.",
};

// Generate realistic price data
function generatePrices(basePrice: number, count: number): number[] {
  const prices: number[] = [basePrice];
  for (let i = 1; i < count; i++) {
    const change = (Math.random() - 0.48) * basePrice * 0.015;
    prices.push(Math.round((prices[i - 1] + change) * 100) / 100);
  }
  return prices;
}

function generateTimestamps(count: number): string[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now - (count - 1 - i) * 60000);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  });
}

// DSA algorithms
function calculateStockSpan(prices: number[]): number[] {
  const n = prices.length;
  const span: number[] = new Array(n).fill(1);
  const stack: number[] = [];
  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && prices[stack[stack.length - 1]] <= prices[i]) {
      stack.pop();
    }
    span[i] = stack.length === 0 ? i + 1 : i - stack[stack.length - 1];
    stack.push(i);
  }
  return span;
}

function calculateNextGreaterElement(prices: number[]): (number | null)[] {
  const n = prices.length;
  const result: (number | null)[] = new Array(n).fill(null);
  const stack: number[] = [];
  for (let i = n - 1; i >= 0; i--) {
    while (stack.length > 0 && prices[stack[stack.length - 1]] <= prices[i]) {
      stack.pop();
    }
    result[i] = stack.length > 0 ? prices[stack[stack.length - 1]] : null;
    stack.push(i);
  }
  return result;
}

function calculateMaxProfit(prices: number[]): number {
  if (prices.length < 2) return 0;
  let minPrice = prices[0];
  let maxProfit = 0;
  for (let i = 1; i < prices.length; i++) {
    maxProfit = Math.max(maxProfit, prices[i] - minPrice);
    minPrice = Math.min(minPrice, prices[i]);
  }
  return Math.round(maxProfit * 100) / 100;
}

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + (p - mean) ** 2, 0) / prices.length;
  return Math.round(Math.sqrt(variance) * 100) / 100;
}

// Generate mock stock data
export function generateStockData(symbol: string, existingPrices?: number[]): StockData {
  const basePrices: Record<string, number> = {
    AAPL: 178, GOOGL: 141, MSFT: 378, AMZN: 178, TSLA: 248,
    META: 485, NVDA: 875, NFLX: 605, JPM: 195, V: 278, BA: 215, DIS: 112,
  };

  const base = basePrices[symbol.toUpperCase()] || 100 + Math.random() * 200;
  const count = 50;
  const prices = existingPrices || generatePrices(base, count);
  const timestamps = generateTimestamps(prices.length);
  const currentPrice = prices[prices.length - 1];
  const previousClose = prices[0];
  const change = Math.round((currentPrice - previousClose) * 100) / 100;
  const changePercent = Math.round((change / previousClose) * 10000) / 100;

  return {
    symbol: symbol.toUpperCase(),
    name: STOCK_NAMES[symbol.toUpperCase()] || `${symbol.toUpperCase()} Corp.`,
    currentPrice,
    previousClose,
    change,
    changePercent,
    dayHigh: Math.max(...prices),
    dayLow: Math.min(...prices),
    volume: Math.floor(Math.random() * 50000000) + 1000000,
    lastUpdated: new Date().toLocaleTimeString(),
    prices,
    timestamps,
    dsaAnalytics: {
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices),
      maxProfit: calculateMaxProfit(prices),
      stockSpan: calculateStockSpan(prices),
      nextGreaterElement: calculateNextGreaterElement(prices),
    },
  };
}

export function addNewPrice(data: StockData): StockData {
  const lastPrice = data.prices[data.prices.length - 1];
  const change = (Math.random() - 0.48) * lastPrice * 0.012;
  const newPrice = Math.round((lastPrice + change) * 100) / 100;
  const prices = [...data.prices, newPrice].slice(-100);
  const timestamps = [...data.timestamps, new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })].slice(-100);

  const currentPrice = prices[prices.length - 1];
  const previousClose = prices[0];
  const priceChange = Math.round((currentPrice - previousClose) * 100) / 100;
  const changePercent = Math.round((priceChange / previousClose) * 10000) / 100;

  return {
    ...data,
    currentPrice,
    change: priceChange,
    changePercent,
    dayHigh: Math.max(...prices),
    dayLow: Math.min(...prices),
    lastUpdated: new Date().toLocaleTimeString(),
    prices,
    timestamps,
    dsaAnalytics: {
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices),
      maxProfit: calculateMaxProfit(prices),
      stockSpan: calculateStockSpan(prices),
      nextGreaterElement: calculateNextGreaterElement(prices),
    },
  };
}

export { calculateVolatility };

// Market data for overview
const MARKET_SYMBOLS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA", "NFLX", "JPM", "V", "BA", "DIS"];

export function generateMarketData(): StockData[] {
  return MARKET_SYMBOLS.map((s) => generateStockData(s));
}
