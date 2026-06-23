import type { ScannerResult } from '../types';
import { Brain, TrendingUp, BarChart2, Gauge, Activity, Users, Zap } from 'lucide-react';

interface Props {
  result: ScannerResult;
}

export default function ScoreBreakdownPanel({ result }: Props) {
  const { momentumScore, volumeScore, trendScore, oiScore, relativeStrength, sectorScore, compositeScore, signal } = result;

  const breakdown = [
    { label: 'Momentum', score: momentumScore, weight: 20, icon: <Zap size={10} />, detail: 'Price action & RSI/MACD alignment' },
    { label: 'Volume', score: volumeScore, weight: 15, icon: <BarChart2 size={10} />, detail: 'Volume ratio & price-volume correlation' },
    { label: 'Trend', score: trendScore, weight: 15, icon: <TrendingUp size={10} />, detail: 'EMA alignment & ADX strength' },
    { label: 'OI Analysis', score: oiScore, weight: 15, icon: <Activity size={10} />, detail: 'OI change vs price direction' },
    { label: 'Rel. Strength', score: relativeStrength, weight: 10, icon: <Gauge size={10} />, detail: 'Performance vs benchmark' },
    { label: 'Sector', score: sectorScore, weight: 5, icon: <Users size={10} />, detail: 'Sector momentum & money flow' },
  ];

  return (
    <div className="glass-panel rounded-xl p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <Brain size={12} /> AI Score Breakdown
        </h3>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
          compositeScore > 70 ? 'bg-up/15 text-up' :
          compositeScore > 50 ? 'bg-warn/15 text-warn' :
          'bg-down/15 text-down'
        }`}>
          {Math.round(compositeScore)}
        </div>
      </div>

      <div className="space-y-2">
        {breakdown.map((item) => {
          const pct = Math.min(100, Math.max(0, item.score));
          const barColor = pct > 70 ? 'bg-up' : pct > 50 ? 'bg-warn' : pct > 30 ? 'bg-orange-500' : 'bg-down';

          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  {item.icon}
                  <span>{item.label}</span>
                  <span className="text-gray-600">({item.weight}%)</span>
                </div>
                <span className={`text-[10px] font-bold ${
                  pct > 70 ? 'text-up' : pct > 50 ? 'text-warn' : 'text-down'
                }`}>
                  {Math.round(pct)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[9px] text-gray-600 mt-0.5">{item.detail}</p>
            </div>
          );
        })}
      </div>

      {/* Signal quality scores */}
      {signal && (
        <div className="mt-3 pt-3 border-t border-panel-border">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Signal Quality</div>
          <div className="grid grid-cols-3 gap-1.5">
            <QualityBadge label="Entry" score={signal.entryScore} />
            <QualityBadge label="Exit" score={signal.exitScore} />
            <QualityBadge label="Timing" score={signal.timingScore} />
          </div>
        </div>
      )}

      {/* Decision explanation */}
      <div className="mt-3 pt-3 border-t border-panel-border">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">AI Decision</div>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          {compositeScore > 70
            ? `Strong ${signal?.direction || 'positive'} signal detected. Multiple indicators align with high volume confirmation and favorable risk-reward.`
            : compositeScore > 55
            ? `Moderate signal detected. Some indicators align but confirmation from additional factors would strengthen the case.`
            : compositeScore > 40
            ? `Weak signal. Mixed indicators suggest waiting for clearer setup or additional confirmation.`
            : `No actionable signal. Indicators are conflicting or insufficient momentum for trade entry.`
          }
        </p>
      </div>
    </div>
  );
}

function QualityBadge({ label, score }: { label: string; score: number }) {
  return (
    <div className={`rounded-lg px-2 py-1.5 text-center ${
      score > 70 ? 'bg-up/10' : score > 50 ? 'bg-warn/10' : 'bg-down/10'
    }`}>
      <div className="text-[9px] text-gray-500">{label}</div>
      <div className={`text-xs font-bold ${
        score > 70 ? 'text-up' : score > 50 ? 'text-warn' : 'text-down'
      }`}>
        {Math.round(score)}
      </div>
    </div>
  );
}
