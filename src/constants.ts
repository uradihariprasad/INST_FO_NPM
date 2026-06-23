// F&O Stocks Master List with sectors and lot sizes
export const FO_STOCKS: Array<{
  symbol: string;
  name: string;
  sector: string;
  lotSize: number;
  instrumentKey: string;
}> = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', lotSize: 250, instrumentKey: 'NSE_EQ|INE002A01018' },
  { symbol: 'TCS', name: 'Tata Consultancy', sector: 'IT', lotSize: 175, instrumentKey: 'NSE_EQ|INE467B01029' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', lotSize: 550, instrumentKey: 'NSE_EQ|INE040A01034' },
  { symbol: 'INFY', name: 'Infosys', sector: 'IT', lotSize: 400, instrumentKey: 'NSE_EQ|INE009A01021' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking', lotSize: 700, instrumentKey: 'NSE_EQ|INE090A01021' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', sector: 'FMCG', lotSize: 300, instrumentKey: 'NSE_EQ|INE030A01027' },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking', lotSize: 750, instrumentKey: 'NSE_EQ|INE062A01020' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom', lotSize: 475, instrumentKey: 'NSE_EQ|INE397D01024' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking', lotSize: 400, instrumentKey: 'NSE_EQ|INE237A01028' },
  { symbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG', lotSize: 1600, instrumentKey: 'NSE_EQ|INE154A01025' },
  { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Infrastructure', lotSize: 150, instrumentKey: 'NSE_EQ|INE018A01030' },
  { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Banking', lotSize: 625, instrumentKey: 'NSE_EQ|INE238A01034' },
  { symbol: 'WIPRO', name: 'Wipro', sector: 'IT', lotSize: 1500, instrumentKey: 'NSE_EQ|INE075A01022' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', sector: 'NBFC', lotSize: 125, instrumentKey: 'NSE_EQ|INE296A01024' },
  { symbol: 'HCLTECH', name: 'HCL Technologies', sector: 'IT', lotSize: 350, instrumentKey: 'NSE_EQ|INE860A01027' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints', sector: 'Consumer', lotSize: 300, instrumentKey: 'NSE_EQ|INE021A01026' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Auto', lotSize: 100, instrumentKey: 'NSE_EQ|INE585B01010' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharma', sector: 'Pharma', lotSize: 700, instrumentKey: 'NSE_EQ|INE044A01036' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', sector: 'Auto', lotSize: 550, instrumentKey: 'NSE_EQ|INE155A01022' },
  { symbol: 'TITAN', name: 'Titan Company', sector: 'Consumer', lotSize: 175, instrumentKey: 'NSE_EQ|INE280A01028' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', sector: 'Cement', lotSize: 50, instrumentKey: 'NSE_EQ|INE481G01011' },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv', sector: 'NBFC', lotSize: 500, instrumentKey: 'NSE_EQ|INE918I01018' },
  { symbol: 'NESTLEIND', name: 'Nestle India', sector: 'FMCG', lotSize: 50, instrumentKey: 'NSE_EQ|INE239A01016' },
  { symbol: 'ONGC', name: 'ONGC', sector: 'Energy', lotSize: 3850, instrumentKey: 'NSE_EQ|INE213A01029' },
  { symbol: 'NTPC', name: 'NTPC', sector: 'Power', lotSize: 2250, instrumentKey: 'NSE_EQ|INE733E01010' },
  { symbol: 'TATASTEEL', name: 'Tata Steel', sector: 'Metals', lotSize: 5500, instrumentKey: 'NSE_EQ|INE081A01020' },
  { symbol: 'POWERGRID', name: 'Power Grid Corp', sector: 'Power', lotSize: 2700, instrumentKey: 'NSE_EQ|INE752E01010' },
  { symbol: 'TECHM', name: 'Tech Mahindra', sector: 'IT', lotSize: 600, instrumentKey: 'NSE_EQ|INE669C01036' },
  { symbol: 'JSWSTEEL', name: 'JSW Steel', sector: 'Metals', lotSize: 675, instrumentKey: 'NSE_EQ|INE019A01038' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', sector: 'Conglomerate', lotSize: 250, instrumentKey: 'NSE_EQ|INE423A01024' },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank', sector: 'Banking', lotSize: 500, instrumentKey: 'NSE_EQ|INE095A01012' },
  { symbol: 'DRREDDY', name: "Dr Reddy's Labs", sector: 'Pharma', lotSize: 125, instrumentKey: 'NSE_EQ|INE089A01023' },
  { symbol: 'CIPLA', name: 'Cipla', sector: 'Pharma', lotSize: 650, instrumentKey: 'NSE_EQ|INE059A01026' },
  { symbol: 'EICHERMOT', name: 'Eicher Motors', sector: 'Auto', lotSize: 175, instrumentKey: 'NSE_EQ|INE066A01021' },
  { symbol: 'DIVISLAB', name: "Divi's Lab", sector: 'Pharma', lotSize: 100, instrumentKey: 'NSE_EQ|INE361B01024' },
  { symbol: 'BPCL', name: 'BPCL', sector: 'Energy', lotSize: 1800, instrumentKey: 'NSE_EQ|INE029A01011' },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals', sector: 'Healthcare', lotSize: 125, instrumentKey: 'NSE_EQ|INE437A01024' },
  { symbol: 'TATACONSUM', name: 'Tata Consumer', sector: 'FMCG', lotSize: 600, instrumentKey: 'NSE_EQ|INE192A01025' },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp', sector: 'Auto', lotSize: 150, instrumentKey: 'NSE_EQ|INE158A01026' },
  { symbol: 'COALINDIA', name: 'Coal India', sector: 'Mining', lotSize: 1200, instrumentKey: 'NSE_EQ|INE522F01014' },
  { symbol: 'GRASIM', name: 'Grasim Industries', sector: 'Diversified', lotSize: 250, instrumentKey: 'NSE_EQ|INE047A01021' },
  { symbol: 'BRITANNIA', name: 'Britannia Industries', sector: 'FMCG', lotSize: 100, instrumentKey: 'NSE_EQ|INE216A01030' },
  { symbol: 'SBILIFE', name: 'SBI Life Insurance', sector: 'Insurance', lotSize: 375, instrumentKey: 'NSE_EQ|INE123W01016' },
  { symbol: 'HINDALCO', name: 'Hindalco Industries', sector: 'Metals', lotSize: 700, instrumentKey: 'NSE_EQ|INE038A01020' },
  { symbol: 'VEDL', name: 'Vedanta', sector: 'Metals', lotSize: 1550, instrumentKey: 'NSE_EQ|INE205A01025' },
  { symbol: 'BANKBARODA', name: 'Bank of Baroda', sector: 'Banking', lotSize: 2925, instrumentKey: 'NSE_EQ|INE028A01039' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra', sector: 'Auto', lotSize: 350, instrumentKey: 'NSE_EQ|INE101A01026' },
  { symbol: 'HDFC', name: 'HDFC Life', sector: 'Insurance', lotSize: 550, instrumentKey: 'NSE_EQ|INE795G01014' },
  { symbol: 'DLF', name: 'DLF', sector: 'Realty', lotSize: 825, instrumentKey: 'NSE_EQ|INE271C01023' },
  { symbol: 'PNB', name: 'Punjab National Bank', sector: 'Banking', lotSize: 4000, instrumentKey: 'NSE_EQ|INE160A01022' },
];

export const SECTORS = [
  'Banking', 'IT', 'Energy', 'FMCG', 'Auto', 'Pharma', 'Metals',
  'Infrastructure', 'NBFC', 'Consumer', 'Cement', 'Power', 'Telecom',
  'Insurance', 'Realty', 'Mining', 'Healthcare', 'Conglomerate', 'Diversified'
];

export const SCAN_INTERVAL_MS = 30000; // 30 seconds
export const CHART_REFRESH_MS = 5000;

// Scoring weights for composite score
export const SCORE_WEIGHTS = {
  momentum: 0.20,
  volume: 0.15,
  trend: 0.15,
  relativeStrength: 0.10,
  oi: 0.15,
  sector: 0.05,
  pattern: 0.10,
  timing: 0.10,
};
