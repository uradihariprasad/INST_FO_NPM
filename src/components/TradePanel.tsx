import type { TradeSignal, StockQuote } from '../types';
import { Target, ShieldAlert, TrendingUp, TrendingDown, Crosshair, Award } from 'lucide-react';

interface Props {
  signal: TradeSignal | null;
  stock: StockQuote;
}

export default function TradePanel({ signal, stock }: Props) {
  if (!signal) {
    return (
      <div className="glass-panel rounded-xl p-3">
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-3">
          <Crosshair size={12} /> Trade Setup
        </h3>
        <div className="flex items-center justify-center h-32 text-gray-600 text-xs">
          <div className="text-center">
            <ShieldAlert size={24} className="mx-auto mb-2 opacity-30" />
            <p>No clear trade signal</p>
            <p className="text-[10px] text-gray-700 mt-1">Score too low for signal generation</p>
          </div>
        </div>
      </div>
    );
  }

  const isLong = signal.direction === 'LONG';
  const risk = Math.abs(signal.entry - signal.stopLoss);
  const riskPct = (risk / signal.entry * 100).toFixed(2);
  const lotValue = stock.lotSize * signal.entry;

  return (
    <div className="glass-panel rounded-xl p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <Crosshair size={12} /> Trade Setup
        </h3>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
          isLong ? 'bg-up/15 text-up' : 'bg-down/15 text-down'
        }`}>
          {isLong ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {signal.direction}
        </div>
      </div>

      {/* Confidence meter */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-500">Confidence</span>
          <span className={`text-sm font-bold ${
            signal.confidence > 70 ? 'text-up' : signal.confidence > 50 ? 'text-warn' : 'text-down'
          }`}>
            {signal.confidence}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              signal.confidence > 70 ? 'bg-gradient-to-r from-up/60 to-up' :
              signal.confidence > 50 ? 'bg-gradient-to-r from-warn/60 to-warn' :
              'bg-gradient-to-r from-down/60 to-down'
            }`}
            style={{ width: `${signal.confidence}%` }}
          />
        </div>
      </div>

      {/* Price levels */}
      <div className="space-y-1.5">
        <PriceLevel icon={<Crosshair size={10} />} label="Entry" price={signal.entry} color="text-brand-400" bgColor="bg-brand-500/10" />
        <PriceLevel icon={<ShieldAlert size={10} />} label="Stop Loss" price={signal.stopLoss} color="text-down" bgColor="bg-down/10" extra={`Risk: ${riskPct}%`} />
        <PriceLevel icon={<Target size={10} />} label="Target 1" price={signal.target1} color="text-up" bgColor="bg-up/5" />
        <PriceLevel icon={<Target size={10} />} label="Target 2" price={signal.target2} color="text-up" bgColor="bg-up/10" />
        <PriceLevel icon={<Award size={10} />} label="Target 3" price={signal.target3} color="text-up" bgColor="bg-up/15" />
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-panel-light rounded-lg px-2 py-1.5 text-center">
          <div className="text-[10px] text-gray-500">R:R Ratio</div>
          <div className={`text-sm font-bold ${signal.riskReward > 2 ? 'text-up' : signal.riskReward > 1 ? 'text-warn' : 'text-down'}`}>
            {signal.riskReward.toFixed(1)}:1
          </div>
        </div>
        <div className="bg-panel-light rounded-lg px-2 py-1.5 text-center">
          <div className="text-[10px] text-gray-500">Lot Value</div>
          <div className="text-sm font-bold text-gray-200">₹{formatCompact(lotValue)}</div>
        </div>
      </div>

      {/* Reasons */}
      {signal.reasons.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Signal Reasons</div>
          {signal.reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-gray-400">
              <span className={`mt-0.5 w-1 h-1 rounded-full flex-shrink-0 ${isLong ? 'bg-up' : 'bg-down'}`} />
              {r}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PriceLevel({ icon, label, price, color, bgColor, extra }: {
  icon: React.ReactNode; label: string; price: number; color: string; bgColor: string; extra?: string;
}) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${bgColor}`}>
      <div className="flex items-center gap-1.5">
        <span className={color}>{icon}</span>
        <span className="text-[10px] text-gray-400">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {extra && <span className="text-[9px] text-gray-600">{extra}</span>}
        <span className={`text-xs font-bold ${color}`}>₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 10000000) return (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toFixed(0);
}
