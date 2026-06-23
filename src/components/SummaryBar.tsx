import { useMemo } from 'react';
import { useStore } from '../store';
import { isUsingLiveData } from '../engine/scanner';
import { TrendingUp, TrendingDown, Zap, BarChart2, Crosshair, Clock, Wifi, WifiOff } from 'lucide-react';

export default function SummaryBar() {
  const { scannerResults, lastScanTime, apiToken } = useStore();

  const stats = useMemo(() => {
    if (scannerResults.length === 0) return null;

    const advancing = scannerResults.filter(r => r.stock.changePct > 0).length;
    const declining = scannerResults.filter(r => r.stock.changePct < 0).length;
    const signals = scannerResults.filter(r => r.signal);
    const longSignals = signals.filter(r => r.signal?.direction === 'LONG').length;
    const shortSignals = signals.filter(r => r.signal?.direction === 'SHORT').length;
    const avgScore = scannerResults.reduce((a, r) => a + r.compositeScore, 0) / scannerResults.length;
    const highConf = signals.filter(r => (r.signal?.confidence || 0) > 70).length;
    const topStock = [...scannerResults].sort((a, b) => b.compositeScore - a.compositeScore)[0];

    return {
      advancing, declining, longSignals, shortSignals,
      avgScore, highConf, topStock, totalSignals: signals.length,
    };
  }, [scannerResults]);

  if (!stats) return null;

  const elapsed = lastScanTime ? Math.round((Date.now() - lastScanTime) / 1000) : 0;
  const isLive = isUsingLiveData() && apiToken;

  return (
    <div className="glass-panel rounded-xl p-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]">
      {/* Data source indicator */}
      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
        isLive ? 'bg-up/10 text-up' : 'bg-warn/10 text-warn'
      }`}>
        {isLive ? <Wifi size={10} /> : <WifiOff size={10} />}
        <span className="font-medium">{isLive ? 'Live Data' : 'Simulated'}</span>
      </div>

      <div className="w-px h-4 bg-panel-border hidden sm:block" />

      <StatItem
        icon={<TrendingUp size={10} className="text-up" />}
        label="Adv"
        value={`${stats.advancing}`}
        color="text-up"
      />
      <StatItem
        icon={<TrendingDown size={10} className="text-down" />}
        label="Dec"
        value={`${stats.declining}`}
        color="text-down"
      />
      <div className="w-px h-4 bg-panel-border hidden sm:block" />
      <StatItem
        icon={<Crosshair size={10} className="text-brand-400" />}
        label="Signals"
        value={`${stats.totalSignals} (${stats.longSignals}L/${stats.shortSignals}S)`}
        color="text-brand-400"
      />
      <StatItem
        icon={<Zap size={10} className="text-warn" />}
        label="High Conf"
        value={`${stats.highConf}`}
        color="text-warn"
      />
      <div className="w-px h-4 bg-panel-border hidden sm:block" />
      <StatItem
        icon={<BarChart2 size={10} className="text-gray-400" />}
        label="Avg Score"
        value={`${Math.round(stats.avgScore)}`}
        color="text-gray-300"
      />
      {stats.topStock && (
        <StatItem
          icon={<span className="text-[8px]">🏆</span>}
          label="Top"
          value={`${stats.topStock.stock.symbol} (${Math.round(stats.topStock.compositeScore)})`}
          color="text-up"
        />
      )}
      <div className="ml-auto flex items-center gap-1 text-gray-600">
        <Clock size={9} />
        <span>{elapsed}s ago</span>
      </div>
    </div>
  );
}

function StatItem({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {icon}
      <span className="text-gray-500">{label}:</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}
