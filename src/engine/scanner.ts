import type { StockQuote, CandleData, ScannerResult, SectorData, MarketBreadth } from '../types';
import { FO_STOCKS, SCORE_WEIGHTS } from '../constants';
import { fetchMarketQuotes, fetchIntradayCandles, getCachedQuote } from '../services/upstoxApi';
import {
  calcEMA, calcRSI, calcMACD, calcVWAP, calcATR, calcADX,
  calcMomentumScore, calcVolumeScore, calcTrendScore, calcOIScore,
} from './indicators';
import { findSupportResistance, generateTradeSignal } from './signals';

// ==================== DATA STORAGE ====================

const stockDataStore = new Map<string, {
  quote: StockQuote;
  candles: CandleData[];
  lastUpdate: number;
}>();

let lastScanResults: ScannerResult[] = [];
let isLiveMode = false;

// ==================== LIVE DATA SCANNER ====================

export async function runLiveScan(token: string): Promise<ScannerResult[]> {
  try {
    // Fetch live quotes from Upstox
    const quotes = await fetchMarketQuotes(token);
    isLiveMode = true;

    const results: ScannerResult[] = [];

    // Process each quote
    for (const quote of quotes) {
      // Try to get intraday candles for better analysis
      let candles: CandleData[] = [];
      try {
        candles = await fetchIntradayCandles(token, quote.instrumentKey, '1minute');
      } catch (e) {
        // If candle fetch fails, generate from quote data
        candles = generateCandlesFromQuote(quote);
      }

      // Store the data
      stockDataStore.set(quote.symbol, {
        quote,
        candles,
        lastUpdate: Date.now(),
      });

      // Analyze the stock
      const result = analyzeStock(quote, candles);
      results.push(result);
    }

    lastScanResults = results;
    return results;

  } catch (error) {
    console.error('Live scan error:', error);
    throw error;
  }
}

// ==================== SIMULATION SCANNER (Fallback) ====================

export function runSimulatedScan(): ScannerResult[] {
  isLiveMode = false;
  const results: ScannerResult[] = [];

  for (const stockInfo of FO_STOCKS) {
    const cached = stockDataStore.get(stockInfo.symbol);
    let candles: CandleData[];
    let quote: StockQuote;

    if (cached && Date.now() - cached.lastUpdate < 60000) {
      // Update existing data with slight variations
      candles = updateCandles(cached.candles);
      quote = updateQuote(cached.quote, candles);
    } else {
      // Generate new simulated data
      const base = getBasePrice(stockInfo.symbol);
      candles = generateSimulatedCandles(base);
      quote = generateSimulatedQuote(stockInfo, candles);
    }

    stockDataStore.set(stockInfo.symbol, {
      quote,
      candles,
      lastUpdate: Date.now(),
    });

    const result = analyzeStock(quote, candles);
    results.push(result);
  }

  lastScanResults = results;
  return results;
}

// ==================== COMBINED SCANNER ====================

export async function runFullScan(token?: string): Promise<ScannerResult[]> {
  if (token && token.length > 10) {
    try {
      return await runLiveScan(token);
    } catch (error) {
      console.warn('Live scan failed, falling back to simulation:', error);
      return runSimulatedScan();
    }
  }
  return runSimulatedScan();
}

// ==================== ANALYSIS ENGINE ====================

