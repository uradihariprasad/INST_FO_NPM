import type { StockQuote, CandleData, ScannerResult, SectorData, MarketBreadth } from '../types';
import { FO_STOCKS, SCORE_WEIGHTS } from '../constants';
import { fetchMarketQuotes, fetchCandlesBatch } from '../services/upstoxApi';
import {
  calcEMA, calcRSI, calcMACD, calcVWAP, calcATR, calcADX,
  calcMomentumScore, calcVolumeScore, calcTrendScore, calcOIScore,
} from './indicators';
import { findSupportResistance, generateTradeSignal } from './signals';

// ==================== GLOBAL DATA STORE ====================

const dataStore = new Map<string, {
  quote: StockQuote;
  candles: CandleData[];
  lastUpdate: number;
}>();

let cachedResults: ScannerResult[] = [];
let liveMode = false;
let liveError: string | null = null;

export function isUsingLiveData(): boolean { return liveMode; }
export function getLiveError(): string | null { return liveError; }
export function getStockCandles(symbol: string): CandleData[] {
  return dataStore.get(symbol)?.candles ?? [];
}
export function getStockQuote(symbol: string): StockQuote | null {
  return dataStore.get(symbol)?.quote ?? null;
}

// ==================== MAIN ENTRY: RUN FULL SCAN ====================

export async function runFullScan(token?: string): Promise<ScannerResult[]> {
  liveError = null;

  // --- LIVE MODE ---
  if (token && token.length > 10) {
    try {
      const quotes = await fetchMarketQuotes(token);
      if (quotes.length === 0) {
        throw new Error('Upstox returned 0 quotes — check instrument keys');
      }

      liveMode = true;

      // Fetch candles for the top-scoring stocks only (to avoid rate limits)
      // First pass: analyze with synthetic candles so we can rank
      const firstPass: ScannerResult[] = [];
      for (const q of quotes) {
        const existing = dataStore.get(q.symbol);
        const candles = existing?.candles?.length ? existing.candles : buildSyntheticCandles(q);
        dataStore.set(q.symbol, { quote: q, candles, lastUpdate: Date.now() });
        firstPass.push(analyzeStock(q, candles));
      }

      // Pick top 5 for live candle fetch (avoids rate limit)
      const topSymbols = [...firstPass]
        .sort((a, b) => b.compositeScore - a.compositeScore)
        .slice(0, 5)
        .map(r => ({ symbol: r.stock.symbol, instrumentKey: r.stock.instrumentKey }));

      const candleMap = await fetchCandlesBatch(token, topSymbols, 5);

      // Merge live candles into store
      for (const [sym, candles] of candleMap) {
        const entry = dataStore.get(sym);
        if (entry) {
          dataStore.set(sym, { ...entry, candles });
        }
      }

      // Final analysis pass with real candles where available
      const results: ScannerResult[] = [];
      for (const q of quotes) {
        const entry = dataStore.get(q.symbol)!;
        results.push(analyzeStock(entry.quote, entry.candles));
      }

      cachedResults = results;
      return results;

    } catch (err) {
      liveError = err instanceof Error ? err.message : String(err);
      console.warn('[Scanner] Live scan failed:', liveError, '→ fallback');
      // fall through to simulation
    }
  }

  // --- SIMULATED MODE ---
  liveMode = false;
  return runSimulation();
}

// ==================== ANALYSIS ENGINE ====================

export function analyzeStock(stock: StockQuote, candles: CandleData[]): ScannerResult {
  if (candles.length === 0) {
    candles = buildSyntheticCandles(stock);
  }

  const closes = candles.map(c => c.close);
  const highs  = candles.map(c => c.high);
  const lows   = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);

  const ema9  = last(calcEMA(closes, 9))  ?? stock.ltp;
  const ema20 = last(calcEMA(closes, 20)) ?? stock.ltp;
  const rsi   = calcRSI(closes);
  const macd  = calcMACD(closes);
  const vwap  = calcVWAP(highs, lows, closes, volumes);
  const atr   = calcATR(highs, lows, closes);
  const adx   = calcADX(highs, lows, closes);

  const momentumScore = calcMomentumScore(
    stock.changePct, rsi, macd.histogram, adx,
    safeDivide(stock.ltp - vwap, vwap),
    safeDivide(stock.ltp - ema9, ema9),
    safeDivide(stock.ltp - ema20, ema20),
  );
  const volumeScore   = calcVolumeScore(stock.volumeRatio, stock.changePct);
  const trendScore    = calcTrendScore(ema9, ema20, stock.ltp, adx);
  const oiScore       = calcOIScore(stock.oiChangePct, stock.changePct);
  const relativeStrength = clamp(50 + stock.changePct * 10 + (stock.volumeRatio - 1) * 5, 0, 100);
  const sectorScore   = sectorAvg(stock.sector);

  const compositeScore = clamp(
    momentumScore  * SCORE_WEIGHTS.momentum +
    volumeScore    * SCORE_WEIGHTS.volume +
    trendScore     * SCORE_WEIGHTS.trend +
    relativeStrength * SCORE_WEIGHTS.relativeStrength +
    oiScore        * SCORE_WEIGHTS.oi +
    sectorScore    * SCORE_WEIGHTS.sector +
    ((momentumScore + trendScore) / 2)   * SCORE_WEIGHTS.pattern +
    ((momentumScore * 0.4 + volumeScore * 0.3 + trendScore * 0.3)) * SCORE_WEIGHTS.timing,
    0, 100,
  );

  const macdSignal: 'bullish' | 'bearish' | 'neutral' =
    macd.histogram > 0.5 ? 'bullish' : macd.histogram < -0.5 ? 'bearish' : 'neutral';

  const levels = findSupportResistance(candles, stock.ltp);

  const result: ScannerResult = {
    stock, signal: null,
    momentumScore, relativeStrength, volumeScore, trendScore,
    oiScore, sectorScore, compositeScore,
    levels, vwap, ema9, ema20, rsi, atr, macdSignal,
  };
  result.signal = generateTradeSignal(result);
  return result;
}

