import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Newspaper, BarChart3, Activity, FileText,
  Globe, PieChart, Zap, Users, Search, Menu, X, RefreshCw,
  ArrowUpRight, ArrowDownRight, ChevronRight, Bell,
  Calendar, ExternalLink, Building2,
  Briefcase, Target, Clock, AlertCircle, CheckCircle2, LineChart
} from 'lucide-react';
import TradingChartPage from './TradingChart';

const API_BASE_URL = 'https://stock.indianapi.in';
const API_KEY = 'sk-live-ihdJabhIypHzFrJyenJqQT31GfAERUPc3syC9xHC';

const NAV_GROUPS = [
  {
    label: 'Market Data',
    items: [
      { id: 'ipo', name: 'IPOs', path: '/ipo', icon: TrendingUp, color: 'text-violet-500' },
      { id: 'news', name: 'News', path: '/news', icon: Newspaper, color: 'text-blue-500' },
      { id: 'stock', name: 'Stock', path: '/stock', icon: BarChart3, color: 'text-green-500', needsQuery: true, placeholder: 'e.g. Tata Steel' },
      { id: 'chart', name: 'Chart', path: '', icon: LineChart, color: 'text-blue-400' },
      { id: 'trending', name: 'Trending', path: '/trending', icon: Activity, color: 'text-orange-500' },
      { id: 'commodities', name: 'Commodities', path: '/commodities', icon: Globe, color: 'text-teal-500' },
      { id: 'mutualFunds', name: 'Mutual Funds', path: '/mutual_funds', icon: PieChart, color: 'text-pink-500' },
      { id: 'priceShockers', name: 'Price Shockers', path: '/price_shockers', icon: Zap, color: 'text-yellow-500' },
      { id: 'week52', name: '52 Week High/Low', path: '/fetch_52_week_high_low_data', icon: BarChart3, color: 'text-indigo-500' },
    ]
  },
  {
    label: 'Exchange',
    items: [
      { id: 'bseActive', name: 'BSE Most Active', path: '/BSE_most_active', icon: Users, color: 'text-red-500' },
      { id: 'nseActive', name: 'NSE Most Active', path: '/NSE_most_active', icon: Users, color: 'text-cyan-500' },
    ]
  },
  {
    label: 'Analysis & Tools',
    items: [
      { id: 'historical', name: 'Historical Data', path: '/historical_data', icon: BarChart3, color: 'text-purple-500', needsQuery: true, placeholder: 'e.g. Tata Steel' },
      { id: 'industry', name: 'Industry Search', path: '/industry_search', icon: Search, color: 'text-lime-500', needsQuery: true, placeholder: 'e.g. Banking' },
      { id: 'forecasts', name: 'Stock Forecasts', path: '/stock_forecasts', icon: TrendingUp, color: 'text-amber-500', needsQuery: true, placeholder: 'Enter stock ID' },
      { id: 'historicalStats', name: 'Historical Stats', path: '/historical_stats', icon: BarChart3, color: 'text-rose-500', needsQuery: true, placeholder: 'e.g. Tata Steel' },
      { id: 'corporateActions', name: 'Corporate Actions', path: '/corporate_actions', icon: Building2, color: 'text-sky-500', needsQuery: true, placeholder: 'e.g. Tata Steel' },
      { id: 'mutualFundSearch', name: 'MF Search', path: '/mutual_fund_search', icon: Search, color: 'text-emerald-500', needsQuery: true, placeholder: 'e.g. SBI' },
      { id: 'targetPrice', name: 'Target Price', path: '/stock_target_price', icon: Target, color: 'text-fuchsia-500', needsQuery: true, placeholder: 'Enter stock ID' },
      { id: 'mutualFundDetails', name: 'MF Details', path: '/mutual_funds_details', icon: Briefcase, color: 'text-orange-400', needsQuery: true, placeholder: 'e.g. SBI Bluechip' },
      { id: 'announcements', name: 'Announcements', path: '/recent_announcements', icon: Bell, color: 'text-blue-400', needsQuery: true, placeholder: 'e.g. Tata Steel' },
      { id: 'statement', name: 'Financial Statement', path: '/statement', icon: FileText, color: 'text-green-400', needsQuery: true, placeholder: 'e.g. Tata Steel' },
    ]
  }
];

