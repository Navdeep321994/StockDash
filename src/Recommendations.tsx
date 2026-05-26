import React, { useState, useMemo } from 'react';
import { 
  Target, TrendingUp, Search, Info, Shield, Users, 
  ArrowUpRight, Award, Sparkles, Filter, ChevronDown, 
  HelpCircle, ArrowUpDown
} from 'lucide-react';

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
  pe: number;
  roe: number;
  roce: number;
  is52WHigh: boolean;
  isTrending: boolean;
  isQ4Boost?: boolean;
  thesis: string[];
}

// ── Curated Recommendations Dataset ──────────────────────────────────────────
const RECOMMENDATIONS: StockPick[] = [
  {
    id: 'polycab',
    name: 'Polycab India',
    ticker: 'POLYCAB',
    industry: 'Electronic Instruments & Cables',
    price: 9540.00,
    pctChange: 1.61,
    marketCap: 143664.20,
    capGroup: 'Large Cap',
    promoterLatest: 61.50,
    promoterChange: -1.51,
    fiiLatest: 18.21,
    fiiChange: 6.76,
    pe: 38.37,
    roe: 24.48,
    roce: 24.00,
    is52WHigh: true,
    isTrending: false,
    thesis: ['Massive FII accumulation of +6.76% over the last four quarters', 'Trading at new 52-week highs with heavy volume support', 'Dominant 25%+ market share in organized cables & wires segment']
  },
  {
    id: 'shriram',
    name: 'Shriram Finance',
    ticker: 'SHRIRAMFIN',
    industry: 'Consumer Financial Services',
    price: 2450.00,
    pctChange: 0.85,
    marketCap: 92450.30,
    capGroup: 'Large Cap',
    promoterLatest: 18.90,
    promoterChange: -5.09,
    fiiLatest: 54.00,
    fiiChange: 6.54,
    pe: 16.36,
    roe: 16.38,
    roce: 14.20,
    is52WHigh: false,
    isTrending: true,
    thesis: ['Extremely strong FII buy-in (+6.54%) making FIIs the majority holders', 'Highly undervalued at a P/E of only 16.36 compared to peers', 'Dominant player in used commercial vehicle financing with robust margins']
  },
  {
    id: 'southbank',
    name: 'South Indian Bank',
    ticker: 'SOUTHBANK',
    industry: 'Regional Banks',
    price: 40.77,
    pctChange: -0.51,
    marketCap: 10687.63,
    capGroup: 'Mid Cap',
    promoterLatest: 0.00,
    promoterChange: 0.00,
    fiiLatest: 24.21,
    fiiChange: 6.63,
    pe: 6.15,
    roe: 13.53,
    roce: 12.10,
    is52WHigh: false,
    isTrending: false,
    thesis: ['Spectacular FII accumulation (+6.63% growth) in recent quarters', 'Trades at a deep-value P/E of 6.15 with expanding net interest margins', 'Significant turnaround in asset quality with low double-digit ROE']
  },
  {
    id: 'tdpower',
    name: 'TD Power Systems',
    ticker: 'TDPOW',
    industry: 'Misc. Capital Goods & Heavy Machinery',
    price: 1357.90,
    pctChange: 4.69,
    marketCap: 20764.55,
    capGroup: 'Large Cap',
    promoterLatest: 26.87,
    promoterChange: -0.01,
    fiiLatest: 26.69,
    fiiChange: 2.99,
    pe: 55.68,
    roe: 24.72,
    roce: 24.42,
    is52WHigh: true,
    isTrending: false,
    thesis: ['Breakout to new 52-week highs backed by +2.99% FII buying', 'Exceptional capital efficiency with ROE of 24.72% and ROCE of 24.42%', 'Surging domestic and export order book for power generators']
  },
  {
    id: 'canarabank',
    name: 'Canara Bank',
    ticker: 'CANBK',
    industry: 'Regional Banks',
    price: 118.00,
    pctChange: 1.15,
    marketCap: 107050.20,
    capGroup: 'Large Cap',
    promoterLatest: 62.93,
    promoterChange: 0.00,
    fiiLatest: 11.20,
    fiiChange: 2.86,
    pe: 5.68,
    roe: 17.66,
    roce: 16.50,
    is52WHigh: false,
    isTrending: false,
    thesis: ['Strong FII accumulation of +2.86% in the public sector banking space', 'Attractively priced at a dirt-cheap P/E of 5.68 with double-digit ROE', 'Robust credit growth and steep decline in Gross NPA ratios']
  },
  {
    id: 'sbi',
    name: 'State Bank of India',
    ticker: 'SBIN',
    industry: 'Regional Banks',
    price: 969.60,
    pctChange: -0.18,
    marketCap: 895277.60,
    capGroup: 'Large Cap',
    promoterLatest: 55.52,
    promoterChange: 0.02,
    fiiLatest: 11.41,
    fiiChange: 1.44,
    pe: 10.77,
    roe: 15.38,
    roce: 14.80,
    is52WHigh: false,
    isTrending: false,
    thesis: ['Consistent quarter-on-quarter FII loading (+1.44%)', 'Underpinned by excellent promoter (Govt of India) holding stability', 'Strong structural growth with solid capital adequacy ratios']
  },
  {
    id: 'suzlon',
    name: 'Suzlon Energy',
    ticker: 'SUZLON',
    industry: 'Misc. Capital Goods',
    price: 53.99,
    pctChange: 0.19,
    marketCap: 73748.47,
    capGroup: 'Large Cap',
    promoterLatest: 11.73,
    promoterChange: -0.01,
    fiiLatest: 22.96,
    fiiChange: 0.83,
    pe: 17.20,
    roe: 40.64,
    roce: 35.69,
    is52WHigh: false,
    isTrending: false,
    thesis: ['Massive operational turnaround, now completely net debt-free', 'Unbelievable Return on Equity (ROE) of 40.64% with rising FII interest', 'Major beneficiary of Government renewable wind capacity targets']
  },
  {
    id: 'suprajit',
    name: 'Suprajit Engineering',
    ticker: 'SUPRAJIT',
    industry: 'Auto Ancillaries',
    price: 425.00,
    pctChange: 5.12,
    marketCap: 5890.00,
    capGroup: 'Mid Cap',
    promoterLatest: 44.60,
    promoterChange: 0.00,
    fiiLatest: 5.45,
    fiiChange: 0.22,
    pe: 25.50,
    roe: 14.50,
    roce: 13.90,
    is52WHigh: false,
    isTrending: true,
    isQ4Boost: true,
    thesis: ['Supercharged Q4 earnings report with PAT surging **161% Y-o-Y** to ₹71 Cr', 'Market leader in automotive cables segment with strong pricing power', 'Active accumulation by institutional funds following stellar earnings beat']
  },
  {
    id: 'campus',
    name: 'Campus Activewear',
    ticker: 'CAMPUS',
    industry: 'Footwear & Apparel',
    price: 260.00,
    pctChange: 7.20,
    marketCap: 7930.00,
    capGroup: 'Mid Cap',
    promoterLatest: 73.88,
    promoterChange: 0.00,
    fiiLatest: 6.12,
    fiiChange: 0.45,
    pe: 34.00,
    roe: 18.20,
    roce: 17.50,
    is52WHigh: false,
    isTrending: true,
    isQ4Boost: true,
    thesis: ['Strong Q4 earnings with **net profit growing 26% Y-o-Y** to ₹44 Cr', 'Shares surged 7% on heavy volume with strong technical reversal signals', 'Excellent promoter backing (73.88% holding) indicating deep trust']
  },
  {
    id: 'fineotex',
    name: 'Fineotex Chemical',
    ticker: 'FCL',
    industry: 'Specialty Chemicals',
    price: 385.00,
    pctChange: 0.76,
    marketCap: 4260.00,
    capGroup: 'Small Cap',
    promoterLatest: 65.00,
    promoterChange: -0.27,
    fiiLatest: 3.50,
    fiiChange: 0.39,
    pe: 19.70,
    roe: 13.48,
    roce: 12.80,
    is52WHigh: false,
    isTrending: false,
    thesis: ['Steady quarterly FII accumulation (+0.39%) in a correcting sector', 'High promoter commitment at 65% ensures defensive safety', 'Expanding market share in high-margin construction & textile chemicals']
  },
  {
    id: 'sportking',
    name: 'Sportking India',
    ticker: 'SPORTKING',
    industry: 'Textiles & Apparel',
    price: 920.00,
    pctChange: 1.45,
    marketCap: 1170.00,
    capGroup: 'Small Cap',
    promoterLatest: 70.00,
    promoterChange: 0.00,
    fiiLatest: 2.20,
    fiiChange: 0.17,
    pe: 11.85,
    roe: 11.38,
    roce: 10.90,
    is52WHigh: false,
    isTrending: false,
    thesis: ['Highly attractive valuation at a trailing P/E of only 11.85', 'Strong promoter consolidation at 70% with positive FII backing', 'Recovery in global textile exports serves as a strong macro catalyst']
  },
  {
    id: 'ireda',
    name: 'IREDA',
    ticker: 'IREDA',
    industry: 'Infrastructure & Green Finance',
    price: 130.83,
    pctChange: 1.09,
    marketCap: 35160.00,
    capGroup: 'Small Cap',
    promoterLatest: 71.76,
    promoterChange: 0.00,
    fiiLatest: 2.14,
    fiiChange: 0.10,
    pe: 18.20,
    roe: 16.40,
    roce: 15.20,
    is52WHigh: false,
    isTrending: false,
    thesis: ['Rising institutional and FII buying (+0.10% FII change)', 'High quality sovereign PSU backing (71.76% held by Government of India)', 'Exclusive nodal financier for India\'s aggressive green energy pipeline']
  }
];