// ==================== SYNTHETIC CANDLES ====================
// When live candles aren't available, build ≥ 30 candles from OHLC
// so the indicators have enough data points to work.

function buildSyntheticCandles(q: StockQuote): CandleData[] {
  const candles: CandleData[] = [];
  const now = new Date();
  const open915 = new Date(now);
  open915.setHours(9, 15, 0, 0);

  const totalMinutes = Math.max(30, Math.min(375,
    Math.floor((now.getTime() - open915.getTime()) / 60000)));
  const numCandles = Math.max(30, Math.floor(totalMinutes / 5));
  const step = (q.ltp - q.open) / numCandles;
  const range = q.high - q.low;
  const avgVol = q.volume > 0 ? q.volume / numCandles : 10000;

  for (let i = 0; i < numCandles; i++) {
    const t = i / numCandles;
    // Price path: open → ltp with noise via high/low range
    const noise = (Math.random() - 0.5) * range * 0.15;
    const base = q.open + step * i + noise;
    const o = i === 0 ? q.open : candles[i - 1].close;
    const c = i === numCandles - 1 ? q.ltp : base;
    const h = Math.max(o, c) + Math.random() * range * 0.05;
    const l = Math.min(o, c) - Math.random() * range * 0.05;

    // Volume: heavier at open and close
    const volMult = (t < 0.1 || t > 0.85) ? 1.8 : (0.6 + Math.random() * 0.8);

    candles.push({
      time: open915.getTime() / 1000 + i * 300,
      open: r2(o), high: r2(h), low: r2(l), close: r2(c),
      volume: Math.round(avgVol * volMult),
    });
  }
  return candles;
}

// ==================== SIMULATION FALLBACK ====================

function runSimulation(): ScannerResult[] {
  const results: ScannerResult[] = [];

  for (const info of FO_STOCKS) {
    const prev = dataStore.get(info.symbol);
    let candles: CandleData[];
    let quote: StockQuote;

    if (prev && Date.now() - prev.lastUpdate < 60000) {
      candles = tickCandles(prev.candles);
      quote  = tickQuote(prev.quote, candles);
    } else {
      const base = PRICES[info.symbol] ?? (800 + Math.random() * 3000);
      candles = simCandles(base);
      quote   = simQuote(info, candles);
    }

    dataStore.set(info.symbol, { quote, candles, lastUpdate: Date.now() });
    results.push(analyzeStock(quote, candles));
  }

  cachedResults = results;
  return results;
}

// ==================== MARKET BREADTH / SECTOR ====================

export function generateMarketBreadth(results: ScannerResult[]): MarketBreadth {
  const adv = results.filter(r => r.stock.changePct > 0).length;
  const dec = results.filter(r => r.stock.changePct < 0).length;
  const unc = results.length - adv - dec;
  const totalVol = results.reduce((s, r) => s + r.stock.volume, 0);
  const avgVol = results.reduce((s, r) => s + Math.abs(r.stock.changePct), 0) / results.length;
  const pcr = 0.8 + (adv > dec ? 0.15 : -0.15) + Math.random() * 0.15;
  return {
    advancing: adv, declining: dec, unchanged: unc, totalVolume: totalVol,
    putCallRatio: r2(pcr),
    vixLevel: r2(12 + avgVol * 3),
    marketTrend: adv > dec * 1.2 ? 'bullish' : dec > adv * 1.2 ? 'bearish' : 'neutral',
  };
}