export function analyzeStock(stock: StockQuote, candles: CandleData[]): ScannerResult {
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);

  // Calculate indicators
  const ema9Arr = calcEMA(closes, 9);
  const ema20Arr = calcEMA(closes, 20);
  const ema9 = ema9Arr[ema9Arr.length - 1] || stock.ltp;
  const ema20 = ema20Arr[ema20Arr.length - 1] || stock.ltp;
  const rsi = calcRSI(closes);
  const macd = calcMACD(closes);
  const vwap = calcVWAP(highs, lows, closes, volumes);
  const atr = calcATR(highs, lows, closes);
  const adx = calcADX(highs, lows, closes);

  // Calculate scores
  const momentumScore = calcMomentumScore(
    stock.changePct, rsi, macd.histogram, adx,
    (stock.ltp - vwap) / vwap,
    (stock.ltp - ema9) / ema9,
    (stock.ltp - ema20) / ema20,
  );

  const volumeScore = calcVolumeScore(stock.volumeRatio, stock.changePct);
  const trendScore = calcTrendScore(ema9, ema20, stock.ltp, adx);
  const oiScore = calcOIScore(stock.oiChangePct, stock.changePct);

  // Relative strength (vs NIFTY proxy)
  const relativeStrength = 50 + stock.changePct * 10 + (stock.volumeRatio - 1) * 5;

  // Sector score based on sector performance
  const sectorScore = calculateSectorScore(stock.sector);

  // Composite score
  const compositeScore = Math.min(100, Math.max(0,
    momentumScore * SCORE_WEIGHTS.momentum +
    volumeScore * SCORE_WEIGHTS.volume +
    trendScore * SCORE_WEIGHTS.trend +
    Math.min(100, Math.max(0, relativeStrength)) * SCORE_WEIGHTS.relativeStrength +
    oiScore * SCORE_WEIGHTS.oi +
    sectorScore * SCORE_WEIGHTS.sector +
    (momentumScore * 0.5 + trendScore * 0.5) * SCORE_WEIGHTS.pattern +
    (momentumScore * 0.4 + volumeScore * 0.3 + trendScore * 0.3) * SCORE_WEIGHTS.timing
  ));

  const macdSignal: 'bullish' | 'bearish' | 'neutral' =
    macd.histogram > 0.5 ? 'bullish' : macd.histogram < -0.5 ? 'bearish' : 'neutral';

  // Support/Resistance
  const levels = findSupportResistance(candles, stock.ltp);

  const result: ScannerResult = {
    stock,
    signal: null,
    momentumScore,
    relativeStrength: Math.min(100, Math.max(0, relativeStrength)),
    volumeScore,
    trendScore,
    oiScore,
    sectorScore,
    compositeScore,
    levels,
    vwap,
    ema9,
    ema20,
    rsi,
    atr,
    macdSignal,
  };

  // Generate trade signal
  result.signal = generateTradeSignal(result);

  return result;
}

// ==================== HELPER FUNCTIONS ====================

export function getStockCandles(symbol: string): CandleData[] {
  const stored = stockDataStore.get(symbol);
  return stored?.candles || [];
}

export function getStockQuote(symbol: string): StockQuote | null {
  const stored = stockDataStore.get(symbol);
  return stored?.quote || getCachedQuote(symbol);
}

export function isUsingLiveData(): boolean {
  return isLiveMode;
}

export function getLastScanResults(): ScannerResult[] {
  return lastScanResults;
}

// ==================== MARKET BREADTH & SECTORS ====================

export function generateMarketBreadth(results: ScannerResult[]): MarketBreadth {
  const advancing = results.filter(r => r.stock.changePct > 0).length;
  const declining = results.filter(r => r.stock.changePct < 0).length;
  const unchanged = results.length - advancing - declining;
  const totalVolume = results.reduce((a, r) => a + r.stock.volume, 0);
  
  // PCR estimation from OI data
  const avgOIChange = results.reduce((a, r) => a + r.stock.oiChangePct, 0) / results.length;
  const putCallRatio = 0.85 + (avgOIChange > 0 ? 0.1 : -0.1) + Math.random() * 0.2;
  
  // VIX estimation from volatility
  const avgVolatility = results.reduce((a, r) => a + Math.abs(r.stock.changePct), 0) / results.length;
  const vixLevel = 12 + avgVolatility * 3;

  return {
    advancing,
    declining,
    unchanged,
    totalVolume,
    putCallRatio: Math.round(putCallRatio * 100) / 100,
    vixLevel: Math.round(vixLevel * 100) / 100,
    marketTrend: advancing > declining * 1.2 ? 'bullish' :
      declining > advancing * 1.2 ? 'bearish' : 'neutral',
  };
}

