import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  AreaSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';
import type { Time } from 'lightweight-charts';
import {
  Search, RefreshCw, TrendingUp, Activity,
  ChevronDown, AlertCircle, Maximize2, Minimize2
} from 'lucide-react';

const API_BASE = 'https://stock.indianapi.in';
const API_KEY  = 'sk-live-ihdJabhIypHzFrJyenJqQT31GfAERUPc3syC9xHC';

// ── Types ────────────────────────────────────────────────────────────────────
interface RawCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

type Period    = '1m' | '6m' | '1yr' | '3yr' | '5yr' | '10yr' | 'max';
type ChartType = 'candlestick' | 'line' | 'area';
type Indicator = 'sma20' | 'sma50' | 'ema20' | 'volume' | 'rsi' | 'macd' | 'bb';

const PERIODS: { label: string; value: Period }[] = [
  { label: '1M',  value: '1m'   },
  { label: '6M',  value: '6m'   },
  { label: '1Y',  value: '1yr'  },
  { label: '3Y',  value: '3yr'  },
  { label: '5Y',  value: '5yr'  },
  { label: '10Y', value: '10yr' },
  { label: 'Max', value: 'max'  },
];

const INDICATORS: { label: string; value: Indicator; color: string }[] = [
  { label: 'SMA 20',          value: 'sma20',  color: '#f59e0b' },
  { label: 'SMA 50',          value: 'sma50',  color: '#8b5cf6' },
  { label: 'EMA 20',          value: 'ema20',  color: '#06b6d4' },
  { label: 'Bollinger Bands', value: 'bb',     color: '#ec4899' },
  { label: 'RSI',             value: 'rsi',    color: '#10b981' },
  { label: 'MACD',            value: 'macd',   color: '#ef4444' },
];

const POPULAR = [
  'Tata Steel','Reliance','Infosys','HDFC Bank','TCS',
  'Wipro','ICICI Bank','SBI','Bajaj Finance','Adani Ports',
];

// ── Math helpers ─────────────────────────────────────────────────────────────
const calcSMA = (data: number[], period: number): (number | null)[] =>
  data.map((_, i) =>
    i < period - 1
      ? null
      : data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
  );

const calcEMA = (data: number[], period: number): (number | null)[] => {
  if (data.length < period) return data.map(() => null);
  const k = 2 / (period + 1);
  const result: (number | null)[] = new Array(period - 1).fill(null);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
};

const calcRSI = (data: number[], period = 14): (number | null)[] => {
  if (data.length <= period) return data.map(() => null);
  const result: (number | null)[] = new Array(period).fill(null);
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = data[i] - data[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  for (let i = period + 1; i < data.length; i++) {
    const d = data[i] - data[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
};

const calcMACD = (data: number[]) => {
  const ema12 = calcEMA(data, 12);
  const ema26 = calcEMA(data, 26);
  const macdLine = ema12.map((v, i) =>
    v != null && ema26[i] != null ? v - ema26[i]! : null
  );
  const validMacd = macdLine.filter((v): v is number => v != null);
  const signalRaw = calcEMA(validMacd, 9);
  let si = 0;
  const signalFull = macdLine.map(v => (v == null ? null : (signalRaw[si++] ?? null)));
  const histogram  = macdLine.map((v, i) =>
    v != null && signalFull[i] != null ? v - signalFull[i]! : null
  );
  return { macdLine, signalLine: signalFull, histogram };
};

const calcBB = (data: number[], period = 20, mult = 2) =>
  calcSMA(data, period).map((mid, i) => {
    if (mid == null) return { upper: null, mid: null, lower: null };
    const slice = data.slice(i - period + 1, i + 1);
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mid) ** 2, 0) / period);
    return { upper: mid + mult * std, mid, lower: mid - mult * std };
  });

// ── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg: '#0f172a', panel: '#1e293b', grid: '#1e293b',
  text: '#94a3b8', border: '#334155',
  up: '#22c55e', down: '#ef4444',
};

