import type { SupportResistance, TradeSignal, CandleData, ScannerResult } from '../types';
import { detectPivotPoints } from './indicators';

// ==================== SUPPORT / RESISTANCE ENGINE ====================

export function findSupportResistance(candles: CandleData[], ltp: number): SupportResistance[] {
  const levels: SupportResistance[] = [];
  if (candles.length < 5) return levels;

  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);

  // 1. Pivot Points
  const pivots = detectPivotPoints(highs, lows, closes);
  const pivotLevels = [
    { price: pivots.r3, type: 'resistance' as const, source: 'pivot-R3' },
    { price: pivots.r2, type: 'resistance' as const, source: 'pivot-R2' },
    { price: pivots.r1, type: 'resistance' as const, source: 'pivot-R1' },
    { price: pivots.pp, type: ltp < pivots.pp ? 'resistance' as const : 'support' as const, source: 'pivot-PP' },
    { price: pivots.s1, type: 'support' as const, source: 'pivot-S1' },
    { price: pivots.s2, type: 'support' as const, source: 'pivot-S2' },
    { price: pivots.s3, type: 'support' as const, source: 'pivot-S3' },
  ];

  for (const pl of pivotLevels) {
    const dist = Math.abs(pl.price - ltp) / ltp;
    if (dist < 0.05) { // within 5%
      levels.push({
        price: pl.price,
        type: pl.type,
        strength: Math.max(20, Math.min(90, 70 - dist * 1000)),
        source: pl.source,
        touches: 1,
      });
    }
  }

  // 2. Swing highs and lows (fractal-based)
  const tolerance = ltp * 0.003; // 0.3% tolerance for clustering
  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  for (let i = 2; i < candles.length - 2; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] &&
        highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
      swingHighs.push(highs[i]);
    }
    if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] &&
        lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
      swingLows.push(lows[i]);
    }
  }

  // Cluster nearby swing levels
  const clusterSwings = (swings: number[], type: 'support' | 'resistance') => {
    const clusters: { price: number; count: number }[] = [];
    for (const s of swings) {
      const existing = clusters.find(c => Math.abs(c.price - s) < tolerance);
      if (existing) {
        existing.price = (existing.price * existing.count + s) / (existing.count + 1);
        existing.count++;
      } else {
        clusters.push({ price: s, count: 1 });
      }
    }
    for (const c of clusters) {
      const dist = Math.abs(c.price - ltp) / ltp;
      if (dist < 0.05) {
        levels.push({
          price: c.price,
          type,
          strength: Math.min(95, 40 + c.count * 15),
          source: 'swing',
          touches: c.count,
        });
      }
    }
  };

  clusterSwings(swingHighs, 'resistance');
  clusterSwings(swingLows, 'support');

  // 3. Volume-weighted levels (VPOC-style)
  const priceVolMap = new Map<number, number>();
  const bucketSize = ltp * 0.002; // 0.2% bucket
  for (let i = 0; i < candles.length; i++) {
    const bucket = Math.round(closes[i] / bucketSize) * bucketSize;
    priceVolMap.set(bucket, (priceVolMap.get(bucket) || 0) + volumes[i]);
  }

  const sortedPV = [...priceVolMap.entries()].sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < Math.min(3, sortedPV.length); i++) {
    const [price, vol] = sortedPV[i];
    const maxVol = sortedPV[0][1];
    const dist = Math.abs(price - ltp) / ltp;
    if (dist < 0.04 && dist > 0.002) {
      levels.push({
        price,
        type: price < ltp ? 'support' : 'resistance',
        strength: Math.min(85, Math.round((vol / maxVol) * 80)),
        source: 'volume',
        touches: 0,
      });
    }
  }

  // 4. Round number levels
  const roundLevel = Math.round(ltp / 50) * 50;
  for (const mult of [-100, -50, 0, 50, 100]) {
    const price = roundLevel + mult;
    const dist = Math.abs(price - ltp) / ltp;
    if (dist < 0.03 && dist > 0.002) {
      levels.push({
        price,
        type: price < ltp ? 'support' : 'resistance',
        strength: 35,
        source: 'round-number',
        touches: 0,
      });
    }
  }

  // Deduplicate and merge nearby levels
  const merged: SupportResistance[] = [];
  const sorted = levels.sort((a, b) => a.price - b.price);
  for (const level of sorted) {
    const existing = merged.find(m =>
      Math.abs(m.price - level.price) / ltp < 0.003 && m.type === level.type
    );
    if (existing) {
      existing.strength = Math.min(100, existing.strength + level.strength * 0.3);
      existing.touches += level.touches;
      if (level.source !== existing.source) {
        existing.source += '+' + level.source;
      }
    } else {
      merged.push({ ...level });
    }
  }

  return merged.sort((a, b) => b.strength - a.strength).slice(0, 10);
}