export function generateSectorData(results: ScannerResult[]): SectorData[] {
  const sectorMap = new Map<string, ScannerResult[]>();
  for (const r of results) {
    const existing = sectorMap.get(r.stock.sector) || [];
    existing.push(r);
    sectorMap.set(r.stock.sector, existing);
  }

  return [...sectorMap.entries()].map(([name, stocks]) => {
    const avgChange = stocks.reduce((a, s) => a + s.stock.changePct, 0) / stocks.length;
    const avgMomentum = stocks.reduce((a, s) => a + s.momentumScore, 0) / stocks.length;
    const avgVolRatio = stocks.reduce((a, s) => a + s.stock.volumeRatio, 0) / stocks.length;
    
    return {
      name,
      change: Math.round(avgChange * 100) / 100,
      stocks: stocks.map(s => s.stock.symbol),
      avgMomentum: Math.round(avgMomentum),
      moneyFlow: avgVolRatio > 1.2 && avgChange > 0 ? 'inflow' as const :
        avgVolRatio > 1.2 && avgChange < 0 ? 'outflow' as const : 'neutral' as const,
    };
  }).sort((a, b) => b.change - a.change);
}

function calculateSectorScore(sector: string): number {
  const sectorResults = lastScanResults.filter(r => r.stock.sector === sector);
  if (sectorResults.length === 0) return 50;
  
  const avgChange = sectorResults.reduce((a, r) => a + r.stock.changePct, 0) / sectorResults.length;
  return Math.min(100, Math.max(0, 50 + avgChange * 10));
}

// ==================== SIMULATION HELPERS ====================

const baseValues = new Map<string, number>();

function getBasePrice(symbol: string): number {
  if (!baseValues.has(symbol)) {
    const prices: Record<string, number> = {
      RELIANCE: 2450, TCS: 3600, HDFCBANK: 1650, INFY: 1520, ICICIBANK: 1180,
      HINDUNILVR: 2350, SBIN: 780, BHARTIARTL: 1550, KOTAKBANK: 1780, ITC: 430,
      LT: 3400, AXISBANK: 1100, WIPRO: 480, BAJFINANCE: 6800, HCLTECH: 1580,
      ASIANPAINT: 2800, MARUTI: 12000, SUNPHARMA: 1700, TATAMOTORS: 650, TITAN: 3200,
      ULTRACEMCO: 10500, BAJAJFINSV: 1600, NESTLEIND: 2350, ONGC: 260, NTPC: 350,
      TATASTEEL: 145, POWERGRID: 310, TECHM: 1550, JSWSTEEL: 880, ADANIENT: 2800,
      INDUSINDBK: 980, DRREDDY: 6200, CIPLA: 1500, EICHERMOT: 4600, DIVISLAB: 5800,
      BPCL: 320, APOLLOHOSP: 6500, TATACONSUM: 1050, HEROMOTOCO: 4800, COALINDIA: 420,
      GRASIM: 2600, BRITANNIA: 5200, SBILIFE: 1500, HINDALCO: 600, VEDL: 440,
      BANKBARODA: 240, 'M&M': 2800, HDFC: 640, DLF: 850, PNB: 105,
    };
    baseValues.set(symbol, prices[symbol] || 1000 + Math.random() * 2000);
  }
  return baseValues.get(symbol)!;
}

