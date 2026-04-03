import { fetchStockQuote, fetchMultipleQuotes, type FinnhubQuote } from "./finnhub.functions";
import { generateStockData, addNewPrice, type StockData } from "./stockData";

/**
 * Fetch a real quote from Finnhub and convert it into our StockData format.
 * Falls back to mock data if the API call fails.
 */
export async function fetchRealStockData(symbol: string, existingData?: StockData): Promise<StockData> {
  const upperSymbol = symbol.toUpperCase();

  try {
    const { quote, error } = await fetchStockQuote({ data: { symbol: upperSymbol } });

    if (error || !quote) {
      console.warn(`Finnhub error for ${upperSymbol}: ${error}. Using mock data.`);
      return generateStockData(upperSymbol);
    }

    return quoteToStockData(quote, existingData);
  } catch (err) {
    console.warn(`Failed to fetch ${upperSymbol}:`, err);
    return generateStockData(upperSymbol);
  }
}

/**
 * Fetch multiple real quotes for market overview.
 */
export async function fetchRealMarketData(symbols: string[]): Promise<StockData[]> {
  try {
    const { quotes, errors } = await fetchMultipleQuotes({ data: { symbols } });

    if (errors.length > 0) {
      console.warn("Some quotes failed:", errors);
    }

    return quotes.map((q) => quoteToStockData(q));
  } catch {
    // Fallback to mock data
    return symbols.map((s) => generateStockData(s));
  }
}

/**
 * For live mode: fetch a fresh quote and append the price to existing data.
 */
export async function fetchLiveUpdate(existingData: StockData): Promise<StockData> {
  try {
    const { quote, error } = await fetchStockQuote({ data: { symbol: existingData.symbol } });

    if (error || !quote) {
      // Fallback: simulate a new price point
      return addNewPrice(existingData);
    }

    // Append the real price to existing price history
    const newPrice = quote.currentPrice;
    const prices = [...existingData.prices, newPrice].slice(-100);
    const timestamps = [
      ...existingData.timestamps,
      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    ].slice(-100);

    const currentPrice = prices[prices.length - 1];
    const previousClose = quote.previousClose;
    const change = Math.round((currentPrice - previousClose) * 100) / 100;
    const changePercent = Math.round((change / previousClose) * 10000) / 100;

    // Recalculate DSA analytics
    const { calculateStockSpan, calculateNextGreaterElement, calculateMaxProfit } = await import("./stockData");

    return {
      ...existingData,
      currentPrice,
      previousClose,
      change,
      changePercent,
      dayHigh: Math.max(quote.dayHigh, ...prices),
      dayLow: Math.min(quote.dayLow, ...prices.filter(p => p > 0)),
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
  } catch {
    return addNewPrice(existingData);
  }
}

function quoteToStockData(quote: FinnhubQuote, existingData?: StockData): StockData {
  // If we have existing prices, append the new one; otherwise create initial array
  let prices: number[];
  let timestamps: string[];

  if (existingData) {
    prices = [...existingData.prices, quote.currentPrice].slice(-100);
    timestamps = [
      ...existingData.timestamps,
      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    ].slice(-100);
  } else {
    // Create initial price points from the available data
    const spread = quote.dayHigh - quote.dayLow;
    prices = [];
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      // Interpolate from open to current with some noise
      const base = quote.openPrice + (quote.currentPrice - quote.openPrice) * t;
      const noise = (Math.random() - 0.5) * spread * 0.3;
      prices.push(Math.round((base + noise) * 100) / 100);
    }
    prices.push(quote.currentPrice); // Ensure last price is current

    const now = Date.now();
    timestamps = prices.map((_, i) => {
      const d = new Date(now - (prices.length - 1 - i) * 60000);
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    });
  }

  // Import DSA functions inline to avoid circular deps
  const { calculateStockSpan, calculateNextGreaterElement, calculateMaxProfit } = require("./stockData");

  return {
    symbol: quote.symbol,
    name: quote.name,
    currentPrice: quote.currentPrice,
    previousClose: quote.previousClose,
    change: quote.change,
    changePercent: quote.changePercent,
    dayHigh: quote.dayHigh,
    dayLow: quote.dayLow,
    volume: 0,
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

export type { FinnhubQuote };