export default function RecommendationsPage() {
  const [search, setSearch] = useState('');
  const [selectedCap, setSelectedCap] = useState<'All' | 'Large Cap' | 'Mid Cap' | 'Small Cap'>('All');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'FII' | 'Promoter' | 'Momentum' | 'Earnings'>('All');
  const [sortBy, setSortBy] = useState<'fiiChange' | 'roe' | 'pe' | 'price'>('fiiChange');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort picks
  const filteredPicks = useMemo(() => {
    let result = [...RECOMMENDATIONS];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        s => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q) || s.industry.toLowerCase().includes(q)
      );
    }

    // Capitalization
    if (selectedCap !== 'All') {
      result = result.filter(s => s.capGroup === selectedCap);
    }

    // Advanced screening filter
    if (selectedFilter === 'FII') {
      result = result.filter(s => s.fiiChange > 0.5);
    } else if (selectedFilter === 'Promoter') {
      result = result.filter(s => s.promoterLatest >= 50.0);
    } else if (selectedFilter === 'Momentum') {
      result = result.filter(s => s.is52WHigh || s.isTrending);
    } else if (selectedFilter === 'Earnings') {
      result = result.filter(s => s.isQ4Boost);
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortBy] ?? 0;
      let bVal = b[sortBy] ?? 0;

      if (sortBy === 'pe' && aVal === 0) aVal = 9999;
      if (sortBy === 'pe' && bVal === 0) bVal = 9999;

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [search, selectedCap, selectedFilter, sortBy, sortOrder]);

  const toggleSort = (field: 'fiiChange' | 'roe' | 'pe' | 'price') => {
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
                <h1 className="text-2xl font-bold tracking-tight text-white">Best Stock Picks</h1>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> High FII Backing
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
                Curated portfolio screened by strong Foreign Institutional Investors (FII) quarterly accumulation, stable Promoter holdings, double-digit ROE, and recent Q4 earnings catalysts.
              </p>
            </div>
          </div>
          
          {/* Market Stats Panel */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5 shadow-sm">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Screened</p>
              <p className="text-lg font-bold text-white mt-0.5">{RECOMMENDATIONS.length} Picks</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5 shadow-sm">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">FII Favorites</p>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">
                {RECOMMENDATIONS.filter(s => s.fiiChange > 2.0).length} Stocks
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Controls ── */}
      <div className="bg-[#1e293b]/70 backdrop-blur-md px-6 py-4 border-b border-slate-700/60 shrink-0 flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search stock name, ticker or industry..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/60 border border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-slate-800 text-white placeholder-slate-500 transition-all shadow-inner"
            />
          </div>

          {/* Capitalization Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-widest mr-1 hidden sm:inline">Cap:</span>
            {(['All', 'Large Cap', 'Mid Cap', 'Small Cap'] as const).map(cap => (
              <button
                key={cap}
                onClick={() => setSelectedCap(cap)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  selectedCap === cap 
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow' 
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {cap === 'All' ? 'All Caps' : cap}
              </button>
            ))}
          </div>
        </div>

        {/* Screening Filters & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1.5 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-widest mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Screens:
            </span>
            {[
              { id: 'All', label: 'All Picks' },
              { id: 'FII', label: '🔥 FII Accumulation' },
              { id: 'Promoter', label: '🛡️ Promoter Giants (>50%)' },
              { id: 'Momentum', label: '🚀 Breakouts & Momentum' },
              { id: 'Earnings', label: '📈 Q4 Earnings Boost' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedFilter === f.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'bg-slate-800/40 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Quick Sorter Indicators */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-500 font-bold uppercase tracking-widest mr-1">Sort by:</span>
            {[
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
        
        {filteredPicks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-300 font-semibold text-lg">No stock matches your screens</p>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">Try resetting your capitalization or advanced screen filters to explore more picks.</p>
            <button
              onClick={() => { setSearch(''); setSelectedCap('All'); setSelectedFilter('All'); }}
              className="mt-5 px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-sm rounded-xl hover:bg-emerald-400 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredPicks.map(stock => {
              const isUp = stock.pctChange >= 0;
              return (
                <div 
                  key={stock.id}
                  className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/5 hover:-translate-y-0.5 transition-all duration-200 flex flex-col group relative overflow-hidden"
                >
                  {/* Q4 Boost / 52W High Badges at Top Right */}
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    {stock.isQ4Boost && (
                      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Q4 Blast 🚀
                      </span>
                    )}
                    {stock.is52WHigh && (
                      <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
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
                    
                    <div className="text-right">
                      <span className="text-lg font-bold text-white font-mono">
                        ₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`text-xs font-semibold ml-2 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                        {isUp ? '+' : ''}{stock.pctChange}%
                      </span>
                    </div>
                  </div>

                  {/* Shareholding Tracking Section */}
                  <div className="space-y-3 bg-slate-950/50 border border-slate-800/40 p-3 rounded-xl mb-4">
                    
                    {/* FII Progress and growth */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400 flex items-center gap-1 font-medium">
                          <Users className="w-3.5 h-3.5 text-blue-400" /> FII Holding
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-bold font-mono">{stock.fiiLatest}%</span>
                          <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                            stock.fiiChange > 0 
                              ? 'bg-green-500/10 text-green-400' 
                              : stock.fiiChange < 0 
                                ? 'bg-red-500/10 text-red-400' 
                                : 'bg-slate-800 text-slate-500'
                          }`}>
                            {stock.fiiChange > 0 ? '+' : ''}{stock.fiiChange.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${Math.min(100, stock.fiiLatest * 1.5)}%` }} />
                      </div>
                    </div>

                    {/* Promoter Progress and growth */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400 flex items-center gap-1 font-medium">
                          <Shield className="w-3.5 h-3.5 text-orange-400" /> Promoter Holding
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-bold font-mono">{stock.promoterLatest}%</span>
                          {stock.promoterChange !== 0 && (
                            <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                              stock.promoterChange > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {stock.promoterChange > 0 ? '+' : ''}{stock.promoterChange.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${stock.promoterLatest}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Financial Ratios Row */}
                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div className="bg-slate-800/40 border border-slate-800/80 p-2 rounded-xl">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">P/E Ratio</p>
                      <p className="text-xs font-bold text-white font-mono mt-0.5">
                        {stock.pe === 0 ? '—' : stock.pe}
                      </p>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-800/80 p-2 rounded-xl">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">ROE %</p>
                      <p className={`text-xs font-bold font-mono mt-0.5 ${stock.roe > 20 ? 'text-green-400' : 'text-white'}`}>
                        {stock.roe === 0 ? '—' : `${stock.roe}%`}
                      </p>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-800/80 p-2 rounded-xl">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">ROI % (ROCE)</p>
                      <p className="text-xs font-bold text-white font-mono mt-0.5">
                        {stock.roce === 0 ? '—' : `${stock.roce}%`}
                      </p>
                    </div>
                  </div>

                  {/* Thesis Bullets (Investment Rationale) */}
                  <div className="flex-1 mt-auto">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-emerald-400" /> Investment Rationale
                    </p>
                    <ul className="space-y-1">
                      {stock.thesis.map((t, idx) => (
                        <li key={idx} className="text-xs text-slate-400 flex items-start gap-1.5 leading-snug">
                          <span className="text-emerald-500 select-none mt-0.5">•</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Glassmorphic border glow inside cards */}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