function generateSimulatedCandles(base: number): CandleData[] {
  const candles: CandleData[] = [];
  const now = new Date();
  const marketOpen = new Date(now);
  marketOpen.setHours(9, 15, 0, 0);

  let price = base * (0.99 + Math.random() * 0.02);
  const trend = (Math.random() - 0.45) * 0.002;
  const vol = base * 0.008;

  const minutesElapsed = Math.min(375, Math.max(0,
    (now.getTime() - marketOpen.getTime()) / 60000
  ));
  const numCandles = Math.max(20, Math.floor(minutesElapsed / 5));

  for (let i = 0; i < numCandles; i++) {
    const drift = trend + (Math.random() - 0.5) * vol / base;
    const open = price;
    const move1 = price * (1 + (Math.random() - 0.5) * vol / base);
    const move2 = price * (1 + drift);
    const high = Math.max(open, move1, move2) * (1 + Math.random() * 0.002);
    const low = Math.min(open, move1, move2) * (1 - Math.random() * 0.002);
    const close = move2;
    price = close;

    const time = marketOpen.getTime() / 1000 + i * 300;
    const volume = Math.floor(50000 + Math.random() * 200000) * (1 + Math.random());

    candles.push({ time, open, high, low, close, volume });
  }

  return candles;
}

function generateSimulatedQuote(info: typeof FO_STOCKS[0], candles: CandleData[]): StockQuote {
  const base = getBasePrice(info.symbol);
  const last = candles[candles.length - 1];
  const first = candles[0];
  const prevClose = base * (0.995 + Math.random() * 0.01);

  const high = Math.max(...candles.map(c => c.high));
  const low = Math.min(...candles.map(c => c.low));
  const totalVol = candles.reduce((a, c) => a + c.volume, 0);
  const avgVol = totalVol * (0.6 + Math.random() * 0.8);
  const change = last.close - prevClose;
  const changePct = (change / prevClose) * 100;

  const oiBase = info.lotSize * (5000 + Math.random() * 20000);
  const oiChange = oiBase * (Math.random() - 0.4) * 0.1;

  return {
    symbol: info.symbol,
    name: info.name,
    ltp: Math.round(last.close * 100) / 100,
    open: Math.round(first.open * 100) / 100,
    high: Math.round(high * 100) / 100,
    low: Math.round(low * 100) / 100,
    close: Math.round(last.close * 100) / 100,
    prevClose: Math.round(prevClose * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
    volume: Math.round(totalVol),
    avgVolume: Math.round(avgVol),
    volumeRatio: Math.round((totalVol / avgVol) * 100) / 100,
    oi: Math.round(oiBase),
    oiChange: Math.round(oiChange),
    oiChangePct: Math.round((oiChange / oiBase) * 10000) / 100,
    sector: info.sector,
    lotSize: info.lotSize,
    instrumentKey: info.instrumentKey,
    futuresKey: `NSE_FO|${info.symbol}`,
    lastUpdated: Date.now(),
  };
}

function updateCandles(candles: CandleData[]): CandleData[] {
  return candles.map((c, i) => {
    if (i === candles.length - 1) {
      const delta = c.close * (Math.random() - 0.5) * 0.003;
      const newClose = c.close + delta;
      return {
        ...c,
        close: newClose,
        high: Math.max(c.high, newClose),
        low: Math.min(c.low, newClose),
      };
    }
    return c;
  });
}

function updateQuote(quote: StockQuote, candles: CandleData[]): StockQuote {
  const last = candles[candles.length - 1];
  const change = last.close - quote.prevClose;
  const changePct = (change / quote.prevClose) * 100;

  return {
    ...quote,
    ltp: Math.round(last.close * 100) / 100,
    close: Math.round(last.close * 100) / 100,
    high: Math.round(Math.max(...candles.map(c => c.high)) * 100) / 100,
    low: Math.round(Math.min(...candles.map(c => c.low)) * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
    lastUpdated: Date.now(),
  };
}

function generateCandlesFromQuote(quote: StockQuote): CandleData[] {
  // Generate minimal candles from OHLC data when intraday fetch fails
  const now = Date.now() / 1000;
  return [{
    time: now - 300,
    open: quote.open,
    high: quote.high,
    low: quote.low,
    close: quote.ltp,
    volume: quote.volume,
  }];
}
