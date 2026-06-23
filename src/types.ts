// ==================== CORE TYPES ====================

export interface StockQuote {
  symbol: string;
  name: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  prevClose: number;
  change: number;
  changePct: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  oi: number;
  oiChange: number;
  oiChangePct: number;
  sector: string;
  lotSize: number;
  instrumentKey: string;
  futuresKey: string;
  lastUpdated: number;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SupportResistance {
  price: number;
  type: 'support' | 'resistance';
  strength: number; // 0-100
  source: string; // 'pivot' | 'oi' | 'volume' | 'pattern'
  touches: number;
}

export interface TradeSignal {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry: number;
  target1: number;
  target2: number;
  target3: number;
  stopLoss: number;
  riskReward: number;
  confidence: number; // 0-100
  entryScore: number;
  exitScore: number;
  timingScore: number;
  overallScore: number;
  reasons: string[];
  timestamp: number;
}

export interface ScannerResult {
  stock: StockQuote;
  signal: TradeSignal | null;
  momentumScore: number;
  relativeStrength: number;
  volumeScore: number;
  trendScore: number;
  oiScore: number;
  sectorScore: number;
  compositeScore: number;
  levels: SupportResistance[];
  vwap: number;
  ema9: number;
  ema20: number;
  rsi: number;
  atr: number;
  macdSignal: 'bullish' | 'bearish' | 'neutral';
}

export interface SectorData {
  name: string;
  change: number;
  stocks: string[];
  avgMomentum: number;
  moneyFlow: 'inflow' | 'outflow' | 'neutral';
}

export interface MarketBreadth {
  advancing: number;
  declining: number;
  unchanged: number;
  totalVolume: number;
  putCallRatio: number;
  vixLevel: number;
  marketTrend: 'bullish' | 'bearish' | 'neutral';
}

export interface OptionChainEntry {
  strikePrice: number;
  callOI: number;
  callOIChange: number;
  callVolume: number;
  callLTP: number;
  callIV: number;
  putOI: number;
  putOIChange: number;
  putVolume: number;
  putLTP: number;
  putIV: number;
  pcr: number;
}

export interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  weight: number;
  details: string;
}

export type ViewMode = 'scanner' | 'chart' | 'heatmap' | 'options';
export type SortField = 'compositeScore' | 'momentumScore' | 'volumeScore' | 'changePct' | 'relativeStrength' | 'symbol';
export type SortDirection = 'asc' | 'desc';
