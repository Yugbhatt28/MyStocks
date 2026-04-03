import { fetchStockQuote, fetchMultipleQuotes, searchSymbols, type FinnhubQuote, type SymbolSearchResult } from "./finnhub.functions";
import {
  addNewPrice,
  calculateStockSpan,
  calculateNextGreaterElement,
  calculateMaxProfit,
  type StockData,
} from "./stockData";

/**
 * Fetch a real quote from Finnhub and convert it into our StockData format.
 * Returns null with an error message if API call fails.
 */
export async function fetchRealStockData(symbol: string, existingData?: StockData): Promise<{ data: StockData | null; error: string | null }> {
  const upperSymbol = symbol.toUpperCase();

  try {
    const { quote, error } = await fetchStockQuote({ data: { symbol: upperSymbol } });

    if (error || !quote) {
      return { data: null, error: error || `No data for ${upperSymbol}` };
    }

    return { data: quoteToStockData(quote, existingData), error: null };
  } catch (err) {
    return { data: null, error: `Failed to fetch ${upperSymbol}: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Fetch multiple real quotes for market overview.
 * Only returns stocks that have real data.
 */
export async function fetchRealMarketData(symbols: string[]): Promise<{ stocks: StockData[]; errors: string[] }> {
  try {
    const { quotes, errors } = await fetchMultipleQuotes({ data: { symbols } });
    return { stocks: quotes.map((q) => quoteToStockData(q)), errors };
  } catch (err) {
    return { stocks: [], errors: [`Market data fetch failed: ${err instanceof Error ? err.message : String(err)}`] };
  }
}

/**
 * Search for stock symbols by company name or ticker.
 */
export async function searchStockSymbols(query: string): Promise<SymbolSearchResult[]> {
  try {
    const { results, error } = await searchSymbols({ data: { query } });
    if (error) {
      console.warn("Symbol search error:", error);
      return [];
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * For live mode: fetch a fresh quote and append the price to existing data.
 */
export async function fetchLiveUpdate(existingData: StockData): Promise<StockData> {
  try {
    const { quote, error } = await fetchStockQuote({ data: { symbol: existingData.symbol } });

    if (error || !quote) {
      return addNewPrice(existingData);
    }

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

    return {
      ...existingData,
      currentPrice,
      previousClose,
      change,
      changePercent,
      dayHigh: Math.max(quote.dayHigh, ...prices),
      dayLow: Math.min(quote.dayLow, ...prices.filter((p) => p > 0)),
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
  let prices: number[];
  let timestamps: string[];

  if (existingData) {
    prices = [...existingData.prices, quote.currentPrice].slice(-100);
    timestamps = [
      ...existingData.timestamps,
      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    ].slice(-100);
  } else {
    const spread = quote.dayHigh - quote.dayLow;
    prices = [];
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const base = quote.openPrice + (quote.currentPrice - quote.openPrice) * t;
      const noise = (Math.random() - 0.5) * spread * 0.3;
      prices.push(Math.round((base + noise) * 100) / 100);
    }
    prices.push(quote.currentPrice);

    const now = Date.now();
    timestamps = prices.map((_, i) => {
      const d = new Date(now - (prices.length - 1 - i) * 60000);
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    });
  }

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

export type { FinnhubQuote, SymbolSearchResult };
