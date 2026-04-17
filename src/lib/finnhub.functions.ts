import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const quoteSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Z0-9.]+$/),
});

const multiQuoteSchema = z.object({
  symbols: z.array(z.string().min(1).max(10).regex(/^[A-Z0-9.]+$/)).min(1).max(20),
});

const candleSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Z0-9.]+$/),
  resolution: z.enum(["1", "5", "15", "30", "60", "D", "W", "M"]).default("D"),
  fromTimestamp: z.number(),
  toTimestamp: z.number(),
});

export interface FinnhubQuote {
  symbol: string;
  name: string;
  logo: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  openPrice: number;
  timestamp: number;
}

export interface FinnhubCandle {
  symbol: string;
  prices: number[];      // close prices
  opens: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
  timestamps: number[];  // unix timestamps
}

const searchSchema = z.object({
  query: z.string().min(1).max(50),
});

export interface SymbolSearchResult {
  symbol: string;
  description: string;
  type: string;
}


export const fetchStockQuote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => quoteSchema.parse(input))
  .handler(async ({ data }): Promise<{ quote: FinnhubQuote | null; error: string | null }> => {
    const apiKey = process.env.FINNHUB_API_KEY;
    // console.log("API KEY:", apiKey);
    if (!apiKey) {
      return { quote: null, error: "FINNHUB_API_KEY is not configured" };
    }

    try {
      const [quoteRes, profileRes] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/quote?symbol=${data.symbol}&token=${apiKey}`),
        fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${data.symbol}&token=${apiKey}`),
      ]);

      if (!quoteRes.ok) {
        if (quoteRes.status === 429) return { quote: null, error: "Rate limit exceeded. Please wait a moment and try again." };
        return { quote: null, error: `Finnhub API error: ${quoteRes.status}` };
      }
      const q = await quoteRes.json();

      if (!q.c || q.c === 0) {
        return { quote: null, error: `No data found for symbol ${data.symbol}` };
      }

      let name = data.symbol;
      let logo = "";
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile.name) name = profile.name;
        if (profile.logo) logo = profile.logo;
      }

      return {
        quote: {
          symbol: data.symbol,
          name,
          logo,
          currentPrice: q.c,
          previousClose: q.pc,
          change: q.d,
          changePercent: q.dp,
          dayHigh: q.h,
          dayLow: q.l,
          openPrice: q.o,
          timestamp: q.t,
        },
        error: null,
      };
    } catch (err) {
      return { quote: null, error: `Failed to fetch quote: ${err instanceof Error ? err.message : String(err)}` };
    }
  });

/**
 * Fetch historical candle data from Finnhub (up to 1 year of daily data).
 */
export const fetchStockCandles = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => candleSchema.parse(input))
  .handler(async ({ data }): Promise<{ candle: FinnhubCandle | null; error: string | null }> => {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return { candle: null, error: "FINNHUB_API_KEY is not configured" };
    }

    try {
      const url = `https://finnhub.io/api/v1/stock/candle?symbol=${data.symbol}&resolution=${data.resolution}&from=${data.fromTimestamp}&to=${data.toTimestamp}&token=${apiKey}`;
      const res = await fetch(url);

      if (!res.ok) {
        if (res.status === 429) return { candle: null, error: "Rate limit exceeded. Please wait and try again." };
        return { candle: null, error: `Finnhub candle API error: ${res.status}` };
      }

      const json = await res.json();

      if (json.s === "no_data" || !json.c || json.c.length === 0) {
        return { candle: null, error: `No historical data available for ${data.symbol}` };
      }

      return {
        candle: {
          symbol: data.symbol,
          prices: json.c as number[],
          opens: json.o as number[],
          highs: json.h as number[],
          lows: json.l as number[],
          volumes: json.v as number[],
          timestamps: json.t as number[],
        },
        error: null,
      };
    } catch (err) {
      return { candle: null, error: `Failed to fetch candles: ${err instanceof Error ? err.message : String(err)}` };
    }
  });

export const fetchMultipleQuotes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => multiQuoteSchema.parse(input))
  .handler(async ({ data }): Promise<{ quotes: FinnhubQuote[]; errors: string[] }> => {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return { quotes: [], errors: ["FINNHUB_API_KEY is not configured"] };
    }

    const results = await Promise.allSettled(
      data.symbols.map(async (symbol) => {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
        );
        if (!res.ok) throw new Error(`API error ${res.status} for ${symbol}`);
        const q = await res.json();
        if (!q.c || q.c === 0) throw new Error(`No data for ${symbol}`);

        let name = symbol;
        let logo = "";
        try {
          const profileRes = await fetch(
            `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`
          );
          if (profileRes.ok) {
            const profile = await profileRes.json();
            if (profile.name) name = profile.name;
            if (profile.logo) logo = profile.logo;
          }
        } catch {}

        return {
          symbol,
          name,
          logo,
          currentPrice: q.c,
          previousClose: q.pc,
          change: q.d,
          changePercent: q.dp,
          dayHigh: q.h,
          dayLow: q.l,
          openPrice: q.o,
          timestamp: q.t,
        } as FinnhubQuote;
      })
    );

    const quotes: FinnhubQuote[] = [];
    const errors: string[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") quotes.push(r.value);
      else errors.push(r.reason.message);
    }

    return { quotes, errors };
  });

export const searchSymbols = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => searchSchema.parse(input))
  .handler(async ({ data }): Promise<{ results: SymbolSearchResult[]; error: string | null }> => {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return { results: [], error: "FINNHUB_API_KEY is not configured" };
    }

    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(data.query)}&token=${apiKey}`
      );
      if (!res.ok) {
        return { results: [], error: `Search API error: ${res.status}` };
      }
      const json = await res.json();
      const results: SymbolSearchResult[] = (json.result || [])
        .filter((r: any) => {
          if (r.type !== "Common Stock") return false;
          const sym: string = r.symbol || "";
          if (sym.includes(".")) return false;
          return true;
        })
        .slice(0, 10)
        .map((r: any) => ({
          symbol: r.symbol,
          description: r.description,
          type: r.type,
        }));
      return { results, error: null };
    } catch (err) {
      return { results: [], error: `Search failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  });