export function generateSectorData(results: ScannerResult[]): SectorData[] {
  const m = new Map<string, ScannerResult[]>();
  for (const r of results) {
    (m.get(r.stock.sector) ?? (m.set(r.stock.sector, []), m.get(r.stock.sector)!)).push(r);
  }
  return [...m.entries()].map(([name, arr]) => {
    const avg = arr.reduce((s, r) => s + r.stock.changePct, 0) / arr.length;
    const mom = arr.reduce((s, r) => s + r.momentumScore, 0) / arr.length;
    const vr  = arr.reduce((s, r) => s + r.stock.volumeRatio, 0) / arr.length;
    return {
      name, change: r2(avg), stocks: arr.map(r => r.stock.symbol),
      avgMomentum: Math.round(mom),
      moneyFlow: (vr > 1.2 && avg > 0) ? 'inflow' as const
               : (vr > 1.2 && avg < 0) ? 'outflow' as const
               : 'neutral' as const,
    };
  }).sort((a, b) => b.change - a.change);
}

// ==================== UTILS ====================

function last<T>(arr: T[]): T | undefined { return arr[arr.length - 1]; }
function r2(n: number) { return Math.round(n * 100) / 100; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function safeDivide(a: number, b: number) { return b === 0 ? 0 : a / b; }

function sectorAvg(sector: string): number {
  const peers = cachedResults.filter(r => r.stock.sector === sector);
  if (!peers.length) return 50;
  return clamp(50 + peers.reduce((s, r) => s + r.stock.changePct, 0) / peers.length * 10, 0, 100);
}

// ==================== SIMULATION HELPERS ====================

const PRICES: Record<string, number> = {
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

function simCandles(base: number): CandleData[] {
  const out: CandleData[] = [];
  const o = new Date(); o.setHours(9, 15, 0, 0);
  let p = base * (0.99 + Math.random() * 0.02);
  const trend = (Math.random() - 0.45) * 0.002;
  const vol = base * 0.008;
  for (let i = 0; i < 60; i++) {
    const d = trend + (Math.random() - 0.5) * vol / base;
    const op = p; const m1 = p * (1 + (Math.random() - 0.5) * vol / base); const cl = p * (1 + d);
    out.push({ time: o.getTime() / 1000 + i * 300, open: r2(op),
      high: r2(Math.max(op, m1, cl) * (1 + Math.random() * 0.002)),
      low: r2(Math.min(op, m1, cl) * (1 - Math.random() * 0.002)),
      close: r2(cl), volume: Math.floor((50000 + Math.random() * 200000) * (1 + Math.random())) });
    p = cl;
  }
  return out;
}

function simQuote(info: typeof FO_STOCKS[0], c: CandleData[]): StockQuote {
  const base = PRICES[info.symbol] ?? 1000;
  const l = c[c.length - 1]; const f = c[0];
  const pc = base * (0.995 + Math.random() * 0.01);
  const h = Math.max(...c.map(x => x.high)); const lo = Math.min(...c.map(x => x.low));
  const tv = c.reduce((s, x) => s + x.volume, 0); const av = tv * (0.6 + Math.random() * 0.8);
  const ch = l.close - pc; const cp = (ch / pc) * 100;
  const ob = info.lotSize * (5000 + Math.random() * 20000);
  const oc = ob * (Math.random() - 0.4) * 0.1;
  return {
    symbol: info.symbol, name: info.name, ltp: r2(l.close), open: r2(f.open),
    high: r2(h), low: r2(lo), close: r2(l.close), prevClose: r2(pc),
    change: r2(ch), changePct: r2(cp), volume: Math.round(tv),
    avgVolume: Math.round(av), volumeRatio: r2(tv / av),
    oi: Math.round(ob), oiChange: Math.round(oc), oiChangePct: r2(oc / ob * 100),
    sector: info.sector, lotSize: info.lotSize,
    instrumentKey: info.instrumentKey, futuresKey: `NSE_FO|${info.symbol}`,
    lastUpdated: Date.now(),
  };
}

function tickCandles(c: CandleData[]): CandleData[] {
  return c.map((x, i) => {
    if (i !== c.length - 1) return x;
    const d = x.close * (Math.random() - 0.5) * 0.003;
    const nc = x.close + d;
    return { ...x, close: nc, high: Math.max(x.high, nc), low: Math.min(x.low, nc) };
  });
}

function tickQuote(q: StockQuote, c: CandleData[]): StockQuote {
  const l = c[c.length - 1];
  const ch = l.close - q.prevClose;
  return { ...q, ltp: r2(l.close), close: r2(l.close), change: r2(ch),
    changePct: r2((ch / q.prevClose) * 100),
    high: r2(Math.max(...c.map(x => x.high))),
    low: r2(Math.min(...c.map(x => x.low))),
    lastUpdated: Date.now() };
}
