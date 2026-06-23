import { create } from 'zustand';
import type { ScannerResult, ViewMode, SortField, SortDirection, MarketBreadth, SectorData } from './types';

interface AppState {
  // Auth
  apiToken: string;
  isConnected: boolean;
  connectionError: string;
  setApiToken: (token: string) => void;
  setConnected: (val: boolean) => void;
  setConnectionError: (err: string) => void;

  // View
  activeView: ViewMode;
  setActiveView: (v: ViewMode) => void;

  // Scanner
  scannerResults: ScannerResult[];
  setScannerResults: (r: ScannerResult[]) => void;
  isScanning: boolean;
  setIsScanning: (v: boolean) => void;
  lastScanTime: number;
  setLastScanTime: (t: number) => void;

  // Selected stock
  selectedSymbol: string | null;
  setSelectedSymbol: (s: string | null) => void;

  // Sorting
  sortField: SortField;
  sortDirection: SortDirection;
  setSortField: (f: SortField) => void;
  setSortDirection: (d: SortDirection) => void;

  // Filters
  sectorFilter: string;
  setSectorFilter: (s: string) => void;
  signalFilter: 'all' | 'long' | 'short';
  setSignalFilter: (f: 'all' | 'long' | 'short') => void;
  minScore: number;
  setMinScore: (s: number) => void;

  // Market data
  marketBreadth: MarketBreadth | null;
  setMarketBreadth: (m: MarketBreadth) => void;
  sectorData: SectorData[];
  setSectorData: (s: SectorData[]) => void;

  // Watchlist
  watchlist: string[];
  toggleWatchlist: (s: string) => void;

  // Mobile
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  apiToken: '',
  isConnected: false,
  connectionError: '',
  setApiToken: (token) => set({ apiToken: token }),
  setConnected: (val) => set({ isConnected: val }),
  setConnectionError: (err) => set({ connectionError: err }),

  activeView: 'scanner',
  setActiveView: (v) => set({ activeView: v }),

  scannerResults: [],
  setScannerResults: (r) => set({ scannerResults: r }),
  isScanning: false,
  setIsScanning: (v) => set({ isScanning: v }),
  lastScanTime: 0,
  setLastScanTime: (t) => set({ lastScanTime: t }),

  selectedSymbol: null,
  setSelectedSymbol: (s) => set({ selectedSymbol: s }),

  sortField: 'compositeScore',
  sortDirection: 'desc',
  setSortField: (f) => set({ sortField: f }),
  setSortDirection: (d) => set({ sortDirection: d }),

  sectorFilter: 'All',
  setSectorFilter: (s) => set({ sectorFilter: s }),
  signalFilter: 'all',
  setSignalFilter: (f) => set({ signalFilter: f }),
  minScore: 0,
  setMinScore: (s) => set({ minScore: s }),

  marketBreadth: null,
  setMarketBreadth: (m) => set({ marketBreadth: m }),
  sectorData: [],
  setSectorData: (s) => set({ sectorData: s }),

  watchlist: [],
  toggleWatchlist: (s) => set((state) => ({
    watchlist: state.watchlist.includes(s)
      ? state.watchlist.filter((w) => w !== s)
      : [...state.watchlist, s],
  })),

  isMobileSidebarOpen: false,
  setMobileSidebarOpen: (v) => set({ isMobileSidebarOpen: v }),
}));
