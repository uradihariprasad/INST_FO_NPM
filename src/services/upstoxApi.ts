// ==================== UPSTOX API SERVICE ====================
// Live market data integration with Upstox API v2

import type { StockQuote, CandleData } from '../types';
import { FO_STOCKS } from '../constants';

const BASE_URL = 'https://api.upstox.com/v2';

// API Response Types
interface UpstoxQuoteResponse {
  status: string;
  data: Record<string, UpstoxQuoteData>;
}

interface UpstoxQuoteData {
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
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

interface UpstoxCandleResponse {
  status: string;
  data: {
    candles: Array<[string, number, number, number, number, number, number]>;
  };
}

// Cache for API data
const quoteCache = new Map<string, { data: StockQuote; timestamp: number }>();
const candleCache = new Map<string, { data: CandleData[]; timestamp: number }>();
const QUOTE_CACHE_TTL = 5000; // 5 seconds
const CANDLE_CACHE_TTL = 30000; // 30 seconds

// Error tracking
let lastError: string | null = null;
let errorCount = 0;

export function getLastError(): string | null {
  return lastError;
}

export function clearError(): void {
  lastError = null;
  errorCount = 0;
}

// ==================== FETCH MARKET QUOTES ====================

export async function fetchMarketQuotes(token: string): Promise<StockQuote[]> {
  if (!token) {
    throw new Error('Access token is required');
  }

  try {
    // Build instrument keys string (max 500 per request)
    const instrumentKeys = FO_STOCKS.map(s => s.instrumentKey).join(',');
    
    const response = await fetch(
      `${BASE_URL}/market-quote/quotes?instrument_key=${encodeURIComponent(instrumentKeys)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401) {
        throw new Error('Invalid or expired access token. Please re-authenticate.');
      }
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const result: UpstoxQuoteResponse = await response.json();
    
    if (result.status !== 'success') {
      throw new Error('API returned non-success status');
    }

    const quotes: StockQuote[] = [];
    
    for (const stockInfo of FO_STOCKS) {
      const quoteData = result.data[stockInfo.instrumentKey];
      
      if (quoteData) {
        const prevClose = quoteData.ohlc.close || quoteData.last_price;
        const change = quoteData.last_price - prevClose;
        const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
        
        // Estimate average volume (would need historical data for accurate value)
        const avgVolume = quoteData.volume * 0.8; // Rough estimate
        
        const quote: StockQuote = {
          symbol: stockInfo.symbol,
          name: stockInfo.name,
          ltp: quoteData.last_price,
          open: quoteData.ohlc.open,
          high: quoteData.ohlc.high,
          low: quoteData.ohlc.low,
          close: quoteData.last_price,
          prevClose: prevClose,
          change: change,
          changePct: Math.round(changePct * 100) / 100,
          volume: quoteData.volume,
          avgVolume: avgVolume,
          volumeRatio: avgVolume > 0 ? Math.round((quoteData.volume / avgVolume) * 100) / 100 : 1,
          oi: quoteData.oi || 0,
          oiChange: 0, // Would need previous day OI
          oiChangePct: 0,
          sector: stockInfo.sector,
          lotSize: stockInfo.lotSize,
          instrumentKey: stockInfo.instrumentKey,
          futuresKey: `NSE_FO|${stockInfo.symbol}`,
          lastUpdated: Date.now(),
        };
        
        // Cache the quote
        quoteCache.set(stockInfo.symbol, { data: quote, timestamp: Date.now() });
        quotes.push(quote);
      }
    }

    lastError = null;
    errorCount = 0;
    return quotes;

  } catch (error) {
    errorCount++;
    lastError = error instanceof Error ? error.message : 'Unknown error fetching quotes';
    console.error('Upstox API Error:', lastError);
    throw error;
  }
}

// ==================== FETCH INTRADAY CANDLES ====================

export async function fetchIntradayCandles(
  token: string,
  instrumentKey: string,
  interval: '1minute' | '30minute' = '1minute'
): Promise<CandleData[]> {
  if (!token) {
    throw new Error('Access token is required');
  }

  // Check cache first
  const cacheKey = `${instrumentKey}-${interval}`;
  const cached = candleCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CANDLE_CACHE_TTL) {
    return cached.data;
  }

  try {
    const encodedKey = encodeURIComponent(instrumentKey);
    const response = await fetch(
      `${BASE_URL}/historical-candle/intraday/${encodedKey}/${interval}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const result: UpstoxCandleResponse = await response.json();
    
    if (result.status !== 'success' || !result.data?.candles) {
      throw new Error('Invalid candle data response');
    }

    // Transform candle data
    // Upstox format: [timestamp, open, high, low, close, volume, oi]
    const candles: CandleData[] = result.data.candles
      .map(candle => ({
        time: new Date(candle[0]).getTime() / 1000,
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
      }))
      .sort((a, b) => a.time - b.time); // Sort ascending

    // Cache the candles
    candleCache.set(cacheKey, { data: candles, timestamp: Date.now() });
    
    return candles;

  } catch (error) {
    lastError = error instanceof Error ? error.message : 'Unknown error fetching candles';
    console.error('Upstox Candle API Error:', lastError);
    throw error;
  }
}

// ==================== FETCH HISTORICAL CANDLES ====================

export async function fetchHistoricalCandles(
  token: string,
  instrumentKey: string,
  interval: '1minute' | '30minute' | 'day' = '30minute',
  fromDate: string,
  toDate: string
): Promise<CandleData[]> {
  if (!token) {
    throw new Error('Access token is required');
  }

  try {
    const encodedKey = encodeURIComponent(instrumentKey);
    const response = await fetch(
      `${BASE_URL}/historical-candle/${encodedKey}/${interval}/${toDate}/${fromDate}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const result: UpstoxCandleResponse = await response.json();
    
    if (result.status !== 'success' || !result.data?.candles) {
      return [];
    }

    const candles: CandleData[] = result.data.candles
      .map(candle => ({
        time: new Date(candle[0]).getTime() / 1000,
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
      }))
      .sort((a, b) => a.time - b.time);

    return candles;

  } catch (error) {
    console.error('Historical candle error:', error);
    return [];
  }
}

// ==================== VALIDATE TOKEN ====================

export async function validateToken(token: string): Promise<boolean> {
  if (!token || token.length < 10) {
    return false;
  }

  try {
    // Try to fetch a single quote to validate token
    const response = await fetch(
      `${BASE_URL}/market-quote/ltp?instrument_key=${encodeURIComponent('NSE_EQ|INE002A01018')}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401) {
      return false;
    }

    const result = await response.json();
    return result.status === 'success';

  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

// ==================== GET CACHED QUOTE ====================

export function getCachedQuote(symbol: string): StockQuote | null {
  const cached = quoteCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_TTL * 2) {
    return cached.data;
  }
  return null;
}

// ==================== CLEAR CACHE ====================

export function clearCache(): void {
  quoteCache.clear();
  candleCache.clear();
}
