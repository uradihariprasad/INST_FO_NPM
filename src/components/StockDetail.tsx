import { useMemo, useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';
import { getStockCandles, analyzeStock } from '../engine/scanner';
import { fetchIntradayCandles } from '../services/upstoxApi';
import type { CandleData, ScannerResult } from '../types';
import StockChart from './StockChart';
import TradePanel from './TradePanel';
import LevelsPanel from './LevelsPanel';
import ScoreBreakdownPanel from './ScoreBreakdown';
import { ArrowLeft, TrendingUp, TrendingDown, Activity, BarChart2, Gauge, RefreshCw } from 'lucide-react';

export default function StockDetail() {
  const { selectedSymbol, setSelectedSymbol, setActiveView, scannerResults, apiToken } = useStore();
  const [localCandles, setLocalCandles] = useState<CandleData[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [localResult, setLocalResult] = useState<ScannerResult | null>(null);

  // Auto-select top stock if none selected
  const effectiveSymbol = useMemo(() => {
    if (selectedSymbol) return selectedSymbol;
    if (scannerResults.length > 0) {
      return [...scannerResults].sort((a, b) => b.compositeScore - a.compositeScore)[0].stock.symbol;
    }
    return null;
  }, [selectedSymbol, scannerResults]);

  // Base result from scanner
  const baseResult = useMemo(() => {
    return scannerResults.find(r => r.stock.symbol === effectiveSymbol) ?? null;
  }, [scannerResults, effectiveSymbol]);

  // Load candles whenever symbol changes
  const loadCandles = useCallback(async () => {
    if (!effectiveSymbol || !baseResult) return;

    setLoadingChart(true);

    // 1. Start with cached candles from scanner
    const cached = getStockCandles(effectiveSymbol);
    if (cached.length > 0) {
      setLocalCandles(cached);
      setLocalResult(analyzeStock(baseResult.stock, cached));
    } else {
      setLocalCandles([]);
      setLocalResult(baseResult);
    }

    // 2. If we have API token, try to fetch fresh 1-minute candles
    if (apiToken && baseResult.stock.instrumentKey) {
      try {
        const fresh = await fetchIntradayCandles(apiToken, baseResult.stock.instrumentKey, '1minute');
        if (fresh.length > 2) {
          setLocalCandles(fresh);
          setLocalResult(analyzeStock(baseResult.stock, fresh));
        }
      } catch {
        // keep whatever we already have
      }
    }

    setLoadingChart(false);
  }, [effectiveSymbol, baseResult, apiToken]);

  useEffect(() => { loadCandles(); }, [loadCandles]);

  // When scanner updates the baseResult, re-analyze with existing candles
  useEffect(() => {
    if (baseResult && localCandles.length > 0) {
      setLocalResult(analyzeStock(baseResult.stock, localCandles));
    } else if (baseResult) {
      setLocalResult(baseResult);
    }
  }, [baseResult, localCandles]);

  // The result to display: prefer local (re-analyzed with candles), fallback to scanner
  const result = localResult ?? baseResult;

  if (!result || !effectiveSymbol) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-gray-500">
        <div className="text-center">
          <Activity size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Select a stock from the scanner</p>
          <button onClick={() => setActiveView('scanner')}
            className="mt-3 px-3 py-1.5 rounded-lg bg-brand-600/20 text-brand-400 text-xs hover:bg-brand-600/30 transition-colors">
            Go to Scanner
          </button>
        </div>
      </div>
    );
  }

  const { stock, rsi, macdSignal, vwap, ema9, ema20, atr } = result;
  const displayCandles = localCandles.length > 0 ? localCandles : getStockCandles(effectiveSymbol);

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Quick stock picker */}
      <div className="glass-panel rounded-xl p-2 flex items-center gap-2 overflow-x-auto">
        <button onClick={() => { setSelectedSymbol(null); setActiveView('scanner'); }}
          className="px-2 py-1 rounded-lg hover:bg-panel-light text-gray-400 hover:text-white transition-colors text-xs flex-shrink-0 flex items-center gap-1">
          <ArrowLeft size={12} /> Scanner
        </button>
        <div className="w-px h-5 bg-panel-border flex-shrink-0" />
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {scannerResults
            .filter(r => r.signal)
            .sort((a, b) => (b.signal?.confidence ?? 0) - (a.signal?.confidence ?? 0))
            .slice(0, 12)
            .map(r => (
              <button key={r.stock.symbol}
                onClick={() => setSelectedSymbol(r.stock.symbol)}
                className={`px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  effectiveSymbol === r.stock.symbol
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-panel-light'
                }`}>
                {r.stock.symbol}
                <span className={`ml-1 ${r.stock.changePct > 0 ? 'text-up' : 'text-down'}`}>
                  {r.stock.changePct > 0 ? '+' : ''}{r.stock.changePct.toFixed(1)}%
                </span>
              </button>
            ))}
        </div>
      </div>

      {/* Header */}
      <div className="glass-panel rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{stock.symbol}</h2>
              <span className="text-xs text-gray-500 hidden sm:inline">{stock.name}</span>
            </div>
            <span className="text-[10px] text-gray-500 px-1.5 py-0.5 rounded bg-panel-light">{stock.sector}</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-white">₹{stock.ltp.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <div className={`flex items-center gap-1 justify-end text-sm font-bold ${
              stock.changePct > 0 ? 'text-up' : stock.changePct < 0 ? 'text-down' : 'text-gray-400'
            }`}>
              {stock.changePct > 0 ? <TrendingUp size={14} /> : stock.changePct < 0 ? <TrendingDown size={14} /> : null}
              {stock.changePct > 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePct.toFixed(2)}%)
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
          {[
            { l: 'Open', v: `₹${stock.open.toFixed(2)}` },
            { l: 'High', v: `₹${stock.high.toFixed(2)}`, c: 'text-up' },
            { l: 'Low', v: `₹${stock.low.toFixed(2)}`, c: 'text-down' },
            { l: 'Volume', v: fmtNum(stock.volume) },
            { l: 'Vol Ratio', v: `${stock.volumeRatio.toFixed(1)}x`, c: stock.volumeRatio > 1.5 ? 'text-up' : '' },
            { l: 'OI Chg', v: `${stock.oiChangePct > 0 ? '+' : ''}${stock.oiChangePct.toFixed(1)}%`, c: stock.oiChangePct > 0 ? 'text-up' : 'text-down' },
          ].map(m => (
            <div key={m.l} className="bg-panel-light rounded-lg px-2 py-1.5 text-center">
              <div className="text-[10px] text-gray-500">{m.l}</div>
              <div className={`text-xs font-bold ${m.c || 'text-gray-200'}`}>{m.v}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge icon={<Gauge size={10} />} label="RSI" value={rsi.toFixed(1)} s={rsi > 70 ? 'd' : rsi < 30 ? 'd' : rsi > 55 ? 'g' : rsi < 45 ? 'w' : 'n'} />
          <Badge icon={<Activity size={10} />} label="MACD" value={macdSignal} s={macdSignal === 'bullish' ? 'g' : macdSignal === 'bearish' ? 'd' : 'n'} />
          <Badge icon={<BarChart2 size={10} />} label="VWAP" value={stock.ltp > vwap ? 'Above' : 'Below'} s={stock.ltp > vwap ? 'g' : 'w'} />
          <Badge icon={<TrendingUp size={10} />} label="EMA" value={ema9 > ema20 ? 'Bull' : 'Bear'} s={ema9 > ema20 ? 'g' : 'w'} />
          <Badge icon={<Activity size={10} />} label="ATR" value={atr.toFixed(2)} s="n" />
        </div>
      </div>

      {/* Chart */}
      <div className="glass-panel rounded-xl overflow-hidden" style={{ height: '400px' }}>
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-panel-border bg-panel-light/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Intraday Chart</span>
            <span className="text-[10px] text-gray-600">{displayCandles.length} candles</span>
          </div>
          <button onClick={loadCandles} disabled={loadingChart}
            className="p-1 rounded hover:bg-panel-light text-gray-500 hover:text-gray-300 disabled:opacity-50">
            <RefreshCw size={12} className={loadingChart ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="h-[calc(100%-32px)]">
          {displayCandles.length > 0 ? (
            <StockChart candles={displayCandles} levels={result.levels} signal={result.signal}
              vwap={vwap} ema9={ema9} ema20={ema20} symbol={stock.symbol} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600 text-xs">Loading chart…</div>
          )}
        </div>
      </div>

      {/* Analysis panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <TradePanel signal={result.signal} stock={stock} />
        <LevelsPanel levels={result.levels} ltp={stock.ltp} />
        <ScoreBreakdownPanel result={result} />
      </div>
    </div>
  );
}

function Badge({ icon, label, value, s }: { icon: React.ReactNode; label: string; value: string; s: 'g'|'w'|'d'|'n' }) {
  const cls = s === 'g' ? 'text-up bg-up/10 border-up/20'
    : s === 'w' ? 'text-warn bg-warn/10 border-warn/20'
    : s === 'd' ? 'text-down bg-down/10 border-down/20'
    : 'text-gray-400 bg-gray-800/50 border-gray-700/50';
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
      {icon}<span className="text-gray-500">{label}:</span><span className="font-bold">{value}</span>
    </div>
  );
}

function fmtNum(n: number): string {
  if (n >= 1e7) return (n / 1e7).toFixed(1) + 'Cr';
  if (n >= 1e5) return (n / 1e5).toFixed(1) + 'L';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toString();
}
