// ==================== TECHNICAL INDICATOR CALCULATIONS ====================

export function calcEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  if (data.length === 0) return result;
  const k = 2 / (period + 1);
  result[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    result[i] = data[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

export function calcSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result[i] = NaN;
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result[i] = sum / period;
  }
  return result;
}

export function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - 100 / (1 + rs);
}

export function calcMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  if (closes.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine[i] = ema12[i] - ema26[i];
  }
  const signalLine = calcEMA(macdLine, 9);
  const lastIdx = closes.length - 1;
  const macd = macdLine[lastIdx];
  const signal = signalLine[lastIdx];
  return { macd, signal, histogram: macd - signal };
}

export function calcVWAP(highs: number[], lows: number[], closes: number[], volumes: number[]): number {
  let cumTPV = 0, cumVol = 0;
  for (let i = 0; i < closes.length; i++) {
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    cumTPV += tp * volumes[i];
    cumVol += volumes[i];
  }
  return cumVol > 0 ? cumTPV / cumVol : closes[closes.length - 1];
}

export function calcATR(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (highs.length < period + 1) return (highs[highs.length - 1] - lows[lows.length - 1]);
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trs.push(tr);
  }
  let atr = 0;
  for (let i = trs.length - period; i < trs.length; i++) atr += trs[i];
  return atr / period;
}

export function calcBollingerBands(closes: number[], period = 20, mult = 2): { upper: number; middle: number; lower: number } {
  if (closes.length < period) {
    const last = closes[closes.length - 1];
    return { upper: last * 1.02, middle: last, lower: last * 0.98 };
  }
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  return { upper: mean + mult * std, middle: mean, lower: mean - mult * std };
}

export function calcStochastic(highs: number[], lows: number[], closes: number[], period = 14): { k: number; d: number } {
  if (closes.length < period) return { k: 50, d: 50 };
  const slice_h = highs.slice(-period);
  const slice_l = lows.slice(-period);
  const hh = Math.max(...slice_h);
  const ll = Math.min(...slice_l);
  const c = closes[closes.length - 1];
  const k = hh === ll ? 50 : ((c - ll) / (hh - ll)) * 100;
  return { k, d: k }; // simplified
}

export function calcADX(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (highs.length < period * 2) return 25;
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  const smoothedTR = calcEMA(tr, period);
  const smoothedPDM = calcEMA(plusDM, period);
  const smoothedMDM = calcEMA(minusDM, period);
  const last = smoothedTR.length - 1;
  if (smoothedTR[last] === 0) return 0;
  const pdi = (smoothedPDM[last] / smoothedTR[last]) * 100;
  const mdi = (smoothedMDM[last] / smoothedTR[last]) * 100;
  const sum = pdi + mdi;
  if (sum === 0) return 0;
  const dx = (Math.abs(pdi - mdi) / sum) * 100;
  return dx;
}

export function detectPivotPoints(highs: number[], lows: number[], closes: number[]): {
  r3: number; r2: number; r1: number; pp: number; s1: number; s2: number; s3: number;
} {
  const h = highs[highs.length - 1];
  const l = lows[lows.length - 1];
  const c = closes[closes.length - 1];
  const pp = (h + l + c) / 3;
  return {
    r3: h + 2 * (pp - l),
    r2: pp + (h - l),
    r1: 2 * pp - l,
    pp,
    s1: 2 * pp - h,
    s2: pp - (h - l),
    s3: l - 2 * (h - pp),
  };
}

export function calcMomentumScore(
  changePct: number,
  rsi: number,
  macdHist: number,
  adx: number,
  priceVsVwap: number,
  priceVsEma9: number,
  priceVsEma20: number,
): number {
  let score = 50;

  // Price momentum (0-20)
  score += Math.min(20, Math.max(-20, changePct * 5));

  // RSI contribution (-15 to +15)
  if (rsi > 60 && rsi < 80) score += (rsi - 50) * 0.3;
  else if (rsi > 80) score += 10 - (rsi - 80) * 0.5; // overbought penalty
  else if (rsi < 40 && rsi > 20) score -= (50 - rsi) * 0.3;
  else if (rsi < 20) score -= 10 + (20 - rsi) * 0.5;

  // MACD histogram
  score += Math.min(10, Math.max(-10, macdHist * 100));

  // ADX trend strength
  if (adx > 25) score += Math.min(10, (adx - 25) * 0.4);

  // Price vs VWAP
  if (priceVsVwap > 0) score += Math.min(5, priceVsVwap * 200);
  else score += Math.max(-5, priceVsVwap * 200);

  // Price vs EMAs
  if (priceVsEma9 > 0 && priceVsEma20 > 0) score += 5;
  else if (priceVsEma9 < 0 && priceVsEma20 < 0) score -= 5;

  return Math.max(0, Math.min(100, score));
}

export function calcVolumeScore(volumeRatio: number, priceChange: number): number {
  let score = 50;
  // High volume with price move = strong signal
  if (volumeRatio > 2 && Math.abs(priceChange) > 1) score += 30;
  else if (volumeRatio > 1.5 && Math.abs(priceChange) > 0.5) score += 20;
  else if (volumeRatio > 1.2) score += 10;
  else if (volumeRatio < 0.5) score -= 20;
  else if (volumeRatio < 0.8) score -= 10;

  // Volume confirming direction
  if (volumeRatio > 1.2 && priceChange > 0) score += 10;
  else if (volumeRatio > 1.2 && priceChange < 0) score += 5; // selling pressure also informative

  return Math.max(0, Math.min(100, score));
}

export function calcTrendScore(
  ema9: number,
  ema20: number,
  ltp: number,
  adx: number,
): number {
  let score = 50;

  // EMA alignment
  if (ltp > ema9 && ema9 > ema20) score += 20; // bullish alignment
  else if (ltp < ema9 && ema9 < ema20) score -= 20; // bearish alignment
  else if (ltp > ema20 && ltp < ema9) score -= 5; // pulling back in uptrend
  else if (ltp < ema20 && ltp > ema9) score += 5; // bouncing in downtrend

  // ADX strength
  if (adx > 30) score += 15;
  else if (adx > 20) score += 5;
  else score -= 10;

  // Distance from EMAs
  const distFromEma9 = ((ltp - ema9) / ema9) * 100;
  if (Math.abs(distFromEma9) > 3) score -= 5; // overextended

  return Math.max(0, Math.min(100, score));
}

export function calcOIScore(oiChangePct: number, priceChangePct: number): number {
  let score = 50;

  // Long buildup: price up + OI up
  if (priceChangePct > 0 && oiChangePct > 0) {
    score += Math.min(25, (priceChangePct + oiChangePct) * 3);
  }
  // Short buildup: price down + OI up
  else if (priceChangePct < 0 && oiChangePct > 0) {
    score -= Math.min(20, (Math.abs(priceChangePct) + oiChangePct) * 2);
  }
  // Short covering: price up + OI down
  else if (priceChangePct > 0 && oiChangePct < 0) {
    score += Math.min(15, priceChangePct * 2);
  }
  // Long unwinding: price down + OI down
  else if (priceChangePct < 0 && oiChangePct < 0) {
    score -= Math.min(15, Math.abs(priceChangePct) * 2);
  }

  return Math.max(0, Math.min(100, score));
}
