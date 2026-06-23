import { useMemo, useEffect, useState } from 'react';
import { useStore } from '../store';
import { getStockCandles, analyzeStock, getStockQuote } from '../engine/scanner';
import { fetchIntradayCandles } from '../services/upstoxApi';
import type { CandleData } from '../types';
import StockChart from './StockChart';
import TradePanel from './TradePanel';
import LevelsPanel from './LevelsPanel';
import ScoreBreakdownPanel from './ScoreBreakdown';
import { ArrowLeft, TrendingUp, TrendingDown, Activity, BarChart2, Gauge, RefreshCw } from 'lucide-react';

export default function StockDetail() {
  const { selectedSymbol, setSelectedSymbol, setActiveView, scannerResults, apiToken } = useStore();
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [isLoadingCandles, setIsLoadingCandles] = useState(false);

  // Auto-select top stock if none selected
  const effectiveSymbol = useMemo(() => {
    if (selectedSymbol) return selectedSymbol;
    if (scannerResults.length > 0) {
      const top = [...scannerResults].sort((a, b) => b.compositeScore - a.compositeScore)[0];
      return top.stock.symbol;
    }
    return null;
  }, [selectedSymbol, scannerResults]);

  const result = useMemo(() => {
    if (!effectiveSymbol) return null;
    const found = scannerResults.find(r => r.stock.symbol === effectiveSymbol);
    if (found && candles.length > 0) {
      // Re-analyze with fresh candles
      return analyzeStock(found.stock, candles);
    }
    return found;
  }, [scannerResults, effectiveSymbol, candles]);

  // Fetch candles for selected stock
  useEffect(() => {
    if (!effectiveSymbol) return;

    const loadCandles = async () => {
      setIsLoadingCandles(true);
      
      // Try to get cached candles first
      const cached = getStockCandles(effectiveSymbol);
      if (cached.length > 0) {
        setCandles(cached);
      }

      // If we have API token, try to fetch fresh candles
      if (apiToken) {
        const quote = getStockQuote(effectiveSymbol);
        if (quote?.instrumentKey) {
          try {
            const freshCandles = await fetchIntradayCandles(apiToken, quote.instrumentKey, '1minute');
            if (freshCandles.length > 0) {
              setCandles(freshCandles);
            }
          } catch (error) {
            console.warn('Failed to fetch live candles:', error);
          }
        }
      }
      
      setIsLoadingCandles(false);
    };

    loadCandles();
  }, [effectiveSymbol, apiToken]);

  const handleRefreshCandles = async () => {
    if (!effectiveSymbol || !apiToken) return;
    setIsLoadingCandles(true);
    
    const quote = getStockQuote(effectiveSymbol);
    if (quote?.instrumentKey) {
      try {
        const freshCandles = await fetchIntradayCandles(apiToken, quote.instrumentKey, '1minute');
        if (freshCandles.length > 0) {
          setCandles(freshCandles);
        }
      } catch (error) {
        console.warn('Failed to refresh candles:', error);
      }
    }
    
    setIsLoadingCandles(false);
  };

  if (!result || !effectiveSymbol) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-gray-500">
        <div className="text-center">
          <Activity size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Select a stock from the scanner</p>
          <p className="text-xs text-gray-600 mt-1">Click any row to view detailed analysis</p>
          <button
            onClick={() => setActiveView('scanner')}
            className="mt-3 px-3 py-1.5 rounded-lg bg-brand-600/20 text-brand-400 text-xs hover:bg-brand-600/30 transition-colors"
          >
            Go to Scanner
          </button>
        </div>
      </div>
    );
  }

  const { stock, rsi, macdSignal, vwap, ema9, ema20, atr } = result;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Quick stock picker */}
      <div className="glass-panel rounded-xl p-2 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => { setSelectedSymbol(null); setActiveView('scanner'); }}
          className="px-2 py-1 rounded-lg hover:bg-panel-light text-gray-400 hover:text-white transition-colors text-xs flex-shrink-0 flex items-center gap-1"
        >
          <ArrowLeft size={12} /> Scanner
        </button>
        <div className="w-px h-5 bg-panel-border flex-shrink-0" />
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {scannerResults
            .filter(r => r.signal)
            .sort((a, b) => (b.signal?.confidence || 0) - (a.signal?.confidence || 0))
            .slice(0, 12)
            .map(r => (
              <button
                key={r.stock.symbol}
                onClick={() => setSelectedSymbol(r.stock.symbol)}
                className={`px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  effectiveSymbol === r.stock.symbol
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-panel-light'
                }`}
              >
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
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{stock.symbol}</h2>
                <span className="text-xs text-gray-500 hidden sm:inline">{stock.name}</span>
              </div>
              <span className="text-[10px] text-gray-500 px-1.5 py-0.5 rounded bg-panel-light">{stock.sector}</span>
            </div>
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

        {/* Key metrics row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
          {[
            { label: 'Open', value: `₹${stock.open.toFixed(2)}` },
            { label: 'High', value: `₹${stock.high.toFixed(2)}`, cls: 'text-up' },
            { label: 'Low', value: `₹${stock.low.toFixed(2)}`, cls: 'text-down' },
            { label: 'Volume', value: formatNumber(stock.volume) },
            { label: 'Vol Ratio', value: `${stock.volumeRatio.toFixed(1)}x`, cls: stock.volumeRatio > 1.5 ? 'text-up' : '' },
            { label: 'OI Chg', value: `${stock.oiChangePct > 0 ? '+' : ''}${stock.oiChangePct.toFixed(1)}%`, cls: stock.oiChangePct > 0 ? 'text-up' : 'text-down' },
          ].map(m => (
            <div key={m.label} className="bg-panel-light rounded-lg px-2 py-1.5 text-center">
              <div className="text-[10px] text-gray-500">{m.label}</div>
              <div className={`text-xs font-bold ${m.cls || 'text-gray-200'}`}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Indicator badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <IndicatorBadge icon={<Gauge size={10} />} label="RSI" value={rsi.toFixed(1)} status={rsi > 70 ? 'danger' : rsi < 30 ? 'danger' : rsi > 55 ? 'good' : rsi < 45 ? 'warn' : 'neutral'} />
          <IndicatorBadge icon={<Activity size={10} />} label="MACD" value={macdSignal} status={macdSignal === 'bullish' ? 'good' : macdSignal === 'bearish' ? 'danger' : 'neutral'} />
          <IndicatorBadge icon={<BarChart2 size={10} />} label="VWAP" value={stock.ltp > vwap ? 'Above' : 'Below'} status={stock.ltp > vwap ? 'good' : 'warn'} />
          <IndicatorBadge icon={<TrendingUp size={10} />} label="EMA" value={ema9 > ema20 ? 'Bull' : 'Bear'} status={ema9 > ema20 ? 'good' : 'warn'} />
          <IndicatorBadge icon={<Activity size={10} />} label="ATR" value={atr.toFixed(2)} status="neutral" />
        </div>
      </div>

      {/* Chart */}
      <div className="glass-panel rounded-xl overflow-hidden" style={{ height: '400px' }}>
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-panel-border bg-panel-light/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Intraday Chart</span>
            <span className="text-[10px] text-gray-600">
              {candles.length} candles
            </span>
          </div>
          <button
            onClick={handleRefreshCandles}
            disabled={isLoadingCandles || !apiToken}
            className="p-1 rounded hover:bg-panel-light text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
            title="Refresh chart data"
          >
            <RefreshCw size={12} className={isLoadingCandles ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="h-[calc(100%-32px)]">
          <StockChart
            candles={candles.length > 0 ? candles : getStockCandles(effectiveSymbol)}
            levels={result.levels}
            signal={result.signal}
            vwap={vwap}
            ema9={ema9}
            ema20={ema20}
            symbol={stock.symbol}
          />
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <TradePanel signal={result.signal} stock={stock} />
        <LevelsPanel levels={result.levels} ltp={stock.ltp} />
        <ScoreBreakdownPanel result={result} />
      </div>
    </div>
  );
}

function IndicatorBadge({ icon, label, value, status }: { icon: React.ReactNode; label: string; value: string; status: 'good' | 'warn' | 'danger' | 'neutral' }) {
  const color = status === 'good' ? 'text-up bg-up/10 border-up/20' :
    status === 'warn' ? 'text-warn bg-warn/10 border-warn/20' :
    status === 'danger' ? 'text-down bg-down/10 border-down/20' :
    'text-gray-400 bg-gray-800/50 border-gray-700/50';

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${color}`}>
      {icon}
      <span className="text-gray-500">{label}:</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 10000000) return (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}