const baseChartOpts = (w: number, h: number) => ({
  width: w,
  height: h,
  layout: {
    background: { type: ColorType.Solid, color: T.bg },
    textColor: T.text,
  },
  grid: {
    vertLines: { color: T.grid },
    horzLines: { color: T.grid },
  },
  crosshair: { mode: CrosshairMode.Normal },
  rightPriceScale: { borderColor: T.border },
  timeScale: { borderColor: T.border, timeVisible: true, secondsVisible: false },
});

// ── Sub-chart (RSI / MACD) ───────────────────────────────────────────────────
const SubChart = React.memo(({ candles, indicator }: { candles: RawCandle[]; indicator: 'rsi' | 'macd' }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !candles.length) return;
    const el = ref.current;
    const chart = createChart(el, baseChartOpts(el.clientWidth, el.clientHeight));
    const times = candles.map(c => c.date as Time);
    const closes = candles.map(c => c.close);

    if (indicator === 'rsi') {
      const rsi = calcRSI(closes);
      const s = chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 2 });
      s.setData(
        rsi
          .map((v, i) => ({ time: times[i], value: v ?? 0 }))
          .filter((_, i) => rsi[i] != null)
      );
      const ob = chart.addSeries(LineSeries, { color: 'rgba(239,68,68,0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed });
      const os = chart.addSeries(LineSeries, { color: 'rgba(34,197,94,0.5)',  lineWidth: 1, lineStyle: LineStyle.Dashed });
      ob.setData(times.map(t => ({ time: t, value: 70 })));
      os.setData(times.map(t => ({ time: t, value: 30 })));
    } else {
      const { macdLine, signalLine, histogram } = calcMACD(closes);
      const hist = chart.addSeries(HistogramSeries, { color: '#6b7280' });
      hist.setData(
        histogram
          .map((v, i) => ({ time: times[i], value: v ?? 0, color: (v ?? 0) >= 0 ? T.up : T.down }))
          .filter((_, i) => histogram[i] != null)
      );
      const ml = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2 });
      ml.setData(macdLine.map((v, i) => ({ time: times[i], value: v ?? 0 })).filter((_, i) => macdLine[i] != null));
      const sl = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1 });
      sl.setData(signalLine.map((v, i) => ({ time: times[i], value: v ?? 0 })).filter((_, i) => signalLine[i] != null));
    }

    chart.timeScale().fitContent();
    const ro = new ResizeObserver(() => {
      if (el) chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);
    return () => { chart.remove(); ro.disconnect(); };
  }, [candles, indicator]);

  return <div ref={ref} className="w-full h-full" />;
});

