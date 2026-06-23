import { useMemo } from 'react';
import { useStore } from '../store';
import type { ScannerResult, SortField } from '../types';
import { getStockCandles } from '../engine/scanner';
import MiniSparkline from './MiniSparkline';
import { ArrowUpDown, Star, TrendingUp, TrendingDown, Zap, Eye } from 'lucide-react';

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const bgColor = pct > 70 ? 'bg-up' : pct > 50 ? 'bg-warn' : pct > 30 ? 'bg-orange-500' : 'bg-down';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 rounded-full bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${bgColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] min-w-[20px] font-medium ${
        pct > 70 ? 'text-up' : pct > 50 ? 'text-warn' : 'text-down'
      }`}>{Math.round(value)}</span>
    </div>
  );
}

function SignalBadge({ direction, confidence }: { direction: 'LONG' | 'SHORT'; confidence: number }) {
  const isLong = direction === 'LONG';
  return (
    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
      isLong ? 'bg-up/15 text-up border border-up/20' : 'bg-down/15 text-down border border-down/20'
    }`}>
      {isLong ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {direction} {confidence}%
    </div>
  );
}

export default function ScannerTable() {
  const {
    scannerResults, sortField, sortDirection, setSortField, setSortDirection,
    sectorFilter, signalFilter, minScore,
    selectedSymbol, setSelectedSymbol, setActiveView,
    watchlist, toggleWatchlist,
  } = useStore();

  const filtered = useMemo(() => {
    let data = [...scannerResults];

    if (sectorFilter !== 'All') {
      data = data.filter(r => r.stock.sector === sectorFilter);
    }
    if (signalFilter === 'long') {
      data = data.filter(r => r.signal?.direction === 'LONG');
    } else if (signalFilter === 'short') {
      data = data.filter(r => r.signal?.direction === 'SHORT');
    }
    if (minScore > 0) {
      data = data.filter(r => r.compositeScore >= minScore);
    }

    data.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case 'compositeScore': aVal = a.compositeScore; bVal = b.compositeScore; break;
        case 'momentumScore': aVal = a.momentumScore; bVal = b.momentumScore; break;
        case 'volumeScore': aVal = a.volumeScore; bVal = b.volumeScore; break;
        case 'changePct': aVal = a.stock.changePct; bVal = b.stock.changePct; break;
        case 'relativeStrength': aVal = a.relativeStrength; bVal = b.relativeStrength; break;
        case 'symbol': return sortDirection === 'asc' ? a.stock.symbol.localeCompare(b.stock.symbol) : b.stock.symbol.localeCompare(a.stock.symbol);
        default: aVal = a.compositeScore; bVal = b.compositeScore;
      }
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return data;
  }, [scannerResults, sortField, sortDirection, sectorFilter, signalFilter, minScore]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleStockClick = (result: ScannerResult) => {
    setSelectedSymbol(result.stock.symbol);
    setActiveView('chart');
  };

  const SortHeader = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-0.5 text-[10px] uppercase tracking-wider font-semibold text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap ${className}`}
    >
      {label}
      {sortField === field && (
        <ArrowUpDown size={10} className="text-brand-400" />
      )}
    </button>
  );

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        <div className="text-center">
          <Zap size={32} className="mx-auto mb-2 opacity-30" />
          <p>No stocks match filters</p>
          <p className="text-xs text-gray-600 mt-1">Adjust your filters or wait for scan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-panel z-10">
          <tr className="border-b border-panel-border">
            <th className="py-2 px-1.5 w-6" />
            <th className="py-2 px-1.5"><SortHeader field="symbol" label="Stock" /></th>
            <th className="py-2 px-1.5 hidden sm:table-cell"><SortHeader field="changePct" label="Price" /></th>
            <th className="py-2 px-1.5 hidden xl:table-cell"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Chart</span></th>
            <th className="py-2 px-1.5"><SortHeader field="compositeScore" label="Score" /></th>
            <th className="py-2 px-1.5 hidden md:table-cell"><SortHeader field="momentumScore" label="Mom" /></th>
            <th className="py-2 px-1.5 hidden md:table-cell"><SortHeader field="volumeScore" label="Vol" /></th>
            <th className="py-2 px-1.5 hidden lg:table-cell"><SortHeader field="relativeStrength" label="RS" /></th>
            <th className="py-2 px-1.5 hidden lg:table-cell"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">OI</span></th>
            <th className="py-2 px-1.5"><span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Signal</span></th>
            <th className="py-2 px-1.5 w-8" />
          </tr>
        </thead>
        <tbody>
          {filtered.map((result) => {
            const { stock, signal, compositeScore, momentumScore, volumeScore, relativeStrength, oiScore } = result;
            const isSelected = selectedSymbol === stock.symbol;
            const isWatched = watchlist.includes(stock.symbol);

            // Get sparkline data
            const candles = getStockCandles(stock.symbol);
            const sparkData = candles.length > 0
              ? candles.slice(-20).map(c => c.close)
              : [];

            return (
              <tr
                key={stock.symbol}
                onClick={() => handleStockClick(result)}
                className={`border-b border-panel-border/30 cursor-pointer transition-all hover:bg-panel-light/50 ${
                  isSelected ? 'bg-brand-600/10 border-l-2 border-l-brand-500' : ''
                }`}
              >
                <td className="py-1.5 px-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleWatchlist(stock.symbol); }}
                    className={`transition-colors ${isWatched ? 'text-warn' : 'text-gray-700 hover:text-gray-500'}`}
                  >
                    <Star size={11} fill={isWatched ? 'currentColor' : 'none'} />
                  </button>
                </td>

                <td className="py-1.5 px-1.5">
                  <div className="text-xs font-bold text-white">{stock.symbol}</div>
                  <div className="text-[10px] text-gray-500 hidden sm:flex items-center gap-1">
                    {stock.sector}
                    <span className={`inline-block sm:hidden ${stock.changePct > 0 ? 'text-up' : 'text-down'}`}>
                      {stock.changePct > 0 ? '+' : ''}{stock.changePct.toFixed(1)}%
                    </span>
                  </div>
                  {/* Mobile: show change below symbol */}
                  <div className={`text-[10px] font-bold sm:hidden ${stock.changePct > 0 ? 'text-up' : stock.changePct < 0 ? 'text-down' : 'text-gray-400'}`}>
                    ₹{stock.ltp.toFixed(0)} ({stock.changePct > 0 ? '+' : ''}{stock.changePct.toFixed(1)}%)
                  </div>
                </td>

                <td className="py-1.5 px-1.5 hidden sm:table-cell">
                  <div>
                    <span className="text-xs font-medium text-gray-200">₹{stock.ltp.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    <div className={`text-[10px] font-bold ${stock.changePct > 0 ? 'text-up' : stock.changePct < 0 ? 'text-down' : 'text-gray-400'}`}>
                      {stock.changePct > 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
                      <span className="text-gray-600 font-normal ml-1">
                        V:{stock.volumeRatio.toFixed(1)}x
                      </span>
                    </div>
                  </div>
                </td>

                <td className="py-1.5 px-1.5 hidden xl:table-cell">
                  {sparkData.length > 0 && (
                    <MiniSparkline data={sparkData} width={56} height={18} />
                  )}
                </td>

                <td className="py-1.5 px-1.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    compositeScore > 70 ? 'bg-up/15 text-up' :
                    compositeScore > 55 ? 'bg-warn/15 text-warn' :
                    compositeScore > 40 ? 'bg-orange-500/15 text-orange-400' :
                    'bg-down/15 text-down'
                  }`}>
                    {Math.round(compositeScore)}
                  </div>
                </td>

                <td className="py-1.5 px-1.5 hidden md:table-cell">
                  <ScoreBar value={momentumScore} />
                </td>

                <td className="py-1.5 px-1.5 hidden md:table-cell">
                  <ScoreBar value={volumeScore} />
                </td>

                <td className="py-1.5 px-1.5 hidden lg:table-cell">
                  <ScoreBar value={relativeStrength} />
                </td>

                <td className="py-1.5 px-1.5 hidden lg:table-cell">
                  <ScoreBar value={oiScore} />
                </td>

                <td className="py-1.5 px-1.5">
                  {signal ? (
                    <SignalBadge direction={signal.direction} confidence={signal.confidence} />
                  ) : (
                    <span className="text-[10px] text-gray-700">—</span>
                  )}
                </td>

                <td className="py-1.5 px-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStockClick(result); }}
                    className="text-gray-600 hover:text-brand-400 transition-colors"
                  >
                    <Eye size={13} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
