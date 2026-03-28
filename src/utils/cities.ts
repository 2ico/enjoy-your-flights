export interface CityInfo {
  code: string;
  name: string;
  coordinates: number[]; // [lng, lat]
  tourismScore: number; // 1-10
  country: string;
}

export const CITIES: Record<string, CityInfo> = {
  // Europe
  FCO: { code: "FCO", name: "Rome", coordinates: [12.4964, 41.9028], tourismScore: 9, country: "IT" },
  CDG: { code: "CDG", name: "Paris", coordinates: [2.3522, 48.8566], tourismScore: 10, country: "FR" },
  IST: { code: "IST", name: "Istanbul", coordinates: [28.9784, 41.0082], tourismScore: 9, country: "TR" },
  LHR: { code: "LHR", name: "London", coordinates: [-0.1276, 51.5074], tourismScore: 10, country: "GB" },
  FRA: { code: "FRA", name: "Frankfurt", coordinates: [8.6821, 50.1109], tourismScore: 6, country: "DE" },
  AMS: { code: "AMS", name: "Amsterdam", coordinates: [4.9041, 52.3676], tourismScore: 9, country: "NL" },
  MAD: { code: "MAD", name: "Madrid", coordinates: [-3.7038, 40.4168], tourismScore: 8, country: "ES" },
  BCN: { code: "BCN", name: "Barcelona", coordinates: [2.1734, 41.3851], tourismScore: 9, country: "ES" },
  ATH: { code: "ATH", name: "Athens", coordinates: [23.7275, 37.9838], tourismScore: 8, country: "GR" },
  LIS: { code: "LIS", name: "Lisbon", coordinates: [-9.1393, 38.7223], tourismScore: 8, country: "PT" },
  VIE: { code: "VIE", name: "Vienna", coordinates: [16.3738, 48.2082], tourismScore: 8, country: "AT" },
  PRG: { code: "PRG", name: "Prague", coordinates: [14.4378, 50.0755], tourismScore: 8, country: "CZ" },
  CPH: { code: "CPH", name: "Copenhagen", coordinates: [12.5683, 55.6761], tourismScore: 7, country: "DK" },
  ZRH: { code: "ZRH", name: "Zurich", coordinates: [8.5417, 47.3769], tourismScore: 7, country: "CH" },
  MUC: { code: "MUC", name: "Munich", coordinates: [11.5820, 48.1351], tourismScore: 8, country: "DE" },
  DUB: { code: "DUB", name: "Dublin", coordinates: [-6.2603, 53.3498], tourismScore: 7, country: "IE" },
  OSL: { code: "OSL", name: "Oslo", coordinates: [10.7522, 59.9139], tourismScore: 6, country: "NO" },
  ARN: { code: "ARN", name: "Stockholm", coordinates: [18.0686, 59.3293], tourismScore: 7, country: "SE" },
  HEL: { code: "HEL", name: "Helsinki", coordinates: [24.9384, 60.1699], tourismScore: 6, country: "FI" },
  WAW: { code: "WAW", name: "Warsaw", coordinates: [21.0122, 52.2297], tourismScore: 6, country: "PL" },
  BUD: { code: "BUD", name: "Budapest", coordinates: [19.0402, 47.4979], tourismScore: 8, country: "HU" },
  KEF: { code: "KEF", name: "Reykjavik", coordinates: [-21.9426, 64.1466], tourismScore: 8, country: "IS" },
  MXP: { code: "MXP", name: "Milan", coordinates: [9.1900, 45.4642], tourismScore: 8, country: "IT" },
  VCE: { code: "VCE", name: "Venice", coordinates: [12.3155, 45.4408], tourismScore: 9, country: "IT" },
  NAP: { code: "NAP", name: "Naples", coordinates: [14.2681, 40.8518], tourismScore: 7, country: "IT" },

  // Middle East
  DXB: { code: "DXB", name: "Dubai", coordinates: [55.2708, 25.2048], tourismScore: 8, country: "AE" },
  DOH: { code: "DOH", name: "Doha", coordinates: [51.5310, 25.2854], tourismScore: 6, country: "QA" },
  TLV: { code: "TLV", name: "Tel Aviv", coordinates: [34.7818, 32.0853], tourismScore: 7, country: "IL" },
  AMM: { code: "AMM", name: "Amman", coordinates: [35.9106, 31.9454], tourismScore: 6, country: "JO" },

  // Asia
  NRT: { code: "NRT", name: "Tokyo", coordinates: [139.6917, 35.6895], tourismScore: 10, country: "JP" },
  ICN: { code: "ICN", name: "Seoul", coordinates: [126.9780, 37.5665], tourismScore: 8, country: "KR" },
  SIN: { code: "SIN", name: "Singapore", coordinates: [103.8198, 1.3521], tourismScore: 9, country: "SG" },
  BKK: { code: "BKK", name: "Bangkok", coordinates: [100.5018, 13.7563], tourismScore: 9, country: "TH" },
  HKG: { code: "HKG", name: "Hong Kong", coordinates: [114.1694, 22.3193], tourismScore: 8, country: "HK" },
  DEL: { code: "DEL", name: "Delhi", coordinates: [77.1025, 28.7041], tourismScore: 7, country: "IN" },
  BOM: { code: "BOM", name: "Mumbai", coordinates: [72.8777, 19.0760], tourismScore: 7, country: "IN" },
  PEK: { code: "PEK", name: "Beijing", coordinates: [116.4074, 39.9042], tourismScore: 8, country: "CN" },
  PVG: { code: "PVG", name: "Shanghai", coordinates: [121.4737, 31.2304], tourismScore: 7, country: "CN" },
  KUL: { code: "KUL", name: "Kuala Lumpur", coordinates: [101.6869, 3.1390], tourismScore: 7, country: "MY" },
  HAN: { code: "HAN", name: "Hanoi", coordinates: [105.8342, 21.0278], tourismScore: 7, country: "VN" },
  TPE: { code: "TPE", name: "Taipei", coordinates: [121.5654, 25.0330], tourismScore: 7, country: "TW" },

  // North America
  JFK: { code: "JFK", name: "New York", coordinates: [-74.0060, 40.7128], tourismScore: 10, country: "US" },
  LAX: { code: "LAX", name: "Los Angeles", coordinates: [-118.2437, 34.0522], tourismScore: 8, country: "US" },
  SFO: { code: "SFO", name: "San Francisco", coordinates: [-122.4194, 37.7749], tourismScore: 8, country: "US" },
  ORD: { code: "ORD", name: "Chicago", coordinates: [-87.6298, 41.8781], tourismScore: 7, country: "US" },
  MIA: { code: "MIA", name: "Miami", coordinates: [-80.1918, 25.7617], tourismScore: 8, country: "US" },
  BOS: { code: "BOS", name: "Boston", coordinates: [-71.0589, 42.3601], tourismScore: 7, country: "US" },
  DEN: { code: "DEN", name: "Denver", coordinates: [-104.9903, 39.7392], tourismScore: 6, country: "US" },
  ATL: { code: "ATL", name: "Atlanta", coordinates: [-84.3880, 33.7490], tourismScore: 5, country: "US" },
  DFW: { code: "DFW", name: "Dallas", coordinates: [-96.7970, 32.7767], tourismScore: 5, country: "US" },
  SEA: { code: "SEA", name: "Seattle", coordinates: [-122.3321, 47.6062], tourismScore: 7, country: "US" },
  IAD: { code: "IAD", name: "Washington DC", coordinates: [-77.0369, 38.9072], tourismScore: 8, country: "US" },
  YYZ: { code: "YYZ", name: "Toronto", coordinates: [-79.3832, 43.6532], tourismScore: 7, country: "CA" },
  YVR: { code: "YVR", name: "Vancouver", coordinates: [-123.1216, 49.2827], tourismScore: 7, country: "CA" },
  MEX: { code: "MEX", name: "Mexico City", coordinates: [-99.1332, 19.4326], tourismScore: 8, country: "MX" },
  CUN: { code: "CUN", name: "Cancun", coordinates: [-86.8515, 21.1619], tourismScore: 7, country: "MX" },

  // South America
  GRU: { code: "GRU", name: "Sao Paulo", coordinates: [-46.6333, -23.5505], tourismScore: 6, country: "BR" },
  GIG: { code: "GIG", name: "Rio de Janeiro", coordinates: [-43.1729, -22.9068], tourismScore: 8, country: "BR" },
  EZE: { code: "EZE", name: "Buenos Aires", coordinates: [-58.3816, -34.6037], tourismScore: 8, country: "AR" },
  BOG: { code: "BOG", name: "Bogota", coordinates: [-74.0721, 4.7110], tourismScore: 6, country: "CO" },
  LIM: { code: "LIM", name: "Lima", coordinates: [-77.0428, -12.0464], tourismScore: 7, country: "PE" },
  SCL: { code: "SCL", name: "Santiago", coordinates: [-70.6693, -33.4489], tourismScore: 7, country: "CL" },

  // Africa
  CPT: { code: "CPT", name: "Cape Town", coordinates: [18.4241, -33.9249], tourismScore: 8, country: "ZA" },
  NBO: { code: "NBO", name: "Nairobi", coordinates: [36.8219, -1.2921], tourismScore: 6, country: "KE" },
  CMN: { code: "CMN", name: "Casablanca", coordinates: [-7.5898, 33.5731], tourismScore: 7, country: "MA" },
  CAI: { code: "CAI", name: "Cairo", coordinates: [31.2357, 30.0444], tourismScore: 8, country: "EG" },
  ADD: { code: "ADD", name: "Addis Ababa", coordinates: [38.7578, 9.0192], tourismScore: 5, country: "ET" },

  // Oceania
  SYD: { code: "SYD", name: "Sydney", coordinates: [151.2093, -33.8688], tourismScore: 9, country: "AU" },
  MEL: { code: "MEL", name: "Melbourne", coordinates: [144.9631, -37.8136], tourismScore: 7, country: "AU" },
  AKL: { code: "AKL", name: "Auckland", coordinates: [174.7633, -36.8485], tourismScore: 7, country: "NZ" },
};

export function getCityByCode(code: string): CityInfo | undefined {
  return CITIES[code.toUpperCase()];
}

export function getCityByName(name: string): CityInfo | undefined {
  const normalized = name.toLowerCase().trim();
  return Object.values(CITIES).find(
    (c) => c.name.toLowerCase() === normalized
  );
}
