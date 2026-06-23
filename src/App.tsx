import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from './store';
import {
  runFullScan, generateMarketBreadth, generateSectorData,
  isUsingLiveData, getLiveError,
} from './engine/scanner';
import Header from './components/Header';
import MarketBreadthPanel from './components/MarketBreadth';
import FilterBar from './components/FilterBar';
import ScannerTable from './components/ScannerTable';
import TopMovers from './components/TopMovers';
import StockDetail from './components/StockDetail';
import Heatmap from './components/Heatmap';
import SettingsPanel from './components/SettingsPanel';
import SummaryBar from './components/SummaryBar';
import AlertToast from './components/AlertToast';
import { SCAN_INTERVAL_MS } from './constants';
import { Play, Pause, RefreshCw, Zap, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

export default function App() {
  const {
    activeView, isScanning, setIsScanning,
    setScannerResults, setLastScanTime,
    setMarketBreadth, setSectorData,
    setConnected, scannerResults,
    isMobileSidebarOpen, setMobileSidebarOpen,
    apiToken, connectionError, setConnectionError,
  } = useStore();

  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isAutoScan, setIsAutoScan] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [dataMode, setDataMode] = useState<'live' | 'simulated'>('simulated');
  const [, setScanCount] = useState(0);

  const scanInProgress = useRef(false);
  const scanCountRef = useRef(0);

  const performScan = useCallback(async () => {
    if (scanInProgress.current) return;
    scanInProgress.current = true;
    setIsScanning(true);

    try {
      const results = await runFullScan(apiToken || undefined);

      setScannerResults(results);
      setMarketBreadth(generateMarketBreadth(results));
      setSectorData(generateSectorData(results));
      setLastScanTime(Date.now());
      scanCountRef.current++;
      setScanCount(scanCountRef.current);

      const live = isUsingLiveData();
      setDataMode(live ? 'live' : 'simulated');
      setConnected(live);

      const err = getLiveError();
      if (apiToken && err) {
        setConnectionError(`Live failed: ${err} — using simulated`);
      } else {
        setConnectionError('');
      }

      console.log(`[Scan #${scanCountRef.current}] ${live ? 'LIVE' : 'SIM'} | ${results.length} stocks | ${results.filter(r => r.signal).length} signals`);

    } catch (error) {
      console.error('[Scan] Error:', error);
      setConnectionError(error instanceof Error ? error.message : 'Scan failed');
    } finally {
      scanInProgress.current = false;
      setIsScanning(false);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiToken]);

  // Initial scan on mount
  useEffect(() => {
    performScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto scan interval
  useEffect(() => {
    if (isAutoScan) {
      scanIntervalRef.current = setInterval(() => { performScan(); }, SCAN_INTERVAL_MS);
    }
    return () => {
      if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    };
  }, [isAutoScan, performScan]);

  // Re-scan when API token changes
  useEffect(() => {
    if (apiToken) performScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiToken]);

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">INST-F0 Scanner</h1>
          <p className="text-sm text-gray-500 mb-4">F&O Momentum & Trade Intelligence</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-xs text-gray-600 mt-3">
            {apiToken ? 'Connecting to Upstox…' : 'Loading scanner…'}
          </p>
        </div>
      </div>
    );
  }

  const renderMainContent = () => {
    switch (activeView) {
      case 'scanner':
        return (
          <div className="space-y-3 animate-fade-in">
            {/* Error banner */}
            {connectionError && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-down/10 border border-down/20 text-xs text-down">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Connection issue</p>
                  <p className="text-down/70 mt-0.5">{connectionError}</p>
                </div>
              </div>
            )}

            <SummaryBar />
            <TopMovers />
            <FilterBar />
            <div className="glass-panel rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-panel-border">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-200">F&O Scanner</h2>
                  <span className="text-[10px] text-gray-500 px-1.5 py-0.5 rounded bg-panel-light">
                    {scannerResults.length} stocks
                  </span>
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    dataMode === 'live' ? 'bg-up/10 text-up' : 'bg-warn/10 text-warn'
                  }`}>
                    {dataMode === 'live' ? <Wifi size={10} /> : <WifiOff size={10} />}
                    {dataMode === 'live' ? 'LIVE' : 'SIM'}
                  </div>
                  {isScanning && (
                    <span className="flex items-center gap-1 text-[10px] text-brand-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                      Scanning
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={performScan}
                    disabled={isScanning}
                    className="p-1.5 rounded-lg hover:bg-panel-light text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    title="Refresh now"
                  >
                    <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
                  </button>
                  <button
                    onClick={() => setIsAutoScan(v => !v)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                      isAutoScan ? 'text-up bg-up/10' : 'text-gray-500 bg-panel-light'
                    }`}
                  >
                    {isAutoScan ? <Pause size={10} /> : <Play size={10} />}
                    <span className="hidden sm:inline">{isAutoScan ? 'Auto' : 'Paused'}</span>
                  </button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                <ScannerTable />
              </div>
            </div>
          </div>
        );
      case 'chart':
        return <StockDetail />;
      case 'heatmap':
        return <div className="animate-fade-in space-y-3"><SummaryBar /><Heatmap /></div>;
      case 'options':
        return <div className="animate-fade-in"><SettingsPanel /></div>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <AlertToast />
      <div className="h-9 md:hidden" />
      <div className="flex flex-1 overflow-hidden">
        <aside className={`
          fixed lg:relative inset-y-0 left-0 z-40
          w-64 xl:w-72 bg-panel border-r border-panel-border
          overflow-y-auto flex-shrink-0 transition-transform duration-300
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          top-12 lg:top-0
        `}>
          <div className="p-3 space-y-3">
            <MarketBreadthPanel />
            <WatchlistPanel />
          </div>
        </aside>
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
        )}
        <main className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
}

function WatchlistPanel() {
  const { watchlist, scannerResults, setSelectedSymbol, setActiveView, toggleWatchlist } = useStore();
  const watchedStocks = scannerResults.filter(r => watchlist.includes(r.stock.symbol));
  return (
    <div className="glass-panel rounded-xl p-3">
      <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
        <span>⭐ Watchlist</span>
        <span className="text-[10px] text-gray-600">{watchlist.length}</span>
      </h3>
      {watchedStocks.length === 0 ? (
        <p className="text-[10px] text-gray-600 text-center py-3">Click ⭐ on any stock</p>
      ) : (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {watchedStocks.map(r => (
            <div key={r.stock.symbol}
              className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-panel-light transition-colors cursor-pointer group"
              onClick={() => { setSelectedSymbol(r.stock.symbol); setActiveView('chart'); }}
            >
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); toggleWatchlist(r.stock.symbol); }}
                  className="text-warn text-[10px] opacity-70 group-hover:opacity-100">★</button>
                <div>
                  <span className="text-[11px] font-medium text-gray-200 block">{r.stock.symbol}</span>
                  {r.signal && (
                    <span className={`text-[8px] font-bold ${r.signal.direction === 'LONG' ? 'text-up' : 'text-down'}`}>
                      {r.signal.direction} {r.signal.confidence}%
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-400">₹{r.stock.ltp.toFixed(1)}</div>
                <div className={`text-[9px] font-bold ${r.stock.changePct > 0 ? 'text-up' : r.stock.changePct < 0 ? 'text-down' : 'text-gray-500'}`}>
                  {r.stock.changePct > 0 ? '+' : ''}{r.stock.changePct.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
