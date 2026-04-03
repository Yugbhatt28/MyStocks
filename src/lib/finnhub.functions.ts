import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const quoteSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Z0-9.]+$/),
});

const multiQuoteSchema = z.object({
  symbols: z.array(z.string().min(1).max(10).regex(/^[A-Z0-9.]+$/)).min(1).max(20),
});

export interface FinnhubQuote {
  symbol: string;
  name: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  openPrice: number;
  timestamp: number;
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
    if (!apiKey) {
      return { quote: null, error: "FINNHUB_API_KEY is not configured" };
    }

    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${data.symbol}&token=${apiKey}`
      );
      if (!res.ok) {
        return { quote: null, error: `Finnhub API error: ${res.status}` };
      }
      const q = await res.json();

      // Finnhub returns { c, d, dp, h, l, o, pc, t } where c=current, d=change, dp=change%, h=high, l=low, o=open, pc=prev close, t=timestamp
      if (!q.c || q.c === 0) {
        return { quote: null, error: `No data found for symbol ${data.symbol}` };
      }

      return {
        quote: {
          symbol: data.symbol,
          name: STOCK_NAMES[data.symbol] || `${data.symbol}`,
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
        return {
          symbol,
          name: STOCK_NAMES[symbol] || symbol,
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