// ── Main Chart ───────────────────────────────────────────────────────────────
const MainChart = React.memo(({
  candles, chartType, indicators,
}: {
  candles: RawCandle[];
  chartType: ChartType;
  indicators: Indicator[];
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !candles.length) return;
    const el = ref.current;
    const chart = createChart(el, baseChartOpts(el.clientWidth, el.clientHeight));
    const times  = candles.map(c => c.date as Time);
    const closes = candles.map(c => c.close);

    // ── Main price series ──
    if (chartType === 'candlestick') {
      const s = chart.addSeries(CandlestickSeries, {
        upColor: T.up, downColor: T.down,
        borderUpColor: T.up, borderDownColor: T.down,
        wickUpColor: T.up, wickDownColor: T.down,
      });
      s.setData(candles.map(c => ({
        time: c.date as Time,
        open: c.open, high: c.high, low: c.low, close: c.close,
      })));
    } else if (chartType === 'line') {
      const s = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2 });
      s.setData(candles.map(c => ({ time: c.date as Time, value: c.close })));
    } else {
      // area
      const s = chart.addSeries(AreaSeries, {
        lineColor: '#3b82f6',
        topColor: 'rgba(59,130,246,0.35)',
        bottomColor: 'rgba(59,130,246,0.02)',
        lineWidth: 2,
      });
      s.setData(candles.map(c => ({ time: c.date as Time, value: c.close })));
    }

    // ── Overlay indicators ──
    if (indicators.includes('sma20')) {
      const sma = calcSMA(closes, 20);
      const s = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1 });
      s.setData(sma.map((v, i) => ({ time: times[i], value: v ?? 0 })).filter((_, i) => sma[i] != null));
    }
    if (indicators.includes('sma50')) {
      const sma = calcSMA(closes, 50);
      const s = chart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 1 });
      s.setData(sma.map((v, i) => ({ time: times[i], value: v ?? 0 })).filter((_, i) => sma[i] != null));
    }
    if (indicators.includes('ema20')) {
      const ema = calcEMA(closes, 20);
      const s = chart.addSeries(LineSeries, { color: '#06b6d4', lineWidth: 1 });
      s.setData(ema.map((v, i) => ({ time: times[i], value: v ?? 0 })).filter((_, i) => ema[i] != null));
    }
    if (indicators.includes('bb')) {
      const bb = calcBB(closes);
      const upper = chart.addSeries(LineSeries, { color: 'rgba(236,72,153,0.8)', lineWidth: 1, lineStyle: LineStyle.Dashed });
      const mid   = chart.addSeries(LineSeries, { color: 'rgba(236,72,153,0.4)', lineWidth: 1 });
      const lower = chart.addSeries(LineSeries, { color: 'rgba(236,72,153,0.8)', lineWidth: 1, lineStyle: LineStyle.Dashed });
      const toData = (key: 'upper' | 'mid' | 'lower') =>
        bb.map((b, i) => ({ time: times[i], value: b[key] ?? 0 })).filter((_, i) => bb[i][key] != null);
      upper.setData(toData('upper'));
      mid.setData(toData('mid'));
      lower.setData(toData('lower'));
    }
    if (indicators.includes('volume')) {
      const vol = chart.addSeries(HistogramSeries, {
        color: 'rgba(107,114,128,0.5)',
        priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
      });
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      vol.setData(candles.map(c => ({
        time: c.date as Time,
        value: c.volume ?? 0,
        color: c.close >= c.open ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)',
      })));
    }

    chart.timeScale().fitContent();
    const ro = new ResizeObserver(() => {
      if (el) chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);
    return () => { chart.remove(); ro.disconnect(); };
  }, [candles, chartType, indicators]);

  return <div ref={ref} className="w-full h-full" />;
});

