import { useMemo } from 'react';
import { useStore } from '../store';

export default function Heatmap() {
  const { scannerResults, setSelectedSymbol, setActiveView } = useStore();

  const sectorGroups = useMemo(() => {
    const groups = new Map<string, typeof scannerResults>();
    for (const r of scannerResults) {
      const existing = groups.get(r.stock.sector) || [];
      existing.push(r);
      groups.set(r.stock.sector, existing);
    }
    return [...groups.entries()].sort((a, b) => {
      const aAvg = a[1].reduce((s, r) => s + r.stock.changePct, 0) / a[1].length;
      const bAvg = b[1].reduce((s, r) => s + r.stock.changePct, 0) / b[1].length;
      return bAvg - aAvg;
    });
  }, [scannerResults]);

  const handleClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveView('chart');
  };

  return (
    <div className="glass-panel rounded-xl p-3">
      <h3 className="text-sm font-semibold text-gray-200 mb-3">F&O Sector Heatmap</h3>

      <div className="space-y-3">
        {sectorGroups.map(([sector, stocks]) => {
          const avgChange = stocks.reduce((s, r) => s + r.stock.changePct, 0) / stocks.length;
          return (
            <div key={sector}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-300">{sector}</span>
                <span className={`text-[10px] font-bold ${avgChange > 0 ? 'text-up' : avgChange < 0 ? 'text-down' : 'text-gray-400'}`}>
                  {avgChange > 0 ? '+' : ''}{avgChange.toFixed(2)}%
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {stocks.sort((a, b) => b.stock.changePct - a.stock.changePct).map(r => {
                  const pct = r.stock.changePct;
                  const intensity = Math.min(1, Math.abs(pct) / 3);
                  const bg = pct > 0
                    ? `rgba(34, 197, 94, ${0.1 + intensity * 0.5})`
                    : pct < 0
                    ? `rgba(239, 68, 68, ${0.1 + intensity * 0.5})`
                    : 'rgba(100, 116, 139, 0.2)';

                  return (
                    <button
                      key={r.stock.symbol}
                      onClick={() => handleClick(r.stock.symbol)}
                      className="rounded-lg px-2 py-1.5 text-center hover:ring-1 hover:ring-brand-500/50 transition-all cursor-pointer min-w-[60px]"
                      style={{ backgroundColor: bg }}
                    >
                      <div className="text-[10px] font-bold text-white truncate">{r.stock.symbol}</div>
                      <div className={`text-[9px] font-medium ${
                        pct > 0 ? 'text-up' : pct < 0 ? 'text-down' : 'text-gray-400'
                      }`}>
                        {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                      </div>
                      <div className="text-[8px] text-gray-400">
                        S:{Math.round(r.compositeScore)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
