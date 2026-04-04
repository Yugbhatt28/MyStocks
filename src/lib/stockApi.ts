import { fetchStockQuote, fetchMultipleQuotes, searchSymbols, type FinnhubQuote, type SymbolSearchResult } from "./finnhub.functions";
import { type StockData } from "./stockData";
import { computeDSAAnalytics, wasmVolatility } from "./wasm/dsa/dsaWasm";

/**
 * Fetch a real quote from Finnhub and convert it into our StockData format.
 */
export async function fetchRealStockData(symbol: string, existingData?: StockData): Promise<{ data: StockData | null; error: string | null }> {
  const upperSymbol = symbol.toUpperCase();

  try {
    const { quote, error } = await fetchStockQuote({ data: { symbol: upperSymbol } });

    if (error || !quote) {
      return { data: null, error: error || `No data available for ${upperSymbol}` };
    }

    return { data: await quoteToStockData(quote, existingData), error: null };
  } catch (err) {
    return { data: null, error: `Failed to fetch ${upperSymbol}: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Fetch multiple real quotes for market overview.
 */
export async function fetchRealMarketData(symbols: string[]): Promise<{ stocks: StockData[]; errors: string[] }> {
  try {
    const { quotes, errors } = await fetchMultipleQuotes({ data: { symbols } });
    const stocks = await Promise.all(quotes.map((q) => quoteToStockData(q)));
    return { stocks, errors };
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
 * For live mode: fetch a fresh quote and append the real price to existing data.
 */
export async function fetchLiveUpdate(existingData: StockData): Promise<StockData> {
  const { quote, error } = await fetchStockQuote({ data: { symbol: existingData.symbol } });

  if (error || !quote) {
    // Return existing data unchanged if API fails — no fake data
    return existingData;
  }

  const newPrice = quote.currentPrice;
  const prices = [...existingData.prices, newPrice].slice(-100);
  const timestamps = [
    ...existingData.timestamps,
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  ].slice(-100);

  const dsaAnalytics = await computeDSAAnalytics(prices);

  return {
    ...existingData,
    currentPrice: quote.currentPrice,
    previousClose: quote.previousClose,
    change: quote.change,
    changePercent: quote.changePercent,
    dayHigh: Math.max(quote.dayHigh, ...prices),
    dayLow: Math.min(quote.dayLow, ...prices.filter((p) => p > 0)),
    lastUpdated: new Date().toLocaleTimeString(),
    prices,
    timestamps,
    dsaAnalytics,
  };
}

/**
 * Compute volatility using C++ WASM.
 */
export async function getVolatility(prices: number[]): Promise<number> {
  return wasmVolatility(prices);
}

/**
 * Convert a Finnhub quote to our StockData format.
 * Uses only real data points — no random generation.
 */
async function quoteToStockData(quote: FinnhubQuote, existingData?: StockData): Promise<StockData> {
  let prices: number[];
  let timestamps: string[];

  if (existingData && existingData.symbol === quote.symbol) {
    // Append new price to existing history
    prices = [...existingData.prices, quote.currentPrice].slice(-100);
    timestamps = [
      ...existingData.timestamps,
      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    ].slice(-100);
  } else {
    // Initial load: use real data points only (open → current)
    prices = [quote.openPrice, quote.dayLow, quote.dayHigh, quote.currentPrice].filter((p) => p > 0);
    const now = Date.now();
    timestamps = prices.map((_, i) => {
      const d = new Date(now - (prices.length - 1 - i) * 3600000);
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    });
  }

  const dsaAnalytics = await computeDSAAnalytics(prices);

  return {
    symbol: quote.symbol,
    name: quote.name,
    logo: quote.logo,
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
    dsaAnalytics,
  };
}

export type { FinnhubQuote, SymbolSearchResult };