// ── Main page ────────────────────────────────────────────────────────────────
export default function TradingChartPage() {
  const [stockName,     setStockName]     = useState('Tata Steel');
  const [inputVal,      setInputVal]      = useState('Tata Steel');
  const [period,        setPeriod]        = useState<Period>('1yr');
  const [chartType,     setChartType]     = useState<ChartType>('line');
  const [indicators,    setIndicators]    = useState<Indicator[]>(['volume', 'sma20']);
  const [candles,       setCandles]       = useState<RawCandle[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [stockInfo,     setStockInfo]     = useState<any>(null);
  const [fullscreen,    setFullscreen]    = useState(false);
  const [showInd,       setShowInd]       = useState(false);
  const [suggestions,   setSuggestions]   = useState<string[]>([]);

  // ── Parse candles from the real API response ──
  // Shape: { datasets: [{ metric: "Price", label: "...", values: [["2025-05-26","162.51"], ...] }] }
  // Values are [date, price] — line data only (no OHLCV from this endpoint)
  const parseCandles = (json: any): RawCandle[] => {
    const datasets: any[] = json?.datasets || [];
    if (!datasets.length) return [];

    // Find the price dataset (NSE preferred, then BSE, then first)
    const priceDs = datasets.find((d: any) => d.label?.includes('NSE'))
      || datasets.find((d: any) => d.metric === 'Price' || d.label?.includes('Price'))
      || datasets[0];

    const values: any[] = priceDs?.values || [];
    if (!values.length) return [];

    return values
      .map((row: any) => {
        // row is ["2025-05-26", "162.51"] or { date, value/close }
        if (Array.isArray(row)) {
          const price = parseFloat(row[1]);
          return {
            date:   String(row[0]).substring(0, 10),
            open:   price,
            high:   price,
            low:    price,
            close:  price,
            volume: undefined,
          };
        }
        const price = parseFloat(row.value || row.close || row.price || 0);
        return {
          date:   String(row.date || row.Date || '').substring(0, 10),
          open:   price, high: price, low: price, close: price,
        };
      })
      .filter(c => c.date.length >= 10 && !isNaN(c.close) && c.close > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const fetchChart = useCallback(async (name: string, per: Period) => {
    if (!name.trim()) return;
    setLoading(true); setError(null);
    try {
      const [histRes, infoRes] = await Promise.allSettled([
        fetch(`${API_BASE}/historical_data?stock_name=${encodeURIComponent(name)}&period=${per}&filter=price`,
          { headers: { 'x-api-key': API_KEY } }),
        fetch(`${API_BASE}/stock?name=${encodeURIComponent(name)}`,
          { headers: { 'x-api-key': API_KEY } }),
      ]);

      if (histRes.status === 'fulfilled' && histRes.value.ok) {
        const json = await histRes.value.json();
        const parsed = parseCandles(json);
        setCandles(parsed);
        if (!parsed.length) setError('No chart data returned for this stock. Try a different name or period.');
      } else {
        setError('Failed to fetch historical data. Check the stock name and try again.');
        setCandles([]);
      }

      if (infoRes.status === 'fulfilled' && infoRes.value.ok) {
        setStockInfo(await infoRes.value.json());
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
      setCandles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchChart(stockName, period); }, [stockName, period, fetchChart]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const v = inputVal.trim();
    if (v) { setStockName(v); setSuggestions([]); }
  };

  const toggleIndicator = (ind: Indicator) =>
    setIndicators(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]);

  const subIndicators     = indicators.filter(i => i === 'rsi' || i === 'macd');
  const overlayIndicators = indicators.filter(i => i !== 'rsi' && i !== 'macd');

  const lastC  = candles[candles.length - 1];
  const prevC  = candles[candles.length - 2];
  const change = lastC && prevC ? lastC.close - prevC.close : 0;
  const pct    = prevC ? (change / prevC.close) * 100 : 0;
  const isUp   = change >= 0;
  const livePrice = stockInfo?.currentPrice?.NSE || stockInfo?.currentPrice?.BSE || lastC?.close;

  return (
    <div className={`flex flex-col bg-[#0f172a] text-slate-200 ${fullscreen ? 'fixed inset-0 z-50' : 'h-screen'}`}
      onClick={() => showInd && setShowInd(false)}
    >
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#1e293b] border-b border-slate-700 flex-wrap shrink-0">

        {/* Search */}
        <form onSubmit={handleSearch} className="relative flex items-center gap-1.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={inputVal}
              onChange={e => {
                setInputVal(e.target.value);
                setSuggestions(
                  e.target.value.length > 0
                    ? POPULAR.filter(s => s.toLowerCase().includes(e.target.value.toLowerCase()))
                    : []
                );
              }}
              onBlur={() => setTimeout(() => setSuggestions([]), 150)}
              placeholder="Search stock…"
              className="pl-8 pr-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
            />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 overflow-hidden">
                {suggestions.map(s => (
                  <button key={s} type="button"
                    onMouseDown={() => { setInputVal(s); setStockName(s); setSuggestions([]); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 text-slate-200 transition"
                  >{s}</button>
                ))}
              </div>
            )}
          </div>
          <button type="submit"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
          >Go</button>
        </form>

        <div className="w-px h-5 bg-slate-600 shrink-0" />

        {/* Period buttons */}
        <div className="flex items-center gap-0.5">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                period === p.value ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >{p.label}</button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-600 shrink-0" />

        {/* Chart type — line & area only (API returns price-only data) */}
        <div className="flex items-center gap-0.5">
          {([['line', TrendingUp, 'Line'], ['area', Activity, 'Area']] as const).map(([type, Icon, label]) => (
            <button key={type} onClick={() => setChartType(type)} title={label}
              className={`p-1.5 rounded transition ${chartType === type ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            ><Icon className="w-4 h-4" /></button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-600 shrink-0" />

        {/* Indicators */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowInd(!showInd)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-xs font-medium text-slate-200 transition"
          >
            Indicators
            {indicators.length > 0 && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">{indicators.length}</span>
            )}
            <ChevronDown className="w-3 h-3" />
          </button>

          {showInd && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 p-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider px-2 mb-1">Overlay</p>
              {INDICATORS.filter(i => !['rsi','macd'].includes(i.value)).map(ind => (
                <button key={ind.value} onClick={() => toggleIndicator(ind.value)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition ${
                    indicators.includes(ind.value) ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ind.color }} />
                  {ind.label}
                  {indicators.includes(ind.value) && <span className="ml-auto text-blue-400 text-xs">✓</span>}
                </button>
              ))}
              <p className="text-[10px] text-slate-500 uppercase tracking-wider px-2 mt-2 mb-1">Sub-chart</p>
              {INDICATORS.filter(i => ['rsi','macd'].includes(i.value)).map(ind => (
                <button key={ind.value} onClick={() => toggleIndicator(ind.value)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition ${
                    indicators.includes(ind.value) ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ind.color }} />
                  {ind.label}
                  {indicators.includes(ind.value) && <span className="ml-auto text-blue-400 text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Refresh + Fullscreen */}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => fetchChart(stockName, period)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
            title="Refresh"
          ><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} /></button>
          <button onClick={() => setFullscreen(!fullscreen)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >{fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
        </div>
      </div>

      {/* ── Info bar ── */}
      <div className="flex items-center gap-4 px-4 py-2 bg-[#0f172a] border-b border-slate-800 flex-wrap shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-lg">{stockName}</span>
          {stockInfo?.industry && <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{stockInfo.industry}</span>}
        </div>
        {livePrice && (
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-xl">
              ₹{Number(livePrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {lastC && (
              <span className={`text-sm font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                {isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{pct.toFixed(2)}%)
              </span>
            )}
          </div>
        )}
        {lastC && (
          <div className="flex items-center gap-4 text-xs text-slate-400 ml-auto flex-wrap">
            <span>O <span className="text-slate-200 font-medium">{lastC.open.toFixed(2)}</span></span>
            <span>H <span className="text-green-400 font-medium">{lastC.high.toFixed(2)}</span></span>
            <span>L <span className="text-red-400 font-medium">{lastC.low.toFixed(2)}</span></span>
            <span>C <span className="text-slate-200 font-medium">{lastC.close.toFixed(2)}</span></span>
            {lastC.volume && <span>Vol <span className="text-slate-200 font-medium">{Number(lastC.volume).toLocaleString('en-IN')}</span></span>}
          </div>
        )}
      </div>

      {/* ── Quick picks ── */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f172a] border-b border-slate-800 overflow-x-auto shrink-0">
        <span className="text-[10px] text-slate-600 shrink-0 uppercase tracking-wider">Quick:</span>
        {POPULAR.map(s => (
          <button key={s}
            onClick={() => { setStockName(s); setInputVal(s); }}
            className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium transition ${
              stockName === s ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
            }`}
          >{s}</button>
        ))}
      </div>

      {/* ── Chart area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin" />
              <p className="text-slate-400 text-sm">Loading chart…</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-400 font-medium mb-1">Failed to load chart</p>
              <p className="text-slate-500 text-sm mb-4">{error}</p>
              <button onClick={() => fetchChart(stockName, period)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition inline-flex items-center gap-2"
              ><RefreshCw className="w-4 h-4" /> Retry</button>
            </div>
          </div>
        )}

        {!loading && !error && candles.length > 0 && (
          <>
            {/* Main chart */}
            <div className={`min-h-0 ${subIndicators.length > 0 ? 'flex-[3]' : 'flex-1'}`}>
              <MainChart candles={candles} chartType={chartType} indicators={overlayIndicators} />
            </div>

            {/* Sub-charts */}
            {subIndicators.map(ind => (
              <div key={ind} className="flex-1 min-h-0 border-t border-slate-800 relative" style={{ maxHeight: 140 }}>
                <span className="absolute top-1 left-2 text-[10px] text-slate-500 z-10 uppercase tracking-widest font-bold">
                  {ind === 'rsi' ? 'RSI (14)' : 'MACD (12,26,9)'}
                </span>
                <SubChart candles={candles} indicator={ind as 'rsi' | 'macd'} />
              </div>
            ))}
          </>
        )}

        {!loading && !error && candles.length === 0 && !error && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-500 text-sm">No data — try a different stock name or period</p>
          </div>
        )}
      </div>
    </div>
  );
}
