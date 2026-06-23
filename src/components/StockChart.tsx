import { useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries, type IChartApi, type ISeriesApi, type CandlestickData, type Time } from 'lightweight-charts';
import type { CandleData, SupportResistance, TradeSignal } from '../types';

interface Props {
  candles: CandleData[];
  levels: SupportResistance[];
  signal: TradeSignal | null;
  vwap: number;
  ema9: number;
  ema20: number;
  symbol: string;
}

export default function StockChart({ candles, levels, signal, vwap, ema9, ema20, symbol }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const createChartInstance = useCallback(() => {
    if (!containerRef.current) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = containerRef.current;
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.3)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.3)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(59, 130, 246, 0.3)', width: 1 },
        horzLine: { color: 'rgba(59, 130, 246, 0.3)', width: 1 },
      },
      rightPriceScale: {
        borderColor: 'rgba(51, 65, 85, 0.5)',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: 'rgba(51, 65, 85, 0.5)',
        timeVisible: true,
        secondsVisible: false,
      },
      width: container.clientWidth,
      height: container.clientHeight,
    });

    chartRef.current = chart;

    // Candlestick series (v5 API)
    const candleSeries: ISeriesApi<'Candlestick'> = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Volume series (v5 API)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // Set data
    if (candles.length > 0) {
      const candleData: CandlestickData<Time>[] = candles.map(c => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      candleSeries.setData(candleData);

      const volData = candles.map(c => ({
        time: c.time as Time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
      }));
      volumeSeries.setData(volData);

      // Add price lines for support/resistance
      const sortedLevels = [...levels].sort((a, b) => b.strength - a.strength).slice(0, 6);
      for (const level of sortedLevels) {
        const isSupport = level.type === 'support';
        candleSeries.createPriceLine({
          price: level.price,
          color: isSupport ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
          lineWidth: level.strength > 70 ? 2 : 1,
          lineStyle: level.strength > 60 ? 0 : 2,
          axisLabelVisible: true,
          title: `${isSupport ? 'S' : 'R'} (${Math.round(level.strength)}%)`,
        });
      }

      // VWAP line
      if (vwap > 0) {
        candleSeries.createPriceLine({
          price: vwap,
          color: 'rgba(168, 85, 247, 0.6)',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'VWAP',
        });
      }

      // EMA lines
      if (ema9 > 0) {
        candleSeries.createPriceLine({
          price: ema9,
          color: 'rgba(59, 130, 246, 0.5)',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: false,
          title: 'EMA9',
        });
      }
      if (ema20 > 0) {
        candleSeries.createPriceLine({
          price: ema20,
          color: 'rgba(251, 191, 36, 0.5)',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: false,
          title: 'EMA20',
        });
      }

      // Trade signal lines
      if (signal) {
        candleSeries.createPriceLine({
          price: signal.entry,
          color: 'rgba(59, 130, 246, 0.8)',
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: `Entry ${signal.direction}`,
        });
        candleSeries.createPriceLine({
          price: signal.stopLoss,
          color: 'rgba(239, 68, 68, 0.8)',
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: 'Stop Loss',
        });
        candleSeries.createPriceLine({
          price: signal.target1,
          color: 'rgba(34, 197, 94, 0.6)',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'T1',
        });
        candleSeries.createPriceLine({
          price: signal.target2,
          color: 'rgba(34, 197, 94, 0.8)',
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: 'T2',
        });
        candleSeries.createPriceLine({
          price: signal.target3,
          color: 'rgba(34, 197, 94, 0.4)',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'T3',
        });
      }

      chart.timeScale().fitContent();
    }

    // Handle resize
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, levels, signal, vwap, ema9, ema20]);

  useEffect(() => {
    const cleanup = createChartInstance();
    return cleanup;
  }, [createChartInstance]);

  return (
    <div className="relative w-full h-full min-h-[300px]">
      {/* Chart legend */}
      <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1.5 text-[10px]">
        <span className="px-1.5 py-0.5 rounded bg-panel/80 text-white font-bold">{symbol}</span>
        <span className="px-1.5 py-0.5 rounded bg-panel/80 text-purple-400">VWAP</span>
        <span className="px-1.5 py-0.5 rounded bg-panel/80 text-brand-400">EMA9</span>
        <span className="px-1.5 py-0.5 rounded bg-panel/80 text-yellow-400">EMA20</span>
        <span className="px-1.5 py-0.5 rounded bg-panel/80 text-up">Support</span>
        <span className="px-1.5 py-0.5 rounded bg-panel/80 text-down">Resistance</span>
      </div>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
