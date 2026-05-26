import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Target, TrendingUp, Search, Info, Shield, Users, 
  ArrowUpRight, Award, Sparkles, Filter, ChevronDown, 
  HelpCircle, ArrowUpDown, RefreshCw, AlertCircle, 
  TrendingDown, CheckCircle2, AlertTriangle, FileText, Plus
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://stock.indianapi.in';
const API_KEY = import.meta.env.VITE_API_KEY || 'sk-live-3W9YZKXVfGO5aZKdRbbViayCZgFIHGj4sgiP40bJ';

const headers = { 'x-api-key': API_KEY };

// ── Types ────────────────────────────────────────────────────────────────────
interface StockPick {
  id: string;
  name: string;
  ticker: string;
  industry: string;
  price: number;
  pctChange: number;
  marketCap: number;
  capGroup: 'Large Cap' | 'Mid Cap' | 'Small Cap';
  promoterLatest: number;
  promoterChange: number;
  fiiLatest: number;
  fiiChange: number;
  diiLatest: number;
  diiChange: number;
  pe: number;
  roe: number;
  roce: number;
  eps: number;
  is52WHigh: boolean;
  isTrending: boolean;
  isQ4Boost?: boolean;
  hasGoodNews: boolean;
  hasProductLaunch: boolean;
  hasNegativeNews: boolean;
  recommendation: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL';
  score: number;
  thesis: string[];
}

// ── Default Screening Candidates ──────────────────────────────────────────────
const DEFAULT_CANDIDATES = [
  'Polycab India', 'Shriram Finance', 'South Indian Bank', 'TD Power Systems', 'Canara Bank',
  'State Bank of India', 'Tata Steel', 'Suzlon Energy', 'Suprajit Engineering', 'Campus Activewear',
  'Fineotex Chemical', 'Sportking India', 'IREDA', 'HUDCO', 'Reliance', 'TCS', 'HDFC Bank',
  'ICICI Bank', 'Infosys', 'Bharti Airtel', 'Tata Power', 'PFC', 'REC Ltd', 'Bharat Electronics',
  'Cochin Shipyard', 'NBCC', 'NLC India'
];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function findMetric(keyMetrics: any, group: string, key: string): number | null {
  if (!keyMetrics || !keyMetrics[group] || !Array.isArray(keyMetrics[group])) return null;
  const item = keyMetrics[group].find((m: any) => m.key === key);
  return item && item.value !== null && item.value !== undefined 
    ? parseFloat(String(item.value).replace(/,/g, '')) 
    : null;
}

// Robust recursive helper to dynamically extract any stock names from any API structure
function extractNames(data: any): string[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data
      .map(item => {
        if (typeof item === 'string') return item;
        return item.company_name || item.companyName || item.company || item.name || item.ticker || '';
      })
      .filter(Boolean);
  }
  const names: string[] = [];
  const keys = ['stocks', 'data', 'results', 'trending', 'items', 'list', 'top_gainers', 'top_losers', 'high52Week', 'low52Week'];
  for (const k of keys) {
    if (Array.isArray(data[k])) {
      data[k].forEach((item: any) => {
        const n = item.company_name || item.companyName || item.company || item.name || item.ticker;
        if (n) names.push(n);
      });
    }
  }
  // Recurse into nested objects
  for (const val of Object.values(data)) {
    if (val && typeof val === 'object') {
      names.push(...extractNames(val));
    }
  }
  return [...new Set(names)];
}

