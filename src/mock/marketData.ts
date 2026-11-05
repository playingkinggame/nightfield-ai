/**
 * High-fidelity market dataset for NIGHTFIELD
 * Features Indian NSE/BSE equities, benchmark index funds, key ratios, news sentiment,
 * and deterministic candlestick history generators.
 */

export interface StockQuote {
  symbol: string;
  name: string;
  exchange: "NSE" | "BSE";
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  marketCapCr: number; // In ₹ Crores
  pe: number;
  eps: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  beta: number;
  dividendYield: number;
  sparkline: number[];
  colorType: "amber" | "coral" | "mint" | "orchid"; // performance/type tint
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  timeAgo: string;
  url: string;
  sentiment: "Bullish" | "Neutral" | "Cautious";
  impact: "High" | "Medium" | "Low";
}

export interface FundData {
  code: string;
  name: string;
  category: string;
  nav: number;
  changePercent: number;
  aumCr: number;
  expenseRatio: number;
  oneYearReturn: number;
  threeYearReturn: number;
  fiveYearReturn: number;
  riskRating: "Very High" | "Moderate" | "Low";
  topHoldings: { symbol: string; name: string; percentage: number }[];
  description: string;
}

export interface CandleData {
  time: string; // ISO date string or YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const STOCKS_DATA: StockQuote[] = [
  {
    symbol: "RELIANCE.NS",
    name: "Reliance Industries Ltd",
    exchange: "NSE",
    sector: "Energy & Conglomerate",
    price: 2984.50,
    change: 42.10,
    changePercent: 1.43,
    open: 2948.00,
    high: 2998.00,
    low: 2942.20,
    previousClose: 2942.40,
    volume: 6420800,
    marketCapCr: 2018500,
    pe: 28.4,
    eps: 105.1,
    fiftyTwoWeekHigh: 3217.90,
    fiftyTwoWeekLow: 2220.30,
    beta: 1.08,
    dividendYield: 0.35,
    sparkline: [2920, 2935, 2928, 2950, 2962, 2955, 2975, 2984.5],
    colorType: "amber",
  },
  {
    symbol: "TCS.NS",
    name: "Tata Consultancy Services",
    exchange: "NSE",
    sector: "Information Technology",
    price: 4120.30,
    change: 68.75,
    changePercent: 1.70,
    open: 4065.00,
    high: 4140.00,
    low: 4058.10,
    previousClose: 4051.55,
    volume: 2890400,
    marketCapCr: 1490200,
    pe: 31.2,
    eps: 132.0,
    fiftyTwoWeekHigh: 4585.00,
    fiftyTwoWeekLow: 3313.00,
    beta: 0.74,
    dividendYield: 1.32,
    sparkline: [4040, 4055, 4070, 4095, 4085, 4110, 4120.3],
    colorType: "amber",
  },
  {
    symbol: "HDFCBANK.NS",
    name: "HDFC Bank Limited",
    exchange: "NSE",
    sector: "Banking & Financials",
    price: 1745.80,
    change: -12.40,
    changePercent: -0.71,
    open: 1762.00,
    high: 1768.00,
    low: 1738.50,
    previousClose: 1758.20,
    volume: 14205000,
    marketCapCr: 1329400,
    pe: 19.8,
    eps: 88.2,
    fiftyTwoWeekHigh: 1794.00,
    fiftyTwoWeekLow: 1363.55,
    beta: 0.95,
    dividendYield: 1.12,
    sparkline: [1760, 1758, 1752, 1748, 1751, 1740, 1745.8],
    colorType: "orchid",
  },
  {
    symbol: "INFY.NS",
    name: "Infosys Limited",
    exchange: "NSE",
    sector: "Information Technology",
    price: 1892.40,
    change: 34.60,
    changePercent: 1.86,
    open: 1865.00,
    high: 1904.50,
    low: 1858.00,
    previousClose: 1857.80,
    volume: 7850000,
    marketCapCr: 785200,
    pe: 29.5,
    eps: 64.1,
    fiftyTwoWeekHigh: 1991.45,
    fiftyTwoWeekLow: 1358.35,
    beta: 0.88,
    dividendYield: 1.95,
    sparkline: [1850, 1862, 1858, 1878, 1885, 1880, 1892.4],
    colorType: "amber",
  },
  {
    symbol: "ICICIBANK.NS",
    name: "ICICI Bank Limited",
    exchange: "NSE",
    sector: "Banking & Financials",
    price: 1268.90,
    change: 14.30,
    changePercent: 1.14,
    open: 1256.00,
    high: 1274.00,
    low: 1252.00,
    previousClose: 1254.60,
    volume: 9840200,
    marketCapCr: 893100,
    pe: 18.2,
    eps: 69.7,
    fiftyTwoWeekHigh: 1318.00,
    fiftyTwoWeekLow: 914.00,
    beta: 1.02,
    dividendYield: 0.79,
    sparkline: [1250, 1255, 1258, 1264, 1260, 1266, 1268.9],
    colorType: "amber",
  },
  {
    symbol: "BHARTIARTL.NS",
    name: "Bharti Airtel Ltd",
    exchange: "NSE",
    sector: "Telecommunications",
    price: 1684.20,
    change: 22.80,
    changePercent: 1.37,
    open: 1665.00,
    high: 1692.00,
    low: 1658.00,
    previousClose: 1661.40,
    volume: 4890000,
    marketCapCr: 958200,
    pe: 58.2,
    eps: 28.9,
    fiftyTwoWeekHigh: 1779.00,
    fiftyTwoWeekLow: 915.00,
    beta: 0.65,
    dividendYield: 0.48,
    sparkline: [1655, 1662, 1670, 1668, 1675, 1680, 1684.2],
    colorType: "coral",
  },
  {
    symbol: "ITC.NS",
    name: "ITC Limited",
    exchange: "NSE",
    sector: "FMCG & Hotels",
    price: 492.60,
    change: -2.85,
    changePercent: -0.58,
    open: 496.00,
    high: 498.50,
    low: 491.10,
    previousClose: 495.45,
    volume: 11400200,
    marketCapCr: 614800,
    pe: 29.8,
    eps: 16.5,
    fiftyTwoWeekHigh: 528.50,
    fiftyTwoWeekLow: 399.30,
    beta: 0.52,
    dividendYield: 2.80,
    sparkline: [496, 495, 497, 494, 493, 491, 492.6],
    colorType: "orchid",
  },
  {
    symbol: "LT.NS",
    name: "Larsen & Toubro Ltd",
    exchange: "NSE",
    sector: "Infrastructure & Engineering",
    price: 3640.10,
    change: 54.20,
    changePercent: 1.51,
    open: 3595.00,
    high: 3660.00,
    low: 3588.00,
    previousClose: 3585.90,
    volume: 2450000,
    marketCapCr: 500200,
    pe: 34.1,
    eps: 106.7,
    fiftyTwoWeekHigh: 3919.90,
    fiftyTwoWeekLow: 2860.00,
    beta: 1.15,
    dividendYield: 0.82,
    sparkline: [3580, 3600, 3615, 3610, 3630, 3635, 3640.1],
    colorType: "amber",
  },
  {
    symbol: "TATAMOTORS.NS",
    name: "Tata Motors Limited",
    exchange: "NSE",
    sector: "Automotive & EV",
    price: 842.15,
    change: -14.20,
    changePercent: -1.66,
    open: 858.00,
    high: 862.00,
    low: 838.00,
    previousClose: 856.35,
    volume: 15600000,
    marketCapCr: 309800,
    pe: 9.8,
    eps: 85.9,
    fiftyTwoWeekHigh: 1179.05,
    fiftyTwoWeekLow: 640.00,
    beta: 1.48,
    dividendYield: 0.71,
    sparkline: [855, 858, 850, 846, 848, 839, 842.15],
    colorType: "orchid",
  },
  {
    symbol: "SUNPHARMA.NS",
    name: "Sun Pharma Industries",
    exchange: "NSE",
    sector: "Healthcare & Pharma",
    price: 1812.50,
    change: 28.40,
    changePercent: 1.59,
    open: 1790.00,
    high: 1824.00,
    low: 1785.00,
    previousClose: 1784.10,
    volume: 3200000,
    marketCapCr: 434900,
    pe: 41.6,
    eps: 43.5,
    fiftyTwoWeekHigh: 1960.00,
    fiftyTwoWeekLow: 1105.00,
    beta: 0.58,
    dividendYield: 0.75,
    sparkline: [1780, 1788, 1795, 1802, 1798, 1810, 1812.5],
    colorType: "amber",
  },
  {
    symbol: "UTI-NIFTY-50",
    name: "UTI Nifty 50 Index Fund",
    exchange: "NSE",
    sector: "Benchmark Index Fund",
    price: 184.22,
    change: 0.98,
    changePercent: 0.53,
    open: 183.50,
    high: 184.50,
    low: 183.20,
    previousClose: 183.24,
    volume: 850000,
    marketCapCr: 18500,
    pe: 22.4,
    eps: 8.2,
    fiftyTwoWeekHigh: 189.40,
    fiftyTwoWeekLow: 145.20,
    beta: 1.00,
    dividendYield: 1.10,
    sparkline: [181, 182, 182.5, 183, 183.8, 184.22],
    colorType: "mint",
  },
  {
    symbol: "NIFTYBEES.NS",
    name: "Nippon India ETF Nifty BeES",
    exchange: "NSE",
    sector: "Index ETF",
    price: 265.40,
    change: 1.45,
    changePercent: 0.55,
    open: 264.10,
    high: 266.00,
    low: 263.80,
    previousClose: 263.95,
    volume: 12500000,
    marketCapCr: 32400,
    pe: 22.4,
    eps: 11.8,
    fiftyTwoWeekHigh: 272.80,
    fiftyTwoWeekLow: 208.50,
    beta: 1.00,
    dividendYield: 0.95,
    sparkline: [262, 263, 263.8, 264.5, 264.9, 265.4],
    colorType: "mint",
  },
];

