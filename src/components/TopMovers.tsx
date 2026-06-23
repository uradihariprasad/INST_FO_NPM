import { useMemo } from 'react';
import { useStore } from '../store';
import type { ScannerResult } from '../types';
import { TrendingUp, TrendingDown, Flame, Target } from 'lucide-react';

export default function TopMovers() {
  const { scannerResults, setSelectedSymbol, setActiveView } = useStore();

  const { topGainers, topLosers, topMomentum, topSignals } = useMemo(() => {
    const sorted = [...scannerResults];
    return {
      topGainers: [...sorted].sort((a, b) => b.stock.changePct - a.stock.changePct).slice(0, 5),
      topLosers: [...sorted].sort((a, b) => a.stock.changePct - b.stock.changePct).slice(0, 5),
      topMomentum: [...sorted].sort((a, b) => b.momentumScore - a.momentumScore).slice(0, 5),
      topSignals: sorted.filter(r => r.signal).sort((a, b) =>
        (b.signal?.confidence || 0) - (a.signal?.confidence || 0)
      ).slice(0, 5),
    };
  }, [scannerResults]);

  const handleClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveView('chart');
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <MoverCard
        title="Top Gainers"
        icon={<TrendingUp size={12} className="text-up" />}
        items={topGainers}
        getValue={(r) => r.stock.changePct}
        format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`}
        colorFn={(v) => v > 0 ? 'text-up' : 'text-down'}
        onClick={handleClick}
      />
      <MoverCard
        title="Top Losers"
        icon={<TrendingDown size={12} className="text-down" />}
        items={topLosers}
        getValue={(r) => r.stock.changePct}
        format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`}
        colorFn={(v) => v > 0 ? 'text-up' : 'text-down'}
        onClick={handleClick}
      />
      <MoverCard
        title="Top Momentum"
        icon={<Flame size={12} className="text-warn" />}
        items={topMomentum}
        getValue={(r) => r.momentumScore}
        format={(v) => `${Math.round(v)}`}
        colorFn={(v) => v > 65 ? 'text-up' : v > 45 ? 'text-warn' : 'text-down'}
        onClick={handleClick}
      />
      <MoverCard
        title="Best Signals"
        icon={<Target size={12} className="text-brand-400" />}
        items={topSignals}
        getValue={(r) => r.signal?.confidence || 0}
        format={(v) => `${Math.round(v)}%`}
        colorFn={(v) => v > 70 ? 'text-up' : v > 50 ? 'text-warn' : 'text-down'}
        onClick={handleClick}
      />
    </div>
  );
}

interface MoverCardProps {
  title: string;
  icon: React.ReactNode;
  items: ScannerResult[];
  getValue: (r: ScannerResult) => number;
  format: (v: number) => string;
  colorFn: (v: number) => string;
  onClick: (symbol: string) => void;
}

function MoverCard({ title, icon, items, getValue, format, colorFn, onClick }: MoverCardProps) {
  return (
    <div className="glass-panel rounded-xl p-2.5">
      <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
        {icon} {title}
      </h4>
      <div className="space-y-1">
        {items.map((r, i) => {
          const val = getValue(r);
          return (
            <button
              key={r.stock.symbol}
              onClick={() => onClick(r.stock.symbol)}
              className="w-full flex items-center justify-between py-1 px-1.5 rounded hover:bg-panel-light transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-gray-600 w-3">{i + 1}</span>
                <span className="text-[11px] font-medium text-gray-200">{r.stock.symbol}</span>
              </div>
              <span className={`text-[11px] font-bold ${colorFn(val)}`}>
                {format(val)}
              </span>
            </button>
          );
        })}
        {items.length === 0 && (
          <p className="text-[10px] text-gray-600 text-center py-2">No data</p>
        )}
      </div>
    </div>
  );
}
