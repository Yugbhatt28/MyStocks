import { fetchStockQuote, fetchStockCandles, fetchMultipleQuotes, searchSymbols, type FinnhubQuote, type FinnhubCandle, type SymbolSearchResult } from "./finnhub.functions";
import { type StockData } from "./stockData";
import { computeDSAAnalytics, wasmVolatility } from "./wasm/dsa/dsaWasm";

/**
 * Fetch historical candle data (90+ days) and current quote, merge into StockData.
 */
export async function fetchRealStockData(symbol: string, existingData?: StockData): Promise<{ data: StockData | null; error: string | null }> {
  const upperSymbol = symbol.toUpperCase();

  try {
    // Fetch both quote and historical candles in parallel
    const now = Math.floor(Date.now() / 1000);
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60;

    const [quoteResult, candleResult] = await Promise.all([
      fetchStockQuote({ data: { symbol: upperSymbol } }),
      fetchStockCandles({ data: { symbol: upperSymbol, resolution: "D", fromTimestamp: ninetyDaysAgo, toTimestamp: now } }),
    ]);
    console.log("Candle status:", candleResult);
    if (quoteResult.error || !quoteResult.quote) {
      return { data: null, error: quoteResult.error || `No data available for ${upperSymbol}` };
    }

    const quote = quoteResult.quote;

    // Build prices & timestamps from historical candles if available
    let prices: number[];
    let timestamps: string[];

    if (candleResult.candle && candleResult.candle.prices.length > 10) {
      const candle = candleResult.candle;
      prices = candle.prices; // close prices
      timestamps = candle.timestamps.map((t: number) =>
        new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      );
      // Append current price if different from last candle
      const lastCandle = prices[prices.length - 1];
      if (Math.abs(lastCandle - quote.currentPrice) > 0.01) {
        prices.push(quote.currentPrice);
        timestamps.push(
          new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
        );
      }
    } else if (existingData && existingData.symbol === upperSymbol) {
      // Append new price to existing history
      prices = [...existingData.prices, quote.currentPrice].slice(-500);
      timestamps = [
        ...existingData.timestamps,
        new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      ].slice(-500);
    } else {
      // Fallback: use real data points only (open → current)
      prices = [quote.openPrice, quote.dayLow, quote.dayHigh, quote.currentPrice].filter((p) => p > 0);
      const nowMs = Date.now();
      timestamps = prices.map((_, i) => {
        const d = new Date(nowMs - (prices.length - 1 - i) * 3600000);
        return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      });
    }

    const dsaAnalytics = await computeDSAAnalytics(prices);

    return {
      data: {
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
      },
      error: null,
    };
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
    const stocks = await Promise.all(quotes.map((q: FinnhubQuote) => quoteToStockData(q)));
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
 * No fixed-size limit — keeps all data.
 */
export async function fetchLiveUpdate(existingData: StockData): Promise<StockData> {
  const { quote, error } = await fetchStockQuote({ data: { symbol: existingData.symbol } });

  if (error || !quote) {
    return existingData;
  }

  const newPrice = quote.currentPrice;
  const prices = [...existingData.prices, newPrice];
  const timestamps = [
    ...existingData.timestamps,
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  ];

  const dsaAnalytics = await computeDSAAnalytics(prices);

  return {
    ...existingData,
    currentPrice: quote.currentPrice,
    previousClose: quote.previousClose,
    change: quote.change,
    changePercent: quote.changePercent,
    dayHigh: dsaAnalytics.maxPrice,
    dayLow: dsaAnalytics.minPrice,
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
 * Convert a Finnhub quote to our StockData format (for market overview).
 */
async function quoteToStockData(quote: FinnhubQuote, existingData?: StockData): Promise<StockData> {
  let prices: number[];
  let timestamps: string[];

  if (existingData && existingData.symbol === quote.symbol) {
    prices = [...existingData.prices, quote.currentPrice];
    timestamps = [
      ...existingData.timestamps,
      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    ];
  } else {
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

export type { FinnhubQuote, FinnhubCandle, SymbolSearchResult };