export const FUNDS_DATA: FundData[] = [
  {
    code: "UTI-NIFTY-50",
    name: "UTI Nifty 50 Index Fund Direct-Growth",
    category: "Large Cap Index",
    nav: 184.22,
    changePercent: 0.53,
    aumCr: 18540,
    expenseRatio: 0.18,
    oneYearReturn: 24.8,
    threeYearReturn: 16.4,
    fiveYearReturn: 17.8,
    riskRating: "Very High",
    description: "Replicates the performance of the Nifty 50 index with negligible tracking error. Low cost passive core holding for compounding.",
    topHoldings: [
      { symbol: "HDFCBANK.NS", name: "HDFC Bank", percentage: 11.45 },
      { symbol: "RELIANCE.NS", name: "Reliance Industries", percentage: 9.82 },
      { symbol: "ICICIBANK.NS", name: "ICICI Bank", percentage: 7.91 },
      { symbol: "INFY.NS", name: "Infosys Ltd", percentage: 5.84 },
      { symbol: "ITC.NS", name: "ITC Ltd", percentage: 4.38 },
      { symbol: "TCS.NS", name: "Tata Consultancy Services", percentage: 4.12 },
    ],
  },
  {
    code: "NIFTYBEES.NS",
    name: "Nippon India ETF Nifty BeES",
    category: "Exchange Traded Fund",
    nav: 265.40,
    changePercent: 0.55,
    aumCr: 32400,
    expenseRatio: 0.04,
    oneYearReturn: 24.9,
    threeYearReturn: 16.5,
    fiveYearReturn: 17.9,
    riskRating: "Very High",
    description: "India's highest liquidity equity ETF. Trades intraday directly on NSE with microscopic bid-ask spread.",
    topHoldings: [
      { symbol: "HDFCBANK.NS", name: "HDFC Bank", percentage: 11.45 },
      { symbol: "RELIANCE.NS", name: "Reliance Industries", percentage: 9.82 },
      { symbol: "ICICIBANK.NS", name: "ICICI Bank", percentage: 7.91 },
      { symbol: "INFY.NS", name: "Infosys Ltd", percentage: 5.84 },
    ],
  },
  {
    code: "NAVI-NIFTY-50",
    name: "Navi Nifty 50 Index Fund Direct",
    category: "Large Cap Index",
    nav: 15.82,
    changePercent: 0.52,
    aumCr: 2180,
    expenseRatio: 0.06,
    oneYearReturn: 25.1,
    threeYearReturn: 16.6,
    fiveYearReturn: 18.0,
    riskRating: "Very High",
    description: "Ultra-low expense ratio benchmark fund engineered with algorithmic index matching.",
    topHoldings: [
      { symbol: "HDFCBANK.NS", name: "HDFC Bank", percentage: 11.45 },
      { symbol: "RELIANCE.NS", name: "Reliance Industries", percentage: 9.82 },
      { symbol: "ICICIBANK.NS", name: "ICICI Bank", percentage: 7.91 },
    ],
  },
  {
    code: "MIRAE-SMALLCAP-250",
    name: "Mirae Asset Nifty Smallcap 250 ETF",
    category: "Small Cap Index",
    nav: 44.15,
    changePercent: 1.28,
    aumCr: 3950,
    expenseRatio: 0.35,
    oneYearReturn: 42.6,
    threeYearReturn: 28.2,
    fiveYearReturn: 24.5,
    riskRating: "Very High",
    description: "Captures 250 emerging growth enterprises across India's domestic manufacturing and consumer revolution.",
    topHoldings: [
      { symbol: "SUZLON.NS", name: "Suzlon Energy", percentage: 2.15 },
      { symbol: "BSE.NS", name: "BSE Limited", percentage: 1.94 },
      { symbol: "EXIDEIND.NS", name: "Exide Industries", percentage: 1.62 },
    ],
  },
];

