// ==================== UPSTOX API SERVICE ====================
// Live market data integration with Upstox API v2

import type { StockQuote, CandleData } from '../types';
import { FO_STOCKS } from '../constants';

const BASE_URL = 'https://api.upstox.com/v2';

// ==================== API Response Types ====================

interface UpstoxQuoteData {
  ohlc: { open: number; high: number; low: number; close: number };
  depth: {
    buy: Array<{ quantity: number; price: number; orders: number }>;
    sell: Array<{ quantity: number; price: number; orders: number }>;
  };
  timestamp: string;
  instrument_token: string;
  symbol: string;
  last_price: number;
  volume: number;
  average_price: number;
  oi: number;
  net_change: number;
  total_buy_quantity: number;
  total_sell_quantity: number;
  lower_circuit_limit: number;
  upper_circuit_limit: number;
  last_trade_time: string;
  oi_day_high: number;
  oi_day_low: number;
}

interface UpstoxQuoteResponse {
  status: string;
  data: Record<string, UpstoxQuoteData>;
}

interface UpstoxCandleResponse {
  status: string;
  data: {
    candles: Array<[string, number, number, number, number, number, number]>;
  };
}

// ==================== State ====================

let lastApiError: string | null = null;
let fetchedQuotesCount = 0;

export function getLastApiError(): string | null { return lastApiError; }
export function getFetchedCount(): number { return fetchedQuotesCount; }
export function clearApiError(): void { lastApiError = null; }

// ==================== VALIDATE TOKEN ====================

export async function validateToken(token: string): Promise<boolean> {
  if (!token || token.length < 10) return false;
  try {
    const resp = await fetch(
      `${BASE_URL}/market-quote/ltp?instrument_key=${encodeURIComponent('NSE_EQ|INE002A01018')}`,
      { headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` } }
    );
    if (resp.status === 401 || resp.status === 403) return false;
    const json = await resp.json();
    return json.status === 'success';
  } catch {
    return false;
  }
}

// ==================== FETCH FULL MARKET QUOTES ====================

export async function fetchMarketQuotes(token: string): Promise<StockQuote[]> {
  // Upstox allows up to 500 instrument_keys per call
  const instrumentKeys = FO_STOCKS.map(s => s.instrumentKey).join(',');

  const resp = await fetch(
    `${BASE_URL}/market-quote/quotes?instrument_key=${encodeURIComponent(instrumentKeys)}`,
    {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    if (resp.status === 401) throw new Error('TOKEN_EXPIRED');
    throw new Error(`Upstox API ${resp.status}: ${txt.slice(0, 200)}`);
  }

  const json: UpstoxQuoteResponse = await resp.json();
  if (json.status !== 'success' || !json.data) {
    throw new Error('Upstox returned non-success status');
  }

  // ------- KEY FIX -------
  // Upstox returns data keyed as "NSE_EQ:RELIANCE" (exchange:trading_symbol)
  // Build a lookup: symbol → quote data by checking all returned keys
  const bySymbol = new Map<string, UpstoxQuoteData>();
  const byInstrumentToken = new Map<string, UpstoxQuoteData>();

  for (const [key, val] of Object.entries(json.data)) {
    if (!val) continue;
    // key format: "NSE_EQ:RELIANCE" or sometimes with instrument token
    const parts = key.split(':');
    if (parts.length === 2) {
      bySymbol.set(parts[1], val);              // "RELIANCE" → data
    }
    // Also index by the instrument_token field in the response
    if (val.instrument_token) {
      byInstrumentToken.set(val.instrument_token, val);
    }
    if (val.symbol) {
      bySymbol.set(val.symbol, val);
    }
  }

  const quotes: StockQuote[] = [];

  for (const info of FO_STOCKS) {
    // Try multiple lookup strategies
    const qd =
      bySymbol.get(info.symbol) ||
      byInstrumentToken.get(info.instrumentKey) ||
      byInstrumentToken.get(info.instrumentKey.replace('|', ':'));

    if (!qd || !qd.last_price) continue;

    const prevClose = qd.ohlc.close || qd.last_price;
    const change = qd.net_change ?? (qd.last_price - prevClose);
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
    const avgVol = qd.volume > 0 ? qd.volume * 0.85 : 1;   // rough avg estimate

    quotes.push({
      symbol: info.symbol,
      name: info.name,
      ltp: qd.last_price,
      open: qd.ohlc.open || qd.last_price,
      high: qd.ohlc.high || qd.last_price,
      low: qd.ohlc.low  || qd.last_price,
      close: qd.last_price,
      prevClose,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
      volume: qd.volume || 0,
      avgVolume: Math.round(avgVol),
      volumeRatio: avgVol > 0 ? Math.round((qd.volume / avgVol) * 100) / 100 : 1,
      oi: qd.oi || 0,
      oiChange: 0,
      oiChangePct: 0,
      sector: info.sector,
      lotSize: info.lotSize,
      instrumentKey: info.instrumentKey,
      futuresKey: `NSE_FO|${info.symbol}`,
      lastUpdated: Date.now(),
    });
  }

  fetchedQuotesCount = quotes.length;
  lastApiError = null;
  return quotes;
}

// ==================== FETCH INTRADAY CANDLES ====================

export async function fetchIntradayCandles(
  token: string,
  instrumentKey: string,
  interval: '1minute' | '30minute' = '1minute'
): Promise<CandleData[]> {
  const encoded = encodeURIComponent(instrumentKey);

  const resp = await fetch(
    `${BASE_URL}/historical-candle/intraday/${encoded}/${interval}`,
    {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!resp.ok) return [];

  const json: UpstoxCandleResponse = await resp.json();
  if (json.status !== 'success' || !json.data?.candles?.length) return [];

  // candle = [timestamp, open, high, low, close, volume, oi]
  return json.data.candles
    .map(c => ({
      time: new Date(c[0]).getTime() / 1000,
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5],
    }))
    .sort((a, b) => a.time - b.time);
}

// ==================== BATCH CANDLE FETCH (rate-limited) ====================
// Only fetch candles for top N stocks to avoid rate limits

export async function fetchCandlesBatch(
  token: string,
  instrumentKeys: Array<{ symbol: string; instrumentKey: string }>,
  maxConcurrent = 5
): Promise<Map<string, CandleData[]>> {
  const result = new Map<string, CandleData[]>();
  const items = instrumentKeys.slice(0, maxConcurrent);

  const promises = items.map(async (item) => {
    try {
      const candles = await fetchIntradayCandles(token, item.instrumentKey, '1minute');
      if (candles.length > 0) {
        result.set(item.symbol, candles);
      }
    } catch {
      // silently skip
    }
  });

  await Promise.allSettled(promises);
  return result;
}