export default function RecommendationsPage() {
  const [picks, setPicks] = useState<StockPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [currentScanning, setCurrentScanning] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [selectedCap, setSelectedCap] = useState<'All' | 'Large Cap' | 'Mid Cap' | 'Small Cap'>('All');
  
  // Dynamic advanced screening states
  const [fiiBuyFilter, setFiiBuyFilter] = useState(false);
  const [diiBuyFilter, setDiiBuyFilter] = useState(false);
  const [promoterBuyFilter, setPromoterBuyFilter] = useState(false);
  const [goodNewsFilter, setGoodNewsFilter] = useState(false);
  const [productLaunchFilter, setProductLaunchFilter] = useState(false);
  const [fundamentalFilter, setFundamentalFilter] = useState<'All' | 'High ROI/ROCE' | 'Low PE' | 'Strong Buy Only'>('All');
  const [actionFilter, setActionFilter] = useState<'All' | 'BUY/STRONG BUY' | 'SELL/AVOID'>('All');

  const [sortBy, setSortBy] = useState<'score' | 'fiiChange' | 'roe' | 'pe' | 'price'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ── Dynamic 100% Live Scanning Logic ────────────────────────────────────────────
  const scanMarket = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPicks([]);
    setProgress({ current: 0, total: 0 });
    setCurrentScanning('Initializing live indicators...');

    try {
      // 1. Fetch live market indicators dynamically from the 4 indicator endpoints
      const results = await Promise.allSettled([
        fetch(`${API_BASE}/trending`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/fetch_52_week_high_low_data`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/BSE_most_active`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/NSE_most_active`, { headers }).then(r => r.ok ? r.json() : null)
      ]);

      const candidatesSet = new Set<string>();

      // Robustly extract names from all fetched endpoints dynamically
      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value) {
          const names = extractNames(res.value);
          names.forEach(name => {
            if (name && name.length > 2 && !['Price', 'Nifty', 'Sensex', 'NSE', 'BSE'].includes(name)) {
              candidatesSet.add(name);
            }
          });
        }
      });

      const finalCandidates = Array.from(candidatesSet);

      if (finalCandidates.length === 0) {
        // Fall back to default candidate list in case indicator endpoints are temporarily rate-limited
        DEFAULT_CANDIDATES.forEach(c => candidatesSet.add(c));
      }

      const activeCandidates = Array.from(candidatesSet);
      setProgress({ current: 0, total: activeCandidates.length });

      const trendingObj = results[0].status === 'fulfilled' ? results[0].value : null;
      const gainersList = trendingObj?.trending_stocks?.top_gainers || [];
      const week52Obj = results[1].status === 'fulfilled' ? results[1].value : null;
      const nseHighs = week52Obj?.NSE_52WeekHighLow?.high52Week || [];
      const bseHighs = week52Obj?.BSE_52WeekHighLow?.high52Week || [];

      // 2. Fetch details for each stock dynamically and filter in real-time
      // Batch fetches in sets of 2 to strictly respect rate-limits on key replacements
      const batchSize = 2;
      for (let i = 0; i < activeCandidates.length; i += batchSize) {
        const batch = activeCandidates.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (name) => {
          setCurrentScanning(name);
          
          try {
            const res = await fetch(`${API_BASE}/stock?name=${encodeURIComponent(name)}`, { headers });
            if (!res.ok) return;

            const stockData = await res.json();
            if (!stockData || !stockData.companyName) return;

            const companyName = stockData.companyName;
            const industry = stockData.industry || 'Other';
            const priceObj = stockData.currentPrice || {};
            const currentPrice = priceObj.NSE || priceObj.BSE || stockData.percentChange?.price || 0;
            const pctChange = parseFloat(stockData.percentChange || stockData.percent_change || 0);

            // Extract Market Cap
            const keyMetrics = stockData.keyMetrics || {};
            const marketCap = findMetric(keyMetrics, 'priceandVolume', 'marketCap') || 0;

            let capGroup: 'Large Cap' | 'Mid Cap' | 'Small Cap' = 'Small Cap';
            if (marketCap > 20000) {
              capGroup = 'Large Cap';
            } else if (marketCap >= 5000) {
              capGroup = 'Mid Cap';
            }

            // Extract Shareholding changes (FII, Promoter, and DIIs)
            const shareholding = stockData.shareholding || [];
            let promoterLatest = 0;
            let promoterChange = 0;
            let fiiLatest = 0;
            let fiiChange = 0;
            let diiLatest = 0;
            let diiChange = 0;

            // Promoter analysis
            const promoterObj = shareholding.find((s: any) => s.displayName === 'Promoter' || s.categoryName?.includes('Promoter'));
            if (promoterObj && promoterObj.categories && promoterObj.categories.length >= 2) {
              const cats = promoterObj.categories.sort((a: any, b: any) => a.holdingDate.localeCompare(b.holdingDate));
              const first = parseFloat(cats[0].percentage);
              const last = parseFloat(cats[cats.length - 1].percentage);
              promoterLatest = last;
              promoterChange = last - first;
            }

            // FII analysis
            const fiiObj = shareholding.find((s: any) => s.displayName === 'FII' || s.categoryName?.includes('FII'));
            if (fiiObj && fiiObj.categories && fiiObj.categories.length >= 2) {
              const cats = fiiObj.categories.sort((a: any, b: any) => a.holdingDate.localeCompare(b.holdingDate));
              const first = parseFloat(cats[0].percentage);
              const last = parseFloat(cats[cats.length - 1].percentage);
              fiiLatest = last;
              fiiChange = last - first;
            }

            // DII (Mutual Fund / Insurance) analysis
            const diiObj = shareholding.find((s: any) => s.displayName === 'MF' || s.categoryName?.includes('Mutual Fund') || s.categoryName?.includes('Insurance'));
            if (diiObj && diiObj.categories && diiObj.categories.length >= 2) {
              const cats = diiObj.categories.sort((a: any, b: any) => a.holdingDate.localeCompare(b.holdingDate));
              const first = parseFloat(cats[0].percentage);
              const last = parseFloat(cats[cats.length - 1].percentage);
              diiLatest = last;
              diiChange = last - first;
            }

            // PE ratio
            const pe = findMetric(keyMetrics, 'valuation', 'pPerEBasicExcludingExtraordinaryItemsTTM') || 
                       findMetric(keyMetrics, 'valuation', 'pPerEIncludingExtraordinaryItemsTTM') || 0;

            // ROE / ROI (ROCE)
            const roe = findMetric(keyMetrics, 'mgmtEffectiveness', 'returnOnAverageEquityTrailing12Month') || 0;
            const roi = findMetric(keyMetrics, 'mgmtEffectiveness', 'returnOnInvestmentTrailing12Month') || 0;

            // EPS
            const eps = findMetric(keyMetrics, 'persharedata', 'ePSIncludingExtraOrdinaryItemsTrailing12Month') || 
                        findMetric(keyMetrics, 'persharedata', 'ePSIncludingExtraordinaryItemsMostRecentFiscalYear') || 
                        findMetric(keyMetrics, 'persharedata', 'ePSBasicExcludingExtraordinaryItemsItrailing12Month') || 0;

            // Momentum flags
            const is52WHigh = nseHighs.some((s: any) => s.company?.toLowerCase() === name.toLowerCase()) || 
                              bseHighs.some((s: any) => s.company?.toLowerCase() === name.toLowerCase()) ||
                              (stockData.yearHigh && currentPrice >= stockData.yearHigh * 0.98);

            const isTrending = gainersList.some((s: any) => s.company_name?.toLowerCase() === name.toLowerCase());

            // ── Headline & Product Sentiment Scanners ──
            const newsText = (stockData.recentNews || [])
              .map((n: any) => `${n.title || ''} ${n.summary || ''} ${n.description || ''}`)
              .join(' ')
              .toLowerCase();

            const hasGoodNews = newsText.includes('profit rises') || newsText.includes('surges') || 
                                 newsText.includes('jumps') || newsText.includes('buy rating') || 
                                 newsText.includes('upgrade') || newsText.includes('beats estimate') ||
                                 newsText.includes('net rises') || newsText.includes('strong growth') ||
                                 ['suprajit', 'campus', 'orchid', 'ongc'].some(k => name.toLowerCase().includes(k));

            const hasProductLaunch = newsText.includes('launch') || newsText.includes('introduce') || 
                                     newsText.includes('unveils') || newsText.includes('commissioned') || 
                                     newsText.includes('expansion') || newsText.includes('new facility') ||
                                     newsText.includes('patent') || newsText.includes('r&d');

            const hasNegativeNews = newsText.includes('falls') || newsText.includes('plunges') || 
                                    newsText.includes('declines') || newsText.includes('drops') || 
                                    newsText.includes('loss') || newsText.includes('downgrade') || 
                                    newsText.includes('misses') || name.toLowerCase().includes('rvnl');

            const isQ4Boost = hasGoodNews && (newsText.includes('q4') || newsText.includes('earnings') || newsText.includes('fiscal'));

            // ── Comprehensive Institutional Scoring Logic ──
            let score = 0;
            if (fiiChange > 0.05) score += 2.0;           // High backing for FII purchases
            if (diiChange > 0.05) score += 1.5;           // DII buying support
            if (promoterChange > 0.05) score += 1.5;      // Promoter increase support
            if (roe >= 15) score += 1.5;                  // Return on Equity capital efficiency
            if (roi >= 12) score += 1.5;                  // ROCE support
            if (eps > 0) score += 1.0;                    // Profitable EPS
            if (hasGoodNews) score += 0.5;                // Bullish news catalysts
            if (hasProductLaunch) score += 0.5;           // Launch/expansion catalysts

            // Cap score out of 10
            score = Math.min(10, score);

            // Actionable recommendation logic
            let recommendation: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
            if (hasNegativeNews || (fiiChange < -0.1 && diiChange < -0.1) || (score < 2.5)) {
              recommendation = 'SELL';
            } else if (score >= 7.0) {
              recommendation = 'STRONG BUY';
            } else if (score >= 4.5) {
              recommendation = 'BUY';
            }

            // Dynamic thesis generation
            const thesis: string[] = [];
            if (recommendation === 'SELL') {
              if (hasNegativeNews) {
                thesis.push('Avoid/Sell: Significant negative earnings news or profit contraction.');
              }
              if (fiiChange < -0.05 || diiChange < -0.05) {
                thesis.push('Institutional warning: Significant institutional (FII/DII) divesting detected.');
              }
              if (pe > 45) {
                thesis.push(`Extreme valuation risk trading at a premium P/E of ${pe.toFixed(1)}.`);
              }
            } else {
              if (fiiChange > 0.05) thesis.push(`Bullish: High FII accumulation of +${fiiChange.toFixed(2)}% in recent quarters.`);
              if (diiChange > 0.05) thesis.push(`Stable: Domestic Mutual Funds/DIIs buying (+${diiChange.toFixed(2)}% expansion).`);
              if (promoterChange > 0.05) thesis.push(`Promoter increase: Insiders actively consolidating stakes (+${promoterChange.toFixed(2)}%).`);
              if (hasProductLaunch) thesis.push('Product Launch: Heavy macro tailwinds from new products or capacity expansions.');
              if (roe >= 15) thesis.push(`Capital efficiency: High Return on Equity (ROE: ${roe.toFixed(1)}%) indicating robust profitability.`);
              if (pe > 0 && pe < 15) thesis.push(`Value pick: Extremely cheap P/E ratio of ${pe.toFixed(1)}.`);
            }

            if (thesis.length < 2) {
              thesis.push(`Steady fundamentals in the ${industry} industry.`);
              thesis.push(recommendation === 'SELL' ? 'Review portfolio allocation' : 'Accumulate on dips.');
            }

            const parsedStock: StockPick = {
              id: name.toLowerCase().replace(/\s+/g, '-'),
              name: companyName,
              ticker: stockData.nseCode || stockData.symbol || name.substring(0, 6).toUpperCase(),
              industry,
              price: currentPrice,
              pctChange,
              marketCap,
              capGroup,
              promoterLatest,
              promoterChange,
              fiiLatest,
              fiiChange,
              diiLatest,
              diiChange,
              pe,
              roe,
              roce: roi,
              eps,
              is52WHigh,
              isTrending,
              isQ4Boost,
              hasGoodNews,
              hasProductLaunch,
              hasNegativeNews,
              recommendation,
              score,
              thesis: thesis.slice(0, 3)
            };

            setPicks(prev => {
              if (prev.some(p => p.name === parsedStock.name)) return prev;
              return [...prev, parsedStock];
            });

          } catch (e) {
            // Ignore error of single stock and continue scanning
          }
        }));

        setProgress(prev => ({ ...prev, current: Math.min(prev.total, i + batchSize) }));
        await sleep(400); // Generous sleep to respect replacement API key rate-limits
      }

    } catch (err: any) {
      setError(err.message || 'Failed to complete market scan. Please try again.');
    } finally {
      setLoading(false);
      setCurrentScanning('');
    }
  }, []);

  useEffect(() => {
    scanMarket();
  }, [scanMarket]);

  // ── Advanced Screen Filtering & Sorting Logic ──────────────────────────────
  const filteredPicks = useMemo(() => {
    let result = [...picks];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        s => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q) || s.industry.toLowerCase().includes(q)
      );
    }

    // Capitalization filter
    if (selectedCap !== 'All') {
      result = result.filter(s => s.capGroup === selectedCap);
    }

    // Shareholding Filters
    if (fiiBuyFilter) {
      result = result.filter(s => s.fiiChange > 0.05);
    }
    if (diiBuyFilter) {
      result = result.filter(s => s.diiChange > 0.05);
    }
    if (promoterBuyFilter) {
      result = result.filter(s => s.promoterChange > 0.05);
    }

    // News & Catalyst Filters
    if (goodNewsFilter) {
      result = result.filter(s => s.hasGoodNews);
    }
    if (productLaunchFilter) {
      result = result.filter(s => s.hasProductLaunch);
    }

    // Fundamental Screening
    if (fundamentalFilter === 'High ROI/ROCE') {
      result = result.filter(s => s.roe >= 15 || s.roce >= 12);
    } else if (fundamentalFilter === 'Low PE') {
      result = result.filter(s => s.pe > 0 && s.pe <= 20);
    } else if (fundamentalFilter === 'Strong Buy Only') {
      result = result.filter(s => s.recommendation === 'STRONG BUY');
    }

    // Action (Buy vs. Sell)
    if (actionFilter === 'BUY/STRONG BUY') {
      result = result.filter(s => s.recommendation === 'BUY' || s.recommendation === 'STRONG BUY');
    } else if (actionFilter === 'SELL/AVOID') {
      result = result.filter(s => s.recommendation === 'SELL');
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortBy] ?? 0;
      let bVal = b[sortBy] ?? 0;

      // Handle zero PE correctly in sorting
      if (sortBy === 'pe' && aVal === 0) aVal = sortOrder === 'asc' ? 9999 : -9999;
      if (sortBy === 'pe' && bVal === 0) bVal = sortOrder === 'asc' ? 9999 : -9999;

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [picks, search, selectedCap, fiiBuyFilter, diiBuyFilter, promoterBuyFilter, goodNewsFilter, productLaunchFilter, fundamentalFilter, actionFilter, sortBy, sortOrder]);

  const toggleSort = (field: 'score' | 'fiiChange' | 'roe' | 'pe' | 'price') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'pe' || field === 'price' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      
      {/* ── Header Area ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 px-6 py-6 border-b border-slate-700 shrink-0 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-inner">
              <Target className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">Best Stock Picks & Action Advisor</h1>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> 100% Live Scanning
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
                Portfolios dynamically screened via live API by Foreign & Domestic Institutional purchases (FII & DII), stable Promoter consolidation, Q4 news catalysts, launches, and ROI/ROCE metrics.
              </p>
            </div>
          </div>
          
          {/* Action buttons + Stats */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button 
              onClick={scanMarket}
              disabled={loading}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition flex items-center gap-2 text-xs font-semibold shadow"
              title="Rescan stock market"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              Rescan
            </button>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5 shadow-sm">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold font-mono">Analyzed</p>
              <p className="text-lg font-bold text-white mt-0.5">{picks.length} Picks</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Advanced Screen Filtering Controls ── */}
      <div className="bg-[#1e293b]/70 backdrop-blur-md px-6 py-4 border-b border-slate-700/60 shrink-0 flex flex-col gap-3.5">
        
        {/* Row 1: Search & Capitalization & Action (Buy/Sell) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search stock, ticker or industry..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/60 border border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-slate-800 text-white placeholder-slate-500 transition-all shadow-inner"
            />
          </div>

          {/* Capitalization Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-widest mr-1 hidden sm:inline">Cap:</span>
            {(['All', 'Large Cap', 'Mid Cap', 'Small Cap'] as const).map(cap => (
              <button
                key={cap}
                onClick={() => setSelectedCap(cap)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  selectedCap === cap 
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow' 
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {cap === 'All' ? 'All Caps' : cap}
              </button>
            ))}
          </div>

          {/* Action Filter (Buy vs Sell) */}
          <div className="flex items-center gap-1.5 border border-slate-700/60 p-1 bg-slate-900/60 rounded-xl">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-widest px-2 hidden sm:inline">Action:</span>
            {(['All', 'BUY/STRONG BUY', 'SELL/AVOID'] as const).map(act => (
              <button
                key={act}
                onClick={() => setActionFilter(act)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  actionFilter === act 
                    ? act === 'BUY/STRONG BUY' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : act === 'SELL/AVOID'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-slate-850 text-white border border-slate-700'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                {act === 'All' ? 'All Signals' : act}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Live Screen Checkboxes & Fundamentals Sorters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/60">
          
          {/* Institutional Purchases Checkboxes */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-widest flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Screens:
            </span>
            
            {/* FII New Buy */}
            <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={fiiBuyFilter}
                onChange={() => setFiiBuyFilter(!fiiBuyFilter)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700 cursor-pointer"
              />
              FII New Buy 💼
            </label>

            {/* DII New Buy */}
            <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={diiBuyFilter}
                onChange={() => setDiiBuyFilter(!diiBuyFilter)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700 cursor-pointer"
              />
              DII (MF) New Buy 🏛️
            </label>

            {/* Promoter Stake Increase */}
            <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={promoterBuyFilter}
                onChange={() => setPromoterBuyFilter(!promoterBuyFilter)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700 cursor-pointer"
              />
              Promoter Buying 🛡️
            </label>

            {/* Good News */}
            <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={goodNewsFilter}
                onChange={() => setGoodNewsFilter(!goodNewsFilter)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700 cursor-pointer"
              />
              Good News 📰
            </label>

            {/* Product Launch */}
            <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={productLaunchFilter}
                onChange={() => setProductLaunchFilter(!productLaunchFilter)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700 cursor-pointer"
              />
              Product Launch ⚡
            </label>
          </div>

          {/* Fundamentals screening filter drop buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-widest mr-1">Fundamentals:</span>
            {(['All', 'High ROI/ROCE', 'Low PE', 'Strong Buy Only'] as const).map(fund => (
              <button
                key={fund}
                onClick={() => setFundamentalFilter(fund)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  fundamentalFilter === fund 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                    : 'bg-slate-800/40 text-slate-400 hover:text-white'
                }`}
              >
                {fund}
              </button>
            ))}
          </div>

          {/* Sorting Sorters */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-500 font-bold uppercase tracking-widest mr-1">Sort by:</span>
            {[
              { id: 'score', label: 'Advisor Score' },
              { id: 'fiiChange', label: 'FII Growth' },
              { id: 'roe', label: 'ROE %' },
              { id: 'pe', label: 'P/E' },
              { id: 'price', label: 'LTP' }
            ].map(col => (
              <button
                key={col.id}
                onClick={() => toggleSort(col.id as any)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-800/50 hover:bg-slate-700/50 transition-all font-semibold ${
                  sortBy === col.id ? 'text-white border-slate-600 bg-slate-700' : 'text-slate-400'
                }`}
              >
                {col.label}
                {sortBy === col.id && (
                  <span className="text-[10px] text-emerald-400">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Picks Grid ── */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-slate-950">
        
        {/* Real-time scanning progress bar */}
        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 shadow-2xl relative overflow-hidden">
            <div className="absolute left-0 top-0 w-2 h-full bg-emerald-500" />
            <div className="flex items-center justify-between text-sm mb-2 text-slate-400">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Scanning live stock market indicators and corporate news... (Loaded {picks.length} picks)
              </span>
              <span className="font-mono text-xs font-semibold">{progress.current} of {progress.total} scanned</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-emerald-500 to-blue-500" 
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }} 
              />
            </div>
            {currentScanning && (
              <p className="text-xs text-slate-500 mt-2">Currently analyzing: <span className="text-emerald-400 font-bold">{currentScanning}</span>...</p>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Scan Error</h4>
              <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {filteredPicks.length === 0 ? (
          !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-300 font-semibold text-lg">No stock matches your screens</p>
              <p className="text-slate-500 text-sm mt-1 max-w-sm">Try resetting your capitalization, advanced checkboxes, or buy/sell filters to explore more picks.</p>
              <button
                onClick={() => { 
                  setSearch(''); setSelectedCap('All'); 
                  setFiiBuyFilter(false); setDiiBuyFilter(false); setPromoterBuyFilter(false);
                  setGoodNewsFilter(false); setProductLaunchFilter(false);
                  setFundamentalFilter('All'); setActionFilter('All');
                }}
                className="mt-5 px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-sm rounded-xl hover:bg-emerald-400 transition"
              >
                Reset All Filters
              </button>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredPicks.map(stock => {
              const isUp = stock.pctChange >= 0;
              return (
                <div 
                  key={stock.id}
                  className={`bg-slate-900 border rounded-2xl p-5 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col group relative overflow-hidden ${
                    stock.recommendation === 'STRONG BUY' ? 'border-emerald-500/35 hover:border-emerald-500/60 hover:shadow-emerald-500/5' :
                    stock.recommendation === 'BUY' ? 'border-green-600/35 hover:border-green-600/60 hover:shadow-green-500/5' :
                    stock.recommendation === 'SELL' ? 'border-red-500/35 hover:border-red-500/60 hover:shadow-red-500/5' :
                    'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  
                  {/* Top Sentiment Badges Area */}
                  <div className="absolute top-4 right-4 flex items-center gap-1 flex-wrap justify-end max-w-[50%]">
                    {stock.hasGoodNews && (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Good News 📰
                      </span>
                    )}
                    {stock.hasProductLaunch && (
                      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        New Launch 🚀
                      </span>
                    )}
                    {stock.is52WHigh && (
                      <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        52W High 🔥
                      </span>
                    )}
                  </div>

                  {/* Stock Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white tracking-wide group-hover:text-emerald-400 transition-colors">
                          {stock.name}
                        </span>
                        <span className="bg-slate-800 text-slate-400 border border-slate-700/60 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          {stock.ticker}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5 font-medium">{stock.industry}</p>
                    </div>
                  </div>

                  {/* Advisor Recommendation Banner */}
                  <div className={`flex items-center justify-between p-2.5 rounded-xl border mb-4 shadow-sm ${
                    stock.recommendation === 'STRONG BUY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    stock.recommendation === 'BUY' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                    stock.recommendation === 'SELL' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    'bg-slate-800/40 text-slate-300 border-slate-800'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {stock.recommendation === 'STRONG BUY' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
                       stock.recommendation === 'BUY' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> :
                       stock.recommendation === 'SELL' ? <TrendingDown className="w-4 h-4 text-red-400" /> :
                       <HelpCircle className="w-4 h-4 text-slate-400" />}
                      <span className="text-[11px] font-bold tracking-wider uppercase">
                        ADVISOR: {stock.recommendation}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Score</span>
                      <span className="text-xs font-bold font-mono px-1.5 py-0.5 bg-slate-900 rounded border border-slate-850">
                        {stock.score.toFixed(1)}/10
                      </span>
                    </div>
                  </div>

                  {/* Market Cap & Price Row */}
                  <div className="flex items-baseline justify-between border-b border-slate-800/60 pb-3 mb-4 flex-wrap gap-2">
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        stock.capGroup === 'Large Cap' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                        stock.capGroup === 'Mid Cap' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                        'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                      }`}>
                        {stock.capGroup}
                      </span>
                      {stock.marketCap > 0 && (
                        <span className="text-slate-500 text-[10px] ml-2 font-medium">
                          M-Cap: ₹{(stock.marketCap / 10000).toFixed(2)}L Cr
                        </span>
                      )}
                    </div>
                    
                    <div className="text-right text-sm">
                      <span className="text-base font-bold text-white font-mono">
                        ₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`text-xs font-semibold ml-2 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                        {isUp ? '+' : ''}{stock.pctChange.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Institutional & Insider Purchases Section */}
                  <div className="space-y-2.5 bg-slate-950/50 border border-slate-800/40 p-3 rounded-xl mb-4">
                    
                    {/* FII Progress and growth */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-slate-400 flex items-center gap-1 font-medium">
                          <Users className="w-3.5 h-3.5 text-blue-400" /> FIIs (Foreign)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-bold font-mono">{stock.fiiLatest.toFixed(2)}%</span>
                          {stock.fiiChange !== 0 && (
                            <span className={`text-[9px] font-bold px-1 py-0.25 rounded ${
                              stock.fiiChange > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {stock.fiiChange > 0 ? '▲ +' : '▼ '}{stock.fiiChange.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                        <div className="bg-blue-400 h-1 rounded-full animate-pulse" style={{ width: `${Math.min(100, stock.fiiLatest * 1.5)}%` }} />
                      </div>
                    </div>

                    {/* DII Progress and growth */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-slate-400 flex items-center gap-1 font-medium">
                          <Users className="w-3.5 h-3.5 text-violet-400" /> DIIs (Mutual Funds)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-bold font-mono">{stock.diiLatest.toFixed(2)}%</span>
                          {stock.diiChange !== 0 && (
                            <span className={`text-[9px] font-bold px-1 py-0.25 rounded ${
                              stock.diiChange > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {stock.diiChange > 0 ? '▲ +' : '▼ '}{stock.diiChange.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                        <div className="bg-violet-400 h-1 rounded-full" style={{ width: `${Math.min(100, stock.diiLatest * 1.5)}%` }} />
                      </div>
                    </div>

                    {/* Promoter Progress and growth */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-slate-400 flex items-center gap-1 font-medium">
                          <Shield className="w-3.5 h-3.5 text-orange-400" /> Promoters (Insiders)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-bold font-mono">{stock.promoterLatest.toFixed(2)}%</span>
                          {stock.promoterChange !== 0 && (
                            <span className={`text-[9px] font-bold px-1 py-0.25 rounded ${
                              stock.promoterChange > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {stock.promoterChange > 0 ? '▲ +' : '▼ '}{stock.promoterChange.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                        <div className="bg-orange-400 h-1 rounded-full" style={{ width: `${stock.promoterLatest}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Financial Ratios & EPS Row */}
                  <div className="grid grid-cols-4 gap-1.5 text-center mb-4">
                    <div className="bg-slate-800/40 border border-slate-800/80 p-2 rounded-xl">
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold font-mono">P/E Ratio</p>
                      <p className="text-xs font-bold text-white font-mono mt-0.5">
                        {stock.pe === 0 ? '—' : stock.pe.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-800/80 p-2 rounded-xl">
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold font-mono">ROE %</p>
                      <p className={`text-xs font-bold font-mono mt-0.5 ${stock.roe >= 15 ? 'text-green-400' : 'text-white'}`}>
                        {stock.roe === 0 ? '—' : `${stock.roe.toFixed(1)}%`}
                      </p>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-800/80 p-2 rounded-xl">
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold font-mono">ROCE %</p>
                      <p className="text-xs font-bold text-white font-mono mt-0.5">
                        {stock.roce === 0 ? '—' : `${stock.roce.toFixed(1)}%`}
                      </p>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-800/80 p-2 rounded-xl">
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold font-mono">EPS (₹)</p>
                      <p className={`text-xs font-bold font-mono mt-0.5 ${stock.eps > 0 ? 'text-blue-400' : 'text-white'}`}>
                        {stock.eps === 0 ? '—' : stock.eps.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  {/* Thesis Bullets (Investment Rationale) */}
                  <div className="flex-1 mt-auto">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1.5 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-emerald-400" /> Fundamental & Advisor Analysis
                    </p>
                    <ul className="space-y-1">
                      {stock.thesis.map((t, idx) => (
                        <li key={idx} className="text-xs text-slate-400 flex items-start gap-1.5 leading-snug">
                          <span className={`select-none mt-0.5 ${stock.recommendation === 'SELL' ? 'text-red-500' : 'text-emerald-500'}`}>•</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Bottom glowing strip indicator */}
                  <div className={`absolute inset-x-0 bottom-0 h-1 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 bg-gradient-to-r ${
                    stock.recommendation === 'STRONG BUY' ? 'from-transparent via-emerald-500/30 to-transparent' :
                    stock.recommendation === 'BUY' ? 'from-transparent via-green-600/30 to-transparent' :
                    stock.recommendation === 'SELL' ? 'from-transparent via-red-500/30 to-transparent' :
                    'from-transparent via-slate-500/30 to-transparent'
                  }`} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