// ==================== TRADE SIGNAL GENERATOR ====================

export function generateTradeSignal(result: ScannerResult): TradeSignal | null {
  const { stock, momentumScore, volumeScore, trendScore, compositeScore, levels, vwap, atr, rsi } = result;
  const { ltp, changePct, symbol } = stock;

  // Need minimum composite score to generate a signal
  if (compositeScore < 55) return null;

  const direction: 'LONG' | 'SHORT' = compositeScore >= 55 && changePct >= 0 ? 'LONG' :
    compositeScore >= 55 && changePct < 0 ? 'SHORT' : 'LONG';

  // Find nearest support and resistance
  const supports = levels.filter(l => l.type === 'support' && l.price < ltp).sort((a, b) => b.price - a.price);
  const resistances = levels.filter(l => l.type === 'resistance' && l.price > ltp).sort((a, b) => a.price - b.price);

  const nearestSupport = supports[0]?.price || (ltp - atr * 1.5);
  const nearestResistance = resistances[0]?.price || (ltp + atr * 1.5);

  let entry: number, stopLoss: number, target1: number, target2: number, target3: number;

  if (direction === 'LONG') {
    entry = ltp;
    stopLoss = Math.max(nearestSupport - atr * 0.3, ltp - atr * 2);
    const risk = entry - stopLoss;
    target1 = entry + risk * 1.5;
    target2 = Math.min(nearestResistance, entry + risk * 2.5);
    target3 = entry + risk * 3.5;
  } else {
    entry = ltp;
    stopLoss = Math.min(nearestResistance + atr * 0.3, ltp + atr * 2);
    const risk = stopLoss - entry;
    target1 = entry - risk * 1.5;
    target2 = Math.max(nearestSupport, entry - risk * 2.5);
    target3 = entry - risk * 3.5;
  }

  const riskReward = direction === 'LONG'
    ? (target2 - entry) / (entry - stopLoss)
    : (entry - target2) / (stopLoss - entry);

  // Score calculations
  const entryScore = calcEntryQuality(ltp, vwap, supports, resistances, direction, rsi);
  const exitScore = calcExitQuality(riskReward, resistances, supports, direction);
  const timingScore = calcTimingScore(momentumScore, volumeScore, trendScore);

  const confidence = Math.round(
    entryScore * 0.35 + exitScore * 0.25 + timingScore * 0.25 + (compositeScore * 0.15)
  );

  const reasons = generateReasons(result, direction, riskReward);

  return {
    symbol,
    direction,
    entry: round2(entry),
    target1: round2(target1),
    target2: round2(target2),
    target3: round2(target3),
    stopLoss: round2(stopLoss),
    riskReward: round2(riskReward),
    confidence: Math.min(95, Math.max(15, confidence)),
    entryScore: Math.min(100, Math.max(0, Math.round(entryScore))),
    exitScore: Math.min(100, Math.max(0, Math.round(exitScore))),
    timingScore: Math.min(100, Math.max(0, Math.round(timingScore))),
    overallScore: Math.min(100, Math.max(0, Math.round(compositeScore))),
    reasons,
    timestamp: Date.now(),
  };
}