export const MOCK_NEWS: Record<string, NewsItem[]> = {
  default: [
    {
      id: "n1",
      title: "RBI signals stable liquidity as credit growth remains robust across private sector banks",
      source: "Mint Financial",
      timeAgo: "2 hours ago",
      url: "#",
      sentiment: "Bullish",
      impact: "High",
    },
    {
      id: "n2",
      title: "Domestic institutional inflows into index mutual funds cross ₹14,000 Cr in single month",
      source: "Economic Times",
      timeAgo: "4 hours ago",
      url: "#",
      sentiment: "Bullish",
      impact: "Medium",
    },
    {
      id: "n3",
      title: "Crude oil consolidates near $76 as global demand projections moderate",
      source: "Reuters India",
      timeAgo: "6 hours ago",
      url: "#",
      sentiment: "Neutral",
      impact: "Medium",
    },
  ],
  "TCS.NS": [
    {
      id: "t1",
      title: "TCS expands cloud AI partnership with global financial enterprises in Europe",
      source: "Bloomberg",
      timeAgo: "1 hour ago",
      url: "#",
      sentiment: "Bullish",
      impact: "High",
    },
    {
      id: "t2",
      title: "Q3 constant currency revenue guidance shows resilient discretionary IT spending",
      source: "Business Standard",
      timeAgo: "5 hours ago",
      url: "#",
      sentiment: "Bullish",
      impact: "Medium",
    },
  ],
  "RELIANCE.NS": [
    {
      id: "r1",
      title: "Jio Infocomm reports 14% increase in ARPU following recent tariff rationalization",
      source: "CNBC TV18",
      timeAgo: "3 hours ago",
      url: "#",
      sentiment: "Bullish",
      impact: "High",
    },
    {
      id: "r2",
      title: "Retail wing accelerates new automated logistics hubs across tier-2 cities",
      source: "Financial Express",
      timeAgo: "8 hours ago",
      url: "#",
      sentiment: "Neutral",
      impact: "Low",
    },
  ],
};

