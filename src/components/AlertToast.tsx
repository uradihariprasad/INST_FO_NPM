import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import type { TradeSignal } from '../types';
import { X, TrendingUp, TrendingDown, Bell } from 'lucide-react';

interface Alert {
  id: string;
  signal: TradeSignal;
  timestamp: number;
}

export default function AlertToast() {
  const { scannerResults, setSelectedSymbol, setActiveView } = useStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [seenSignals, setSeenSignals] = useState<Set<string>>(new Set());

  // Watch for new high-confidence signals
  useEffect(() => {
    const highConfSignals = scannerResults
      .filter(r => r.signal && r.signal.confidence >= 75)
      .map(r => r.signal!)
      .filter(s => !seenSignals.has(`${s.symbol}-${s.direction}`));

    if (highConfSignals.length > 0) {
      const newAlerts: Alert[] = highConfSignals.map(s => ({
        id: `${s.symbol}-${s.direction}-${Date.now()}`,
        signal: s,
        timestamp: Date.now(),
      }));

      setAlerts(prev => [...prev, ...newAlerts].slice(-3)); // Keep max 3
      setSeenSignals(prev => {
        const next = new Set(prev);
        highConfSignals.forEach(s => next.add(`${s.symbol}-${s.direction}`));
        return next;
      });
    }
  }, [scannerResults, seenSignals]);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (alerts.length === 0) return;
    const timer = setInterval(() => {
      setAlerts(prev => prev.filter(a => Date.now() - a.timestamp < 8000));
    }, 1000);
    return () => clearInterval(timer);
  }, [alerts]);

  const dismiss = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const handleClick = useCallback((signal: TradeSignal) => {
    setSelectedSymbol(signal.symbol);
    setActiveView('chart');
  }, [setSelectedSymbol, setActiveView]);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-xs w-full">
      {alerts.map(alert => {
        const { signal } = alert;
        const isLong = signal.direction === 'LONG';

        return (
          <div
            key={alert.id}
            className="glass-panel rounded-xl p-3 animate-slide-up cursor-pointer hover:border-brand-500/50 transition-colors"
            onClick={() => handleClick(signal)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isLong ? 'bg-up/15' : 'bg-down/15'
                }`}>
                  {isLong ? <TrendingUp size={16} className="text-up" /> : <TrendingDown size={16} className="text-down" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Bell size={10} className="text-warn" />
                    <span className="text-xs font-bold text-white">{signal.symbol}</span>
                    <span className={`text-[10px] font-bold ${isLong ? 'text-up' : 'text-down'}`}>
                      {signal.direction}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Entry ₹{signal.entry.toFixed(2)} • Target ₹{signal.target2.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Confidence: <span className="text-up font-bold">{signal.confidence}%</span>
                    {' '}• R:R {signal.riskReward.toFixed(1)}:1
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismiss(alert.id); }}
                className="text-gray-600 hover:text-gray-400 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