function calcEntryQuality(
  ltp: number, vwap: number,
  supports: SupportResistance[],
  resistances: SupportResistance[],
  direction: 'LONG' | 'SHORT',
  rsi: number,
): number {
  let score = 50;

  if (direction === 'LONG') {
    // Near support = better entry
    if (supports.length > 0) {
      const dist = (ltp - supports[0].price) / ltp * 100;
      if (dist < 1) score += 20;
      else if (dist < 2) score += 10;
    }
    // Above VWAP = confirmation
    if (ltp > vwap) score += 10;
    // RSI not overbought
    if (rsi < 70) score += 5;
    if (rsi < 50) score += 5;
  } else {
    if (resistances.length > 0) {
      const dist = (resistances[0].price - ltp) / ltp * 100;
      if (dist < 1) score += 20;
      else if (dist < 2) score += 10;
    }
    if (ltp < vwap) score += 10;
    if (rsi > 30) score += 5;
    if (rsi > 50) score += 5;
  }

  return score;
}

function calcExitQuality(
  rr: number,
  resistances: SupportResistance[],
  supports: SupportResistance[],
  direction: 'LONG' | 'SHORT',
): number {
  let score = 50;

  // Risk-reward ratio
  if (rr > 3) score += 25;
  else if (rr > 2) score += 15;
  else if (rr > 1.5) score += 5;
  else if (rr < 1) score -= 15;

  // Clear target levels
  const targets = direction === 'LONG' ? resistances : supports;
  if (targets.length >= 2) score += 10;
  if (targets.length >= 1) score += 5;

  return score;
}

function calcTimingScore(momentum: number, volume: number, trend: number): number {
  // Timing is good when multiple factors align
  const avg = (momentum + volume + trend) / 3;
  let bonus = 0;

  if (momentum > 60 && volume > 60 && trend > 60) bonus = 15;
  else if (momentum > 50 && volume > 50) bonus = 5;

  return Math.min(100, avg + bonus);
}

function generateReasons(result: ScannerResult, direction: 'LONG' | 'SHORT', rr: number): string[] {
  const reasons: string[] = [];
  const { momentumScore, volumeScore, trendScore, oiScore, rsi, vwap, stock, macdSignal, ema9, ema20 } = result;

  if (momentumScore > 65) reasons.push(`Strong ${direction === 'LONG' ? 'bullish' : 'bearish'} momentum (${Math.round(momentumScore)})`);
  if (volumeScore > 65) reasons.push(`High volume confirmation (${Math.round(volumeScore)})`);
  if (trendScore > 65) reasons.push(`Clear trend alignment (${Math.round(trendScore)})`);
  if (oiScore > 60) reasons.push(`OI confirms ${direction === 'LONG' ? 'long buildup' : 'short buildup'}`);

  if (direction === 'LONG') {
    if (stock.ltp > vwap) reasons.push('Trading above VWAP');
    if (stock.ltp > ema9 && ema9 > ema20) reasons.push('Bullish EMA alignment');
    if (rsi > 50 && rsi < 70) reasons.push(`RSI in bullish zone (${Math.round(rsi)})`);
    if (macdSignal === 'bullish') reasons.push('MACD bullish crossover');
  } else {
    if (stock.ltp < vwap) reasons.push('Trading below VWAP');
    if (stock.ltp < ema9 && ema9 < ema20) reasons.push('Bearish EMA alignment');
    if (rsi < 50 && rsi > 30) reasons.push(`RSI in bearish zone (${Math.round(rsi)})`);
    if (macdSignal === 'bearish') reasons.push('MACD bearish crossover');
  }

  if (rr > 2) reasons.push(`Favorable R:R ratio (${rr.toFixed(1)}:1)`);
  if (stock.volumeRatio > 1.5) reasons.push(`Volume ${stock.volumeRatio.toFixed(1)}x above average`);

  return reasons.slice(0, 6);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
