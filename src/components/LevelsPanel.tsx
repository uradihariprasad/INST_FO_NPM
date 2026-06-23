import type { SupportResistance } from '../types';
import { Layers } from 'lucide-react';

interface Props {
  levels: SupportResistance[];
  ltp: number;
}

export default function LevelsPanel({ levels, ltp }: Props) {
  const supports = levels.filter(l => l.type === 'support').sort((a, b) => b.price - a.price);
  const resistances = levels.filter(l => l.type === 'resistance').sort((a, b) => a.price - b.price);

  return (
    <div className="glass-panel rounded-xl p-3">
      <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-3">
        <Layers size={12} /> S/R Levels
      </h3>

      <div className="space-y-1">
        {/* Resistances (above price) */}
        {resistances.slice(0, 4).reverse().map((level, i) => (
          <LevelRow key={`r-${i}`} level={level} ltp={ltp} />
        ))}

        {/* Current price */}
        <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-brand-600/15 border border-brand-500/30 my-1">
          <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          <span className="text-[10px] text-brand-400 font-medium">LTP</span>
          <span className="text-xs font-bold text-white ml-auto">
            ₹{ltp.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Supports (below price) */}
        {supports.slice(0, 4).map((level, i) => (
          <LevelRow key={`s-${i}`} level={level} ltp={ltp} />
        ))}
      </div>

      {levels.length === 0 && (
        <p className="text-[10px] text-gray-600 text-center py-4">No levels detected</p>
      )}
    </div>
  );
}

function LevelRow({ level, ltp }: { level: SupportResistance; ltp: number }) {
  const isSupport = level.type === 'support';
  const distance = ((level.price - ltp) / ltp * 100);
  const distLabel = `${distance > 0 ? '+' : ''}${distance.toFixed(2)}%`;

  return (
    <div className={`flex items-center justify-between py-1 px-2 rounded-lg transition-colors hover:bg-panel-light ${
      isSupport ? 'border-l-2 border-l-up/50' : 'border-l-2 border-l-down/50'
    }`}>
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <span className={`text-xs font-bold ${isSupport ? 'text-up' : 'text-down'}`}>
            ₹{level.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] text-gray-600">{level.source}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500">{distLabel}</span>

        {/* Strength bar */}
        <div className="flex items-center gap-1">
          <div className="w-10 h-1.5 rounded-full bg-gray-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                level.strength > 70 ? (isSupport ? 'bg-up' : 'bg-down') :
                level.strength > 40 ? 'bg-warn' : 'bg-gray-600'
              }`}
              style={{ width: `${level.strength}%` }}
            />
          </div>
          <span className={`text-[9px] font-bold ${
            level.strength > 70 ? (isSupport ? 'text-up' : 'text-down') : 'text-gray-500'
          }`}>
            {Math.round(level.strength)}%
          </span>
        </div>
      </div>
    </div>
  );
}