/**
 * Generate synthetic realistic candlestick history
 */
export function generateCandleHistory(basePrice: number, period: "1D" | "1W" | "1M" | "6M" | "1Y" | "5Y"): CandleData[] {
  const pointsCount = period === "1D" ? 75 : period === "1W" ? 60 : period === "1M" ? 30 : period === "6M" ? 90 : period === "1Y" ? 180 : 250;
  const candles: CandleData[] = [];

  let currentPrice = basePrice * (period === "5Y" ? 0.45 : period === "1Y" ? 0.8 : period === "6M" ? 0.9 : 0.98);
  const now = new Date();

  const stepMs =
    period === "1D" ? 5 * 60 * 1000 :
    period === "1W" ? 60 * 60 * 1000 :
    period === "1M" ? 24 * 60 * 60 * 1000 :
    period === "6M" ? 2 * 24 * 60 * 60 * 1000 :
    period === "1Y" ? 2 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

  let seed = 42;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const startTime = new Date(now.getTime() - pointsCount * stepMs);

  for (let i = 0; i < pointsCount; i++) {
    const timestamp = new Date(startTime.getTime() + i * stepMs);
    const dateStr = period === "1D" || period === "1W" 
      ? timestamp.toISOString() 
      : timestamp.toISOString().split("T")[0];

    const drift = (basePrice - currentPrice) / (pointsCount - i) * 0.4;
    const volatility = currentPrice * 0.012;
    const change = (pseudoRandom() - 0.48) * volatility + drift;

    const open = currentPrice;
    const close = Math.max(1, open + change);
    const high = Math.max(open, close) + pseudoRandom() * volatility * 0.6;
    const low = Math.min(open, close) - pseudoRandom() * volatility * 0.6;
    const volume = Math.floor(100000 + pseudoRandom() * 900000);

    candles.push({
      time: dateStr,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    currentPrice = close;
  }

  // Ensure last close touches exact current market price
  if (candles.length > 0) {
    const last = candles[candles.length - 1];
    last.close = basePrice;
    last.high = Math.max(last.high, basePrice);
    last.low = Math.min(last.low, basePrice);
  }

  return candles;
}
