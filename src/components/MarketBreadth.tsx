import { useStore } from '../store';
import { isUsingLiveData } from '../engine/scanner';
import { TrendingUp, TrendingDown, Minus, BarChart2, PieChart, Wifi, WifiOff } from 'lucide-react';

export default function MarketBreadthPanel() {
  const { marketBreadth, sectorData, apiToken } = useStore();
  
  const isLive = isUsingLiveData() && apiToken;
  
  if (!marketBreadth) return null;

  const { advancing, declining, unchanged, putCallRatio, vixLevel, marketTrend } = marketBreadth;
  const total = advancing + declining + unchanged;
  const advPct = total > 0 ? (advancing / total) * 100 : 0;
  const decPct = total > 0 ? (declining / total) * 100 : 0;

  const trendIcon = marketTrend === 'bullish'
    ? <TrendingUp size={14} className="text-up" />
    : marketTrend === 'bearish'
    ? <TrendingDown size={14} className="text-down" />
    : <Minus size={14} className="text-gray-400" />;

  const trendColor = marketTrend === 'bullish' ? 'text-up' : marketTrend === 'bearish' ? 'text-down' : 'text-gray-400';

  return (
    <div className="space-y-3">
      {/* Data Source Badge */}
      <div className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium ${
        isLive ? 'bg-up/10 text-up border border-up/20' : 'bg-warn/10 text-warn border border-warn/20'
      }`}>
        {isLive ? <Wifi size={10} /> : <WifiOff size={10} />}
        {isLive ? 'Live Market Data' : 'Simulated Data'}
      </div>

      {/* Market Overview */}
      <div className="glass-panel rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <PieChart size={12} /> Market Pulse
          </h3>
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            {trendIcon}
            {marketTrend.charAt(0).toUpperCase() + marketTrend.slice(1)}
          </div>
        </div>

        {/* A/D bar */}
        <div className="mb-2">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span className="text-up">{advancing} Adv</span>
            <span className="text-gray-500">{unchanged}</span>
            <span className="text-down">{declining} Dec</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex bg-gray-800">
            <div className="bg-up transition-all" style={{ width: `${advPct}%` }} />
            <div className="bg-gray-600 transition-all" style={{ width: `${100 - advPct - decPct}%` }} />
            <div className="bg-down transition-all" style={{ width: `${decPct}%` }} />
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-panel-light rounded-lg px-2 py-1.5">
            <div className="text-[10px] text-gray-500">PCR</div>
            <div className={`text-sm font-bold ${putCallRatio > 1 ? 'text-up' : putCallRatio < 0.7 ? 'text-down' : 'text-warn'}`}>
              {putCallRatio.toFixed(2)}
            </div>
          </div>
          <div className="bg-panel-light rounded-lg px-2 py-1.5">
            <div className="text-[10px] text-gray-500">VIX</div>
            <div className={`text-sm font-bold ${vixLevel < 15 ? 'text-up' : vixLevel > 20 ? 'text-down' : 'text-warn'}`}>
              {vixLevel.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Sector Performance */}
      <div className="glass-panel rounded-xl p-3">
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <BarChart2 size={12} /> Sectors
        </h3>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {sectorData.slice(0, 12).map(sector => (
            <div key={sector.name} className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-panel-light transition-colors">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  sector.moneyFlow === 'inflow' ? 'bg-up' :
                  sector.moneyFlow === 'outflow' ? 'bg-down' : 'bg-gray-500'
                }`} />
                <span className="text-xs text-gray-300">{sector.name}</span>
                <span className="text-[10px] text-gray-600">({sector.stocks.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-1 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sector.change > 0 ? 'bg-up' : 'bg-down'}`}
                    style={{ width: `${Math.min(100, Math.abs(sector.change) * 30)}%` }}
                  />
                </div>
                <span className={`text-xs font-medium min-w-[40px] text-right ${
                  sector.change > 0 ? 'text-up' : sector.change < 0 ? 'text-down' : 'text-gray-400'
                }`}>
                  {sector.change > 0 ? '+' : ''}{sector.change.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
