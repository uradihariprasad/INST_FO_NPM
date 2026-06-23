import { useStore } from '../store';
import { Activity, BarChart3, Grid3X3, Menu, Settings, Wifi, WifiOff, X } from 'lucide-react';

export default function Header() {
  const {
    isConnected, activeView, setActiveView,
    lastScanTime, isScanning, scannerResults,
    isMobileSidebarOpen, setMobileSidebarOpen,
    apiToken,
  } = useStore();

  const elapsed = lastScanTime ? Math.round((Date.now() - lastScanTime) / 1000) : 0;
  const topSignals = scannerResults.filter(r => r.signal && r.signal.confidence > 60).length;
  const hasLiveData = isConnected && apiToken;

  const navItems: Array<{ key: typeof activeView; label: string; icon: React.ReactNode }> = [
    { key: 'scanner', label: 'Scanner', icon: <Activity size={16} /> },
    { key: 'chart', label: 'Charts', icon: <BarChart3 size={16} /> },
    { key: 'heatmap', label: 'Heatmap', icon: <Grid3X3 size={16} /> },
    { key: 'options', label: 'Settings', icon: <Settings size={16} /> },
  ];

  return (
    <header className="glass-panel sticky top-0 z-50 flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 border-b border-panel-border">
      {/* Left: Logo + Nav */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          className="lg:hidden p-1.5 rounded hover:bg-panel-light"
          onClick={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
        >
          {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
            F0
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-white leading-none">INST-F0</h1>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">Scanner</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-0.5 ml-2">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeView === item.key
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-panel-light'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right: Status indicators */}
      <div className="flex items-center gap-2 sm:gap-3">
        {topSignals > 0 && (
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-up/10 text-up text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" />
            {topSignals} signals
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-gray-400">
          {isScanning ? (
            <span className="flex items-center gap-1 text-brand-400">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              <span className="hidden sm:inline">Scanning...</span>
            </span>
          ) : lastScanTime > 0 ? (
            <span className="hidden sm:inline">{elapsed}s ago</span>
          ) : null}
        </div>

        {/* Connection status */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          hasLiveData ? 'bg-up/10 text-up' : 'bg-warn/10 text-warn'
        }`}>
          {hasLiveData ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className="hidden sm:inline">{hasLiveData ? 'Live' : 'Demo'}</span>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex md:hidden items-center gap-0.5 absolute bottom-0 left-0 right-0 translate-y-full bg-panel border-b border-panel-border px-2 py-1 z-40">
        {navItems.map(item => (
          <button
            key={item.key}
            onClick={() => setActiveView(item.key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded text-[10px] font-medium transition-all ${
              activeView === item.key
                ? 'text-brand-400 bg-brand-600/10'
                : 'text-gray-500'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
}
