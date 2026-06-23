import { useState } from 'react';
import { useStore } from '../store';
import { validateToken } from '../services/upstoxApi';
import { Key, Shield, AlertCircle, CheckCircle, ExternalLink, Info, Zap, Wifi, WifiOff } from 'lucide-react';

export default function SettingsPanel() {
  const { apiToken, setApiToken, isConnected, setConnected, connectionError, setConnectionError } = useStore();
  const [tokenInput, setTokenInput] = useState(apiToken);
  const [isValidating, setIsValidating] = useState(false);

  const handleConnect = async () => {
    if (!tokenInput.trim()) {
      setConnectionError('Please enter your Upstox Access Token');
      return;
    }

    setIsValidating(true);
    setConnectionError('');

    try {
      const isValid = await validateToken(tokenInput.trim());
      
      if (isValid) {
        setApiToken(tokenInput.trim());
        setConnected(true);
        setConnectionError('');
      } else {
        setConnectionError('Invalid or expired token. Please check and try again.');
        setConnected(false);
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setConnected(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleDisconnect = () => {
    setApiToken('');
    setConnected(false);
    setTokenInput('');
    setConnectionError('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Connection Status */}
      <div className="glass-panel rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-4">
          <Key size={16} /> Upstox API Connection
        </h3>

        <div className={`flex items-center gap-3 p-3 rounded-lg mb-4 ${
          isConnected ? 'bg-up/10 border border-up/20' : 'bg-panel-light border border-panel-border'
        }`}>
          {isConnected ? (
            <>
              <div className="w-10 h-10 rounded-lg bg-up/20 flex items-center justify-center">
                <Wifi size={20} className="text-up" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-up">Connected - Live Data</p>
                <p className="text-[10px] text-gray-400">Token: {apiToken.slice(0, 12)}...{apiToken.slice(-8)}</p>
              </div>
              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-lg bg-down/10 text-down text-xs hover:bg-down/20 transition-colors"
              >
                Disconnect
              </button>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-lg bg-warn/20 flex items-center justify-center">
                <WifiOff size={20} className="text-warn" />
              </div>
              <div>
                <p className="text-sm font-medium text-warn">Not Connected</p>
                <p className="text-[10px] text-gray-400">Using simulated market data</p>
              </div>
            </>
          )}
        </div>

        {!isConnected && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Upstox Access Token</label>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste your Upstox access token here..."
                className="w-full bg-panel-light border border-panel-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              />
              <p className="text-[10px] text-gray-600 mt-1">
                The token is stored only in your browser's memory and never sent to any server except Upstox.
              </p>
            </div>

            {connectionError && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-down/10 border border-down/20">
                <AlertCircle size={14} className="text-down mt-0.5 flex-shrink-0" />
                <p className="text-xs text-down">{connectionError}</p>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={isValidating || !tokenInput.trim()}
              className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isValidating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Validating Token...
                </>
              ) : (
                <>
                  <Zap size={14} />
                  Connect & Fetch Live Data
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* How to get token */}
      <div className="glass-panel rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-3">
          <Info size={16} /> How to Get Your Access Token
        </h3>
        <div className="space-y-2.5 text-xs text-gray-400">
          <Step n={1} text="Login to Upstox Developer Portal and create an API app" />
          <Step n={2} text="Note your API Key (Client ID) and API Secret" />
          <Step n={3} text="Complete the OAuth2 login flow to get access token" />
          <Step n={4} text="Copy the access_token and paste it above" />
          <Step n={5} text="Token expires daily - you'll need to refresh it each trading day" />
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <a
            href="https://upstox.com/developer/api-documentation/authentication"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600/10 text-brand-400 text-xs hover:bg-brand-600/20 transition-colors"
          >
            <ExternalLink size={12} />
            API Documentation
          </a>
          <a
            href="https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=YOUR_API_KEY&redirect_uri=YOUR_REDIRECT_URI"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-panel-light text-gray-400 text-xs hover:bg-panel-light/80 transition-colors"
          >
            <Key size={12} />
            OAuth Login Flow
          </a>
        </div>
      </div>

      {/* Security notice */}
      <div className="glass-panel rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-3">
          <Shield size={16} /> Security & Privacy
        </h3>
        <div className="space-y-1.5 text-xs text-gray-400">
          <SecurityPoint text="Token stored only in browser memory (RAM) - cleared on refresh/close" />
          <SecurityPoint text="No data sent to any server except official Upstox API" />
          <SecurityPoint text="All API calls made directly from your browser (client-side)" />
          <SecurityPoint text="Open source code - verify security yourself" />
          <SecurityPoint text="Works offline with simulated data when not connected" />
        </div>
      </div>

      {/* Scanner Info */}
      <div className="glass-panel rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-3">
          <Zap size={16} /> Scanner Features
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            'Real-time F&O stock scanning (50 stocks)',
            'Multi-factor momentum scoring engine',
            'Dynamic support/resistance detection',
            'VWAP & EMA overlay analysis',
            'Volume profile & ratio analysis',
            'OI buildup/unwinding detection',
            'Sector rotation & money flow',
            'AI-powered trade signals',
            'Risk-reward optimization',
            'Confidence-based ranking',
            'Interactive TradingView charts',
            'Sector heatmap visualization',
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
              <CheckCircle size={10} className="text-up flex-shrink-0" />
              {feature}
            </div>
          ))}
        </div>
      </div>

      {/* Data Refresh Info */}
      <div className="glass-panel rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-3">Data Refresh Rates</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-panel-light rounded-lg p-2.5">
            <div className="text-lg font-bold text-brand-400">30s</div>
            <div className="text-[10px] text-gray-500">Scanner refresh</div>
          </div>
          <div className="bg-panel-light rounded-lg p-2.5">
            <div className="text-lg font-bold text-brand-400">5s</div>
            <div className="text-[10px] text-gray-500">Quote cache TTL</div>
          </div>
          <div className="bg-panel-light rounded-lg p-2.5">
            <div className="text-lg font-bold text-brand-400">1min</div>
            <div className="text-[10px] text-gray-500">Candle interval</div>
          </div>
          <div className="bg-panel-light rounded-lg p-2.5">
            <div className="text-lg font-bold text-brand-400">50</div>
            <div className="text-[10px] text-gray-500">Stocks scanned</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-5 h-5 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
        {n}
      </span>
      <span>{text}</span>
    </div>
  );
}

function SecurityPoint({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-up mt-0.5">✓</span>
      <span>{text}</span>
    </div>
  );
}
