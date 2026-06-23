import { useStore } from '../store';
import { SECTORS } from '../constants';
import { Filter, RotateCcw } from 'lucide-react';

export default function FilterBar() {
  const {
    sectorFilter, setSectorFilter,
    signalFilter, setSignalFilter,
    minScore, setMinScore,
    scannerResults,
  } = useStore();

  const totalSignals = scannerResults.filter(r => r.signal).length;
  const longSignals = scannerResults.filter(r => r.signal?.direction === 'LONG').length;
  const shortSignals = scannerResults.filter(r => r.signal?.direction === 'SHORT').length;

  const handleReset = () => {
    setSectorFilter('All');
    setSignalFilter('all');
    setMinScore(0);
  };

  return (
    <div className="glass-panel rounded-xl p-2.5 sm:p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <Filter size={12} /> Filters
        </h3>
        <button onClick={handleReset} className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1">
          <RotateCcw size={10} /> Reset
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Sector filter */}
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="bg-panel-light border border-panel-border rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="All">All Sectors</option>
          {SECTORS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Signal filter */}
        <div className="flex rounded-lg overflow-hidden border border-panel-border">
          {[
            { key: 'all' as const, label: `All (${totalSignals})` },
            { key: 'long' as const, label: `Long (${longSignals})` },
            { key: 'short' as const, label: `Short (${shortSignals})` },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setSignalFilter(item.key)}
              className={`px-2 py-1 text-[10px] font-medium transition-colors ${
                signalFilter === item.key
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-gray-500 hover:text-gray-300 bg-panel-light'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Min score */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500">Min Score:</span>
          <input
            type="range"
            min={0}
            max={80}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-16 h-1 accent-brand-500"
          />
          <span className="text-[10px] text-gray-400 min-w-[20px]">{minScore}</span>
        </div>
      </div>
    </div>
  );
}