const ALL_ENDPOINTS = NAV_GROUPS.flatMap(g => g.items);

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (v: any) => (v === null || v === undefined || v === '') ? '—' : v;
const fmtPrice = (v: any) => {
  const n = parseFloat(v);
  return isNaN(n) ? fmt(v) : `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const isPositive = (v: any) => parseFloat(v) >= 0;

const Badge = ({ text, color }: { text: string; color: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>{text}</span>
);

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>{children}</div>
);

const CardHeader = ({ title, count }: { title: string; count?: number }) => (
  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
    <h3 className="font-semibold text-gray-800">{title}</h3>
    {count !== undefined && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{count} items</span>}
  </div>
);

const ChangeChip = ({ value }: { value: any }) => {
  const pos = isPositive(value);
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${pos ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
      {pos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {fmt(value)}%
    </span>
  );
};

// ─── Section Renderers ───────────────────────────────────────────────────────

const IpoRenderer = ({ data }: { data: any }) => {
  const sections = [
    { key: 'upcoming', label: 'Upcoming', color: 'bg-blue-50 text-blue-700' },
    { key: 'ongoing', label: 'Ongoing', color: 'bg-green-50 text-green-700' },
    { key: 'listed', label: 'Recently Listed', color: 'bg-purple-50 text-purple-700' },
  ];
  return (
    <div className="space-y-6">
      {sections.map(({ key, label }) => {
        const items: any[] = data[key] || [];
        if (!items.length) return null;
        return (
          <Card key={key}>
            <CardHeader title={label} count={items.length} />
            <div className="divide-y divide-gray-50">
              {items.map((ipo: any, i: number) => (
                <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{fmt(ipo.name)}</span>
                        <Badge text={fmt(ipo.symbol)} color="bg-gray-100 text-gray-600" />
                        {ipo.is_sme && <Badge text="SME" color="bg-orange-50 text-orange-600" />}
                      </div>
                      {ipo.additional_text && <p className="text-xs text-gray-500 mt-1">{ipo.additional_text}</p>}
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        {ipo.bidding_start_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Open: {ipo.bidding_start_date}</span>}
                        {ipo.listing_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />List: {ipo.listing_date}</span>}
                        {ipo.lot_size && <span>Lot: {ipo.lot_size}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {ipo.min_price && <p className="text-sm font-bold text-gray-900">{fmtPrice(ipo.min_price)} – {fmtPrice(ipo.max_price)}</p>}
                      {ipo.listing_gains && <ChangeChip value={ipo.listing_gains} />}
                      {ipo.document_url && (
                        <a href={ipo.document_url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-xs text-blue-500 hover:underline justify-end">
                          Prospectus <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

const NewsRenderer = ({ data }: { data: any }) => {
  const items: any[] = Array.isArray(data) ? data : extractArray(data.news ? { news: data.news } : data.articles ? { articles: data.articles } : data);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((item: any, i: number) => (
        <Card key={i} className="hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Newspaper className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{fmt(item.title || item.headline || item.news_title)}</p>
                {(item.source || item.publisher) && <p className="text-xs text-gray-400 mt-1">{item.source || item.publisher}</p>}
                {(item.date || item.published_at) && <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><Clock className="w-3 h-3" />{item.date || item.published_at}</p>}
                {(item.url || item.link) && (
                  <a href={item.url || item.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-500 hover:underline">
                    Read more <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

const StockRenderer = ({ data }: { data: any }) => {
  if (!data || Object.keys(data).length === 0) return null;

  // Real API shape: { companyName, industry, companyProfile: { companyDescription, ... },
  //   currentPrice: { BSE, NSE }, stockTechnicalData: { ... }, ... }
  const profile = data.companyProfile || {};
  const tech = data.stockTechnicalData || {};
  const priceObj = data.currentPrice || {};
  const nsePrice = priceObj.NSE ?? priceObj.nse;
  const bsePrice = priceObj.BSE ?? priceObj.bse;
  const displayPrice = nsePrice || bsePrice;

  const statRows = [
    { label: 'Market Cap', value: tech.marketCap ? `₹${Number(tech.marketCap).toLocaleString('en-IN')} Cr` : '—' },
    { label: '52W High', value: fmtPrice(tech['52WeekHighPrice'] ?? tech.weekHigh52) },
    { label: '52W Low', value: fmtPrice(tech['52WeekLowPrice'] ?? tech.weekLow52) },
    { label: 'P/E Ratio', value: fmt(tech.pe ?? tech.peRatio) },
    { label: 'EPS (TTM)', value: fmt(tech.eps) },
    { label: 'Book Value', value: fmtPrice(tech.bookValue) },
    { label: 'Dividend Yield', value: tech.dividendYield ? `${tech.dividendYield}%` : '—' },
    { label: 'ROE', value: tech.roe ? `${tech.roe}%` : '—' },
    { label: 'ROCE', value: tech.roce ? `${tech.roce}%` : '—' },
    { label: 'Debt/Equity', value: fmt(tech.debtToEquity ?? tech.dte) },
    { label: 'BSE Code', value: fmt(tech.bseCode ?? data.bseCode) },
    { label: 'NSE Code', value: fmt(tech.nseCode ?? data.nseCode ?? data.symbol) },
  ].filter(s => s.value !== '—');

  // Officers / management
  const officers: any[] = profile.officers?.officer
    ? (Array.isArray(profile.officers.officer) ? profile.officers.officer : [profile.officers.officer])
    : [];

  // Peer comparison
  const peers: any[] = data.peerComparison || data.peers || [];

  return (
    <div className="space-y-4">
      {/* ── Hero Card ── */}
      <Card>
        <div className="p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{fmt(data.companyName)}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {data.industry && <Badge text={data.industry} color="bg-blue-50 text-blue-700" />}
                {profile.mgIndustry && <Badge text={profile.mgIndustry} color="bg-purple-50 text-purple-700" />}
                {profile.isInId && <span className="text-xs text-gray-400">ISIN: {profile.isInId}</span>}
              </div>
            </div>
            <div className="text-right">
              {displayPrice && (
                <p className="text-3xl font-bold text-gray-900">{fmtPrice(displayPrice)}</p>
              )}
              <div className="flex gap-3 mt-1 justify-end text-xs text-gray-500">
                {nsePrice && <span>NSE: <span className="font-semibold text-gray-700">{fmtPrice(nsePrice)}</span></span>}
                {bsePrice && <span>BSE: <span className="font-semibold text-gray-700">{fmtPrice(bsePrice)}</span></span>}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Key Stats ── */}
      {statRows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {statRows.map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className="font-bold text-gray-900 mt-0.5 text-sm">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── About ── */}
      {profile.companyDescription && (
        <Card>
          <CardHeader title="About the Company" />
          <p className="px-5 py-4 text-sm text-gray-600 leading-relaxed">{profile.companyDescription}</p>
        </Card>
      )}

      {/* ── Management ── */}
      {officers.length > 0 && (
        <Card>
          <CardHeader title="Key Management" count={officers.length} />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {officers.slice(0, 6).map((o: any, i: number) => (
              <div key={i} className="px-5 py-4">
                <p className="font-semibold text-gray-900 text-sm">{`${o.firstName || ''} ${o.mi || ''} ${o.lastName || ''}`.trim()}</p>
                <p className="text-xs text-gray-500 mt-0.5">{o.title?.abbr1 || o.title?.Value || '—'}</p>
                {o.age && <p className="text-xs text-gray-400 mt-0.5">Age: {o.age}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Peer Comparison ── */}
      {peers.length > 0 && (
        <Card>
          <CardHeader title="Peer Comparison" count={peers.length} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Company</th>
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3 text-right">P/E</th>
                  <th className="px-5 py-3 text-right">Market Cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {peers.map((p: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{fmt(p.companyName || p.name)}</td>
                    <td className="px-5 py-3 text-right">{fmtPrice(p.currentPrice?.NSE || p.price)}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{fmt(p.stockTechnicalData?.pe || p.pe)}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{p.stockTechnicalData?.marketCap ? `₹${Number(p.stockTechnicalData.marketCap).toLocaleString('en-IN')} Cr` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

const extractArray = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  // Try common keys first
  const keys = ['stocks', 'data', 'results', 'trending', 'items', 'list'];
  for (const k of keys) {
    if (Array.isArray(data[k])) return data[k];
  }
  // Try any value that is an array
  for (const v of Object.values(data)) {
    if (Array.isArray(v)) return v as any[];
  }
  return [];
};

const StockListRenderer = ({ data, title }: { data: any; title: string }) => {
  const items: any[] = extractArray(data);
  const isBSE = title.toLowerCase().includes('bse');
  const isNSE = title.toLowerCase().includes('nse');

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Stocks', value: items.length, color: 'bg-blue-500' },
          { label: 'Bullish', value: items.filter(s => s.overall_rating === 'Bullish').length, color: 'bg-green-500' },
          { label: 'Bearish', value: items.filter(s => s.overall_rating === 'Bearish').length, color: 'bg-red-500' },
          { label: 'Neutral',  value: items.filter(s => !['Bullish','Bearish'].includes(s.overall_rating)).length, color: 'bg-gray-400' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
            <div className={`w-2 h-10 rounded-full ${c.color}`} />
            <div>
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className="font-bold text-gray-900 text-xl">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <div className={`px-5 py-3 border-b border-gray-100 flex items-center gap-2 ${isBSE ? 'bg-blue-50' : isNSE ? 'bg-orange-50' : 'bg-gray-50'}`}>
          <span className={`font-bold text-sm ${isBSE ? 'text-blue-800' : isNSE ? 'text-orange-800' : 'text-gray-800'}`}>
            {title}
          </span>
          <span className="ml-auto text-xs text-gray-500">{items.length} stocks</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left">Company</th>
                <th className="px-4 py-2.5 text-right">Price</th>
                <th className="px-4 py-2.5 text-right">Change</th>
                <th className="px-4 py-2.5 text-right">% Change</th>
                <th className="px-4 py-2.5 text-right">High</th>
                <th className="px-4 py-2.5 text-right">Low</th>
                <th className="px-4 py-2.5 text-right">Volume</th>
                <th className="px-4 py-2.5 text-right">52W H/L</th>
                <th className="px-4 py-2.5 text-right">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((s: any, i: number) => {
                // Real API fields: company, ticker, price, percent_change, net_change, volume,
                //                  high, low, open, close, overall_rating, 52_week_high, 52_week_low
                const pct   = parseFloat(s.percent_change || s.percentChange || s.pChange || 0);
                const isUp  = pct >= 0;
                const price = parseFloat(s.price || s.ltp || 0);
                return (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-sm">{s.company || s.companyName || s.name}</p>
                      <p className="text-xs text-gray-400">{s.ticker || s.symbol}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold text-sm ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                        {isUp ? '+' : ''}{s.net_change || s.netChange || s.change || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 text-xs font-medium">
                      ₹{parseFloat(s.high || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 text-xs font-medium">
                      ₹{parseFloat(s.low || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {Number(s.volume || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      <span className="text-green-600">H: ₹{parseFloat(s['52_week_high'] || s.yearHigh || 0).toLocaleString('en-IN')}</span>
                      <br />
                      <span className="text-red-600">L: ₹{parseFloat(s['52_week_low'] || s.yearLow || 0).toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.overall_rating === 'Bullish' ? 'bg-green-50 text-green-700' :
                        s.overall_rating === 'Bearish' ? 'bg-red-50 text-red-700' :
                        'bg-yellow-50 text-yellow-700'
                      }`}>{s.overall_rating || '—'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const CommoditiesRenderer = ({ data }: { data: any }) => {
  // API returns a root array: [{ product, last_traded_price, change, per_change, high_price, low_price, oiResult, ... }]
  const items: any[] = extractArray(data);
  const grouped: Record<string, any[]> = {};
  items.forEach(c => {
    const key = c.product?.replace(/\d+/g, '').trim() || 'Other';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  });

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Contracts', value: items.length },
          { label: 'Gainers', value: items.filter(c => parseFloat(c.per_change) > 0).length },
          { label: 'Losers',  value: items.filter(c => parseFloat(c.per_change) < 0).length },
          { label: 'Neutral', value: items.filter(c => parseFloat(c.per_change) === 0).length },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="font-bold text-gray-900 text-xl">{s.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader title="Commodity Futures" count={items.length} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left">Product</th>
                <th className="px-4 py-2.5 text-left">Expiry</th>
                <th className="px-4 py-2.5 text-right">LTP</th>
                <th className="px-4 py-2.5 text-right">Change</th>
                <th className="px-4 py-2.5 text-right">% Change</th>
                <th className="px-4 py-2.5 text-right">High</th>
                <th className="px-4 py-2.5 text-right">Low</th>
                <th className="px-4 py-2.5 text-right">OI Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((c: any, i: number) => {
                const pct = parseFloat(c.per_change);
                const isUp = pct >= 0;
                return (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{c.product}</p>
                      <p className="text-xs text-gray-400">{c.price_quotation_unit}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.expiry || c.product_month}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      ₹{parseFloat(c.last_traded_price || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                        {isUp ? '+' : ''}{c.change}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">
                      ₹{parseFloat(c.high_price || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">
                      ₹{parseFloat(c.low_price || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.oiResult && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          c.oiResult.includes('Long') ? 'bg-green-50 text-green-700' :
                          c.oiResult.includes('Short Covering') ? 'bg-blue-50 text-blue-700' :
                          'bg-red-50 text-red-700'
                        }`}>{c.oiResult}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const MutualFundsRenderer = ({ data }: { data: any }) => {
  // API shape: { Equity: { "Large-Cap": ["@{fund_name=...}", ...] }, Debt: {...}, Hybrid: {...} }
  // Each item is a PowerShell-style string like "@{fund_name=X; latest_nav=Y; ...}"
  const parsePSString = (s: string): Record<string, string> => {
    const result: Record<string, string> = {};
    const inner = s.replace(/^@\{/, '').replace(/\}$/, '');
    inner.split('; ').forEach(pair => {
      const eq = pair.indexOf('=');
      if (eq > -1) result[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
    });
    return result;
  };

  // Flatten all categories into { category, subCategory, funds[] }
  const sections: { cat: string; sub: string; funds: any[] }[] = [];
  Object.entries(data || {}).forEach(([cat, subCats]: [string, any]) => {
    if (typeof subCats === 'object' && !Array.isArray(subCats)) {
      Object.entries(subCats).forEach(([sub, arr]: [string, any]) => {
        if (Array.isArray(arr)) {
          const funds = arr.map((item: any) =>
            typeof item === 'string' && item.startsWith('@{') ? parsePSString(item) : item
          );
          sections.push({ cat, sub, funds });
        }
      });
    }
  });

  const [activeCategory, setActiveCategory] = React.useState(sections[0]?.cat || '');
  const categories = [...new Set(sections.map(s => s.cat))];
  const filtered = sections.filter(s => s.cat === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >{cat}</button>
        ))}
      </div>

      {filtered.map(({ sub, funds }) => (
        <Card key={sub}>
          <div className="px-5 py-3 border-b border-gray-100 bg-pink-50">
            <h3 className="font-semibold text-pink-800 text-sm">{sub}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left">Fund Name</th>
                  <th className="px-4 py-2.5 text-right">NAV</th>
                  <th className="px-4 py-2.5 text-right">1M</th>
                  <th className="px-4 py-2.5 text-right">3M</th>
                  <th className="px-4 py-2.5 text-right">1Y</th>
                  <th className="px-4 py-2.5 text-right">3Y</th>
                  <th className="px-4 py-2.5 text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {funds.map((f: any, i: number) => {
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-gray-900 text-sm leading-snug">{f.fund_name || f.scheme_name || f.name}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        ₹{parseFloat(f.latest_nav || f.nav || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {['1_month_return','3_month_return','1_year_return','3_year_return'].map(key => {
                        const v = parseFloat(f[key] || 0);
                        return (
                          <td key={key} className="px-4 py-3 text-right">
                            <span className={`text-xs font-semibold ${v > 0 ? 'text-green-600' : v < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                              {v > 0 ? '+' : ''}{f[key] || '—'}%
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right">
                        {f.star_rating ? (
                          <span className="text-yellow-500 text-sm">{'★'.repeat(parseInt(f.star_rating) || 0)}</span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
};

const TrendingRenderer = ({ data }: { data: any }) => {
  // API shape: { trending_stocks: { top_gainers: [...], top_losers: [...] } }
  const ts = data?.trending_stocks || data;
  const gainers: any[] = extractArray(ts?.top_gainers || ts?.gainers || []);
  const losers: any[]  = extractArray(ts?.top_losers  || ts?.losers  || []);

  const StockRow = ({ s }: { s: any }) => {
    const pct   = parseFloat(s.percent_change || s.percentChange || s.pChange || 0);
    const isUp  = pct >= 0;
    return (
      <tr className="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
        <td className="px-4 py-3">
          <p className="font-semibold text-gray-900 text-sm">{s.company_name || s.companyName || s.name || '—'}</p>
          <p className="text-xs text-gray-400">{s.ticker_id || s.symbol || '—'} · {s.exchange_type || ''}</p>
        </td>
        <td className="px-4 py-3 text-right font-bold text-gray-900">
          ₹{parseFloat(s.price || s.ltp || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td className="px-4 py-3 text-right">
          <span className={`font-semibold text-sm ${isUp ? 'text-green-600' : 'text-red-600'}`}>
            {isUp ? '+' : ''}{s.net_change || s.change || '—'}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
          </span>
        </td>
        <td className="px-4 py-3 text-right text-gray-500 text-sm">
          {s.volume ? Number(s.volume).toLocaleString('en-IN') : '—'}
        </td>
        <td className="px-4 py-3 text-right">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            s.overall_rating === 'Bullish' ? 'bg-green-50 text-green-700' :
            s.overall_rating === 'Bearish' ? 'bg-red-50 text-red-700' :
            'bg-gray-100 text-gray-600'
          }`}>{s.overall_rating || '—'}</span>
        </td>
      </tr>
    );
  };

  const TableSection = ({ title, items, color }: { title: string; items: any[]; color: string }) => (
    <Card className="overflow-hidden">
      <div className={`px-5 py-3 border-b border-gray-100 flex items-center gap-2 ${color}`}>
        <span className="font-bold text-sm">{title}</span>
        <span className="ml-auto text-xs opacity-70">{items.length} stocks</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-2.5 text-left">Company</th>
              <th className="px-4 py-2.5 text-right">Price</th>
              <th className="px-4 py-2.5 text-right">Change</th>
              <th className="px-4 py-2.5 text-right">% Change</th>
              <th className="px-4 py-2.5 text-right">Volume</th>
              <th className="px-4 py-2.5 text-right">Rating</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s, i) => <StockRow key={i} s={s} />)}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Top Gainers', value: gainers.length, color: 'bg-green-500' },
          { label: 'Top Losers',  value: losers.length,  color: 'bg-red-500'   },
          { label: 'Best Gain',   value: gainers[0] ? `+${gainers[0].percent_change || gainers[0].percentChange || '—'}%` : '—', color: 'bg-emerald-500' },
          { label: 'Worst Loss',  value: losers[0]  ? `${losers[0].percent_change  || losers[0].percentChange  || '—'}%` : '—', color: 'bg-rose-500'    },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-2 h-10 rounded-full ${c.color}`} />
            <div>
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className="font-bold text-gray-900 text-lg">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {gainers.length > 0 && (
        <TableSection title="🚀 Top Gainers" items={gainers} color="text-green-700 bg-green-50" />
      )}
      {losers.length > 0 && (
        <TableSection title="📉 Top Losers" items={losers} color="text-red-700 bg-red-50" />
      )}
    </div>
  );
};

const PriceShockersRenderer = ({ data }: { data: any }) => {
  // API shape: { BSE_PriceShocker: [...], NSE_PriceShocker: [...] }
  const bse: any[] = extractArray(data.BSE_PriceShocker || data.bse_price_shocker || []);
  const nse: any[] = extractArray(data.NSE_PriceShocker || data.nse_price_shocker || []);

  const ShockerTable = ({ items, exchange }: { items: any[]; exchange: string }) => (
    <Card>
      <div className={`px-5 py-3 border-b border-gray-100 flex items-center gap-2 ${exchange === 'BSE' ? 'bg-blue-50' : 'bg-orange-50'}`}>
        <span className={`font-bold text-sm ${exchange === 'BSE' ? 'text-blue-800' : 'text-orange-800'}`}>
          ⚡ {exchange} Price Shockers
        </span>
        <span className="ml-auto text-xs text-gray-500">{items.length} stocks</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-2.5 text-left">Company</th>
              <th className="px-4 py-2.5 text-right">Price</th>
              <th className="px-4 py-2.5 text-right">Change</th>
              <th className="px-4 py-2.5 text-right">% Change</th>
              <th className="px-4 py-2.5 text-right">High</th>
              <th className="px-4 py-2.5 text-right">Low</th>
              <th className="px-4 py-2.5 text-right">Volume</th>
              <th className="px-4 py-2.5 text-right">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((s: any, i: number) => {
              const pct = parseFloat(s.percentChange || 0);
              const isUp = pct >= 0;
              return (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 text-sm">{s.displayName || s.companyName}</p>
                    <p className="text-xs text-gray-400">{s.nseCode || s.tickerId}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    ₹{parseFloat(s.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                      {isUp ? '+' : ''}{s.netChange}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 text-xs font-medium">₹{s.high}</td>
                  <td className="px-4 py-3 text-right text-red-600 text-xs font-medium">₹{s.low}</td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">
                    {Number(s.volume || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.overallRating === 'Bullish' ? 'bg-green-50 text-green-700' :
                      s.overallRating === 'Bearish' ? 'bg-red-50 text-red-700' :
                      'bg-yellow-50 text-yellow-700'
                    }`}>{s.overallRating || '—'}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div className="space-y-5">
      {bse.length > 0 && <ShockerTable items={bse} exchange="BSE" />}
      {nse.length > 0 && <ShockerTable items={nse} exchange="NSE" />}
    </div>
  );
};

const Week52Renderer = ({ data }: { data: any }) => {
  // API shape: { BSE_52WeekHighLow: { high52Week: ["@{ticker=...; company=...; price=...; 52_week_high=...}"], low52Week: [...] }, NSE_52WeekHighLow: {...} }
  const parsePSString = (s: string): Record<string, string> => {
    const result: Record<string, string> = {};
    const inner = s.replace(/^@\{/, '').replace(/\}$/, '');
    inner.split('; ').forEach(pair => {
      const eq = pair.indexOf('=');
      if (eq > -1) result[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
    });
    return result;
  };

  const parseList = (arr: any[]): any[] =>
    (arr || []).map(item => typeof item === 'string' && item.startsWith('@{') ? parsePSString(item) : item);

  const bse = data?.BSE_52WeekHighLow || {};
  const nse = data?.NSE_52WeekHighLow || {};
  const bseHighs = parseList(bse.high52Week || []);
  const bseLows  = parseList(bse.low52Week  || []);
  const nseHighs = parseList(nse.high52Week || []);
  const nseLows  = parseList(nse.low52Week  || []);

  const WeekTable = ({ items, type, exchange }: { items: any[]; type: 'high' | 'low'; exchange: string }) => (
    <Card>
      <div className={`px-5 py-3 border-b border-gray-100 flex items-center gap-2 ${type === 'high' ? 'bg-green-50' : 'bg-red-50'}`}>
        <span className={`font-bold text-sm ${type === 'high' ? 'text-green-800' : 'text-red-800'}`}>
          {type === 'high' ? '🚀' : '📉'} {exchange} 52-Week {type === 'high' ? 'Highs' : 'Lows'}
        </span>
        <span className="ml-auto text-xs text-gray-500">{items.length} stocks</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-2.5 text-left">Company</th>
              <th className="px-4 py-2.5 text-left">Ticker</th>
              <th className="px-4 py-2.5 text-right">Current Price</th>
              <th className="px-4 py-2.5 text-right">52W {type === 'high' ? 'High' : 'Low'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((s: any, i: number) => {
              const price = parseFloat(s.price || 0);
              const ref   = parseFloat(s['52_week_high'] || s['52_week_low'] || 0);
              const diff  = ref > 0 ? ((price - ref) / ref * 100) : 0;
              return (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900 text-sm">{s.company || s.companyName}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{s.ticker || s.symbol}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className={`font-semibold text-sm ${type === 'high' ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{ref.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    {diff !== 0 && (
                      <p className={`text-xs ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(2)}%
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bseHighs.length > 0 && <WeekTable items={bseHighs} type="high" exchange="BSE" />}
        {nseHighs.length > 0 && <WeekTable items={nseHighs} type="high" exchange="NSE" />}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bseLows.length > 0 && <WeekTable items={bseLows} type="low" exchange="BSE" />}
        {nseLows.length > 0 && <WeekTable items={nseLows} type="low" exchange="NSE" />}
      </div>
    </div>
  );
};

const AnnouncementsRenderer = ({ data }: { data: any }) => {
  const items: any[] = extractArray(data);
  return (
    <Card>
      <CardHeader title="Recent Announcements" count={items.length} />
      <div className="divide-y divide-gray-50">
        {items.map((a: any, i: number) => (
          <div key={i} className="px-5 py-4 hover:bg-gray-50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{fmt(a.subject || a.title || a.announcement)}</p>
                {a.date && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{a.date}</p>}
                {a.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.description}</p>}
                {(a.url || a.link) && (
                  <a href={a.url || a.link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-blue-500 hover:underline">
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─── Historical Data Renderer ────────────────────────────────────────────────
const HistoricalDataRenderer = ({ data }: { data: any }) => {
  // Shape: { datasets: [{ metric, label, values: [["date","price"]] }] }
  const datasets: any[] = data?.datasets || [];
  if (!datasets.length) return <div className="text-gray-500 text-center py-10">No data available</div>;

  return (
    <div className="space-y-4">
      {datasets.map((ds: any, di: number) => {
        const values: any[] = ds.values || [];
        const prices = values.map((v: any) => parseFloat(Array.isArray(v) ? v[1] : v.value || 0));
        const maxP = Math.max(...prices);
        const minP = Math.min(...prices);
        const latest = prices[prices.length - 1];
        const first  = prices[0];
        const change = latest - first;
        const pct    = first > 0 ? (change / first) * 100 : 0;
        const isUp   = change >= 0;

        return (
          <Card key={di}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-gray-900">{ds.label || ds.metric}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{values.length} data points</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Latest</p>
                  <p className="font-bold text-gray-900">₹{latest?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Period Change</p>
                  <p className={`font-bold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                    {isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{pct.toFixed(2)}%)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">High / Low</p>
                  <p className="text-xs"><span className="text-green-600 font-semibold">₹{maxP.toLocaleString('en-IN')}</span> / <span className="text-red-600 font-semibold">₹{minP.toLocaleString('en-IN')}</span></p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left">Date</th>
                    <th className="px-4 py-2.5 text-right">Price</th>
                    <th className="px-4 py-2.5 text-right">Change</th>
                    <th className="px-4 py-2.5 text-right w-40">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...values].reverse().map((v: any, i: number) => {
                    const date  = Array.isArray(v) ? v[0] : v.date;
                    const price = parseFloat(Array.isArray(v) ? v[1] : v.value || 0);
                    const idx   = values.length - 1 - i;
                    const prev  = idx > 0 ? parseFloat(Array.isArray(values[idx-1]) ? values[idx-1][1] : values[idx-1].value || 0) : price;
                    const diff  = price - prev;
                    const diffPct = prev > 0 ? (diff / prev) * 100 : 0;
                    const barW  = maxP > minP ? ((price - minP) / (maxP - minP)) * 100 : 50;
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-gray-600 text-xs font-medium">{date}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                          ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {idx > 0 && (
                            <span className={`text-xs font-semibold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {diff >= 0 ? '+' : ''}{diff.toFixed(2)} ({diffPct.toFixed(2)}%)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${isUp ? 'bg-blue-400' : 'bg-orange-400'}`} style={{ width: `${barW}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// ─── Corporate Actions Renderer ───────────────────────────────────────────────
const CorporateActionsRenderer = ({ data }: { data: any }) => {
  // Shape: { board_meetings: { title, header: ["Date","Agenda"], data: [["date","text"]] }, dividends: {...}, ... }
  const sections = Object.entries(data || {}).filter(([, v]: [string, any]) => v && v.data);

  return (
    <div className="space-y-4">
      {sections.map(([key, section]: [string, any]) => {
        const rows: any[][] = section.data || [];
        const headers: string[] = section.header || [];
        if (!rows.length) return null;
        return (
          <Card key={key}>
            <div className="px-5 py-3 border-b border-gray-100 bg-sky-50">
              <h3 className="font-bold text-sky-800 text-sm">{section.title || key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</h3>
            </div>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-xs text-gray-500 uppercase tracking-wider">
                    {headers.map((h: string, i: number) => (
                      <th key={i} className={`px-4 py-2.5 ${i === 0 ? 'text-left w-32' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((row: any[], i: number) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      {row.map((cell: any, j: number) => (
                        <td key={j} className={`px-4 py-2.5 text-gray-700 text-xs ${j === 0 ? 'font-semibold text-gray-900 whitespace-nowrap' : 'leading-relaxed'}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

const GenericTableRenderer = ({ data, title }: { data: any; title: string }) => {
  const items: any[] = extractArray(data);
  if (!items.length) {
    const keys = Object.keys(data || {});
    if (keys.length) {
      return (
        <Card>
          <CardHeader title={title} />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {keys.map(k => (
              <div key={k} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 capitalize">{k.replace(/_/g, ' ')}</p>
                <p className="font-semibold text-gray-900 text-sm mt-0.5 break-words">{typeof data[k] === 'object' ? JSON.stringify(data[k]) : fmt(data[k])}</p>
              </div>
            ))}
          </div>
        </Card>
      );
    }
    return null;
  }
  const keys = Object.keys(items[0] || {}).slice(0, 6);
  return (
    <Card>
      <CardHeader title={title} count={items.length} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              {keys.map(k => <th key={k} className="px-5 py-3 text-left">{k.replace(/_/g, ' ')}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.slice(0, 20).map((row: any, i: number) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                {keys.map(k => (
                  <td key={k} className="px-5 py-3 text-gray-700">
                    {typeof row[k] === 'object' ? JSON.stringify(row[k]) : fmt(row[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// ─── Smart Renderer ──────────────────────────────────────────────────────────
const DataRenderer = ({ id, data }: { id: string; data: any }) => {
  const ep = ALL_ENDPOINTS.find(e => e.id === id);
  const title = ep?.name || id;
  if (!data || (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0)) return null;

  try {
    switch (id) {
      case 'ipo':              return <IpoRenderer data={data} />;
      case 'news':             return <NewsRenderer data={data} />;
      case 'stock':            return <StockRenderer data={data} />;
      case 'trending':         return <TrendingRenderer data={data} />;
      case 'bseActive':        return <StockListRenderer data={data} title="BSE Most Active" />;
      case 'nseActive':        return <StockListRenderer data={data} title="NSE Most Active" />;
      case 'commodities':      return <CommoditiesRenderer data={data} />;
      case 'mutualFunds':      return <MutualFundsRenderer data={data} />;
      case 'mutualFundSearch': return <MutualFundsRenderer data={data} />;
      case 'mutualFundDetails':return <MutualFundsRenderer data={data} />;
      case 'priceShockers':    return <PriceShockersRenderer data={data} />;
      case 'week52':           return <Week52Renderer data={data} />;
      case 'announcements':    return <AnnouncementsRenderer data={data} />;
      case 'historical':       return <HistoricalDataRenderer data={data} />;
      case 'historicalStats':  return <HistoricalDataRenderer data={data} />;
      case 'corporateActions': return <CorporateActionsRenderer data={data} />;
      default:                 return <GenericTableRenderer data={data} title={title} />;
    }
  } catch {
    // Fallback: show raw data in a readable format
    return <GenericTableRenderer data={data} title={title} />;
  }
};

// ─── Empty / Loading States ──────────────────────────────────────────────────
const EmptyState = ({
  needsQuery, placeholder, onSearch
}: {
  needsQuery?: boolean;
  placeholder?: string;
  onSearch?: (q: string) => void;
}) => {
  const [val, setVal] = React.useState('');
  if (needsQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
          <Search className="w-8 h-8 text-blue-400" />
        </div>
        <p className="text-gray-800 font-semibold text-lg mb-1">Search to get started</p>
        <p className="text-gray-400 text-sm mb-6">{placeholder ? `Try: "${placeholder.replace('e.g. ', '')}"` : 'Enter a name or keyword'}</p>
        <form
          onSubmit={e => { e.preventDefault(); if (val.trim()) onSearch?.(val.trim()); }}
          className="flex gap-2 w-full max-w-sm"
        >
          <input
            autoFocus
            type="text"
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder={placeholder || 'Search...'}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
          />
          <button
            type="submit"
            disabled={!val.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition"
          >
            Search
          </button>
        </form>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Search className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-gray-600 font-medium">No data available</p>
      <p className="text-gray-400 text-sm mt-1">Try refreshing the page</p>
    </div>
  );
};

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin mb-4" />
    <p className="text-gray-500 font-medium">Fetching data...</p>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
      <AlertCircle className="w-8 h-8 text-red-400" />
    </div>
    <p className="text-red-600 font-medium">Something went wrong</p>
    <p className="text-gray-400 text-sm mt-1 max-w-sm">{message}</p>
  </div>
);

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [activeId, setActiveId] = useState('ipo');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeEp = ALL_ENDPOINTS.find(e => e.id === activeId)!;

  const buildUrl = useCallback((id: string, q: string) => {
    const ep = ALL_ENDPOINTS.find(e => e.id === id)!;
    const base = `${API_BASE_URL}${ep.path}`;
    const params: Record<string, string> = {};
    if (id === 'stock' && q) params['name'] = q;
    else if (id === 'statement' && q) { params['stock_name'] = q; params['stats'] = ''; }
    else if (id === 'historical' && q) { params['stock_name'] = q; params['period'] = '1m'; params['filter'] = 'default'; }
    else if (id === 'industry' && q) params['query'] = q;
    else if (id === 'forecasts' && q) { params['stock_id'] = q; params['measure_code'] = 'EPS'; params['period_type'] = 'Annual'; params['data_type'] = 'Actuals'; params['age'] = 'OneWeekAgo'; }
    else if (id === 'historicalStats' && q) { params['stock_name'] = q; params['stats'] = ''; }
    else if (id === 'corporateActions' && q) params['stock_name'] = q;
    else if (id === 'mutualFundSearch' && q) params['query'] = q;
    else if (id === 'targetPrice' && q) params['stock_id'] = q;
    else if (id === 'mutualFundDetails' && q) params['stock_name'] = q;
    else if (id === 'announcements' && q) params['stock_name'] = q;
    const qs = new URLSearchParams(params).toString();
    return qs ? `${base}?${qs}` : base;
  }, []);

  const fetchData = useCallback(async (id: string, q: string) => {
    const ep = ALL_ENDPOINTS.find(e => e.id === id)!;
    if (ep.needsQuery && !q) { setData(null); setError(null); return; }
    setLoading(true); setError(null); setData(null);
    try {
      const res = await fetch(buildUrl(id, q), { headers: { 'x-api-key': API_KEY } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => { fetchData(activeId, query); }, [activeId, query, fetchData]);

  const handleTabChange = (id: string) => {
    setActiveId(id);
    setQuery('');
    setInputVal('');
    setSidebarOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(inputVal.trim());
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Top Nav ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 h-14 flex items-center px-4 gap-4">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 hidden sm:block">StockDash</span>
        </div>
        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-lg mx-auto">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder={activeEp?.needsQuery ? (activeEp as any).placeholder || 'Search...' : 'Select a section from sidebar'}
                disabled={!activeEp?.needsQuery}
                className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              />
              {inputVal && (
                <button type="button" onClick={() => { setInputVal(''); setQuery(''); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {activeEp?.needsQuery && (
              <button
                type="submit"
                className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
              >
                Search
              </button>
            )}
          </div>
        </form>
        <button onClick={() => fetchData(activeId, query)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition shrink-0" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-500' : ''}`} />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className={`
          fixed md:static inset-y-0 left-0 z-40 w-60 bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-in-out pt-14 md:pt-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col overflow-y-auto
        `}>
          <div className="p-3 flex-1">
            {NAV_GROUPS.map(group => (
              <div key={group.label} className="mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1">{group.label}</p>
                {group.items.map(ep => (
                  <button
                    key={ep.id}
                    onClick={() => handleTabChange(ep.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all mb-0.5
                      ${activeId === ep.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <ep.icon className={`w-4 h-4 shrink-0 ${activeId === ep.id ? 'text-blue-600' : ep.color}`} />
                    <span className="truncate">{ep.name}</span>
                    {activeId === ep.id && <ChevronRight className="w-3 h-3 ml-auto text-blue-400" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* ── Overlay for mobile ── */}
        {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* ── Main Content ── */}
        <main className={`flex-1 overflow-y-auto ${activeId === 'chart' ? 'p-0' : 'p-4 md:p-6'}`}>
          {activeId === 'chart' ? (
            <TradingChartPage />
          ) : (
            <>
              {/* Page title */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50`}>
                  <activeEp.icon className={`w-5 h-5 ${activeEp.color}`} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{activeEp.name}</h1>
                  {query && <p className="text-sm text-gray-500">Results for "<span className="font-medium text-gray-700">{query}</span>"</p>}
                </div>
                {data && !loading && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Live
                  </span>
                )}
              </div>

              {/* Content */}
              {loading && <LoadingState />}
              {!loading && error && <ErrorState message={error} />}
              {!loading && !error && !data && (
                <EmptyState
                  needsQuery={activeEp.needsQuery}
                  placeholder={(activeEp as any).placeholder}
                  onSearch={q => { setInputVal(q); setQuery(q); }}
                />
              )}
              {!loading && !error && data && <DataRenderer id={activeId} data={data} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
