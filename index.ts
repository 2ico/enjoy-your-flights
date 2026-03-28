import { MCPServer, text, widget } from "mcp-use/server";
import { z } from "zod";
import { CITIES, getCityByCode, getCityByName } from "./src/utils/cities.js";

const server = new MCPServer({
  name: "enjoy-your-flights",
  title: "Enjoy Your Flights",
  version: "1.0.0",
  description:
    "Plan cheap flights with extended tourism layovers. Search for flights from A to B and discover interesting cities to visit along the way for 1-5 days.",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://github.com/2ico/enjoy-your-flights",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

// ── Tool: plan-layover-trip ──────────────────────────────────────────

server.tool(
  {
    name: "plan-layover-trip",
    description:
      "Search for flights from origin to destination and find the best layover cities where the traveler can stop for 1-5 days of tourism, saving money while having a great time. Returns up to 3 layover cities with multiple duration options displayed on an interactive globe map.",
    schema: z.object({
      origin: z
        .string()
        .describe("Origin city name or IATA airport code (e.g., 'Milan' or 'MXP')"),
      destination: z
        .string()
        .describe("Destination city name or IATA airport code (e.g., 'San Francisco' or 'SFO')"),
      departure_date: z
        .string()
        .describe("Departure date in YYYY-MM-DD format"),
      max_layover_nights: z
        .number()
        .min(1)
        .max(5)
        .default(3)
        .describe("Maximum nights to stay in a layover city (1-5)"),
    }),
    widget: {
      name: "layover-map",
      invoking: "Searching for flights and layover options...",
      invoked: "Layover options found!",
    },
  },
  async ({ origin, destination, departure_date, max_layover_nights }) => {
    const originCity = getCityByName(origin) || getCityByCode(origin);
    const destCity = getCityByName(destination) || getCityByCode(destination);

    if (!originCity) {
      return text(
        `Could not find airport for "${origin}". Try using an IATA code like MXP, JFK, etc.`
      );
    }
    if (!destCity) {
      return text(
        `Could not find airport for "${destination}". Try using an IATA code like SFO, LAX, etc.`
      );
    }

    const layoverOptions = generateLayoverOptions(
      originCity,
      destCity,
      departure_date,
      max_layover_nights
    );

    return widget({
      props: {
        origin: originCity,
        destination: destCity,
        departureDate: departure_date,
        maxLayoverNights: max_layover_nights,
        layoverCities: layoverOptions.cities,
        options: layoverOptions.options,
        mapboxToken: process.env.MAPBOX_TOKEN || "",
      },
      output: text(
        `Found ${layoverOptions.cities.length} layover cities between ${originCity.name} and ${destCity.name}:\n` +
          layoverOptions.cities
            .map(
              (c) =>
                `- ${c.name}: ${layoverOptions.options
                  .filter((o) => o.cityCode === c.code)
                  .map((o) => o.stayLabel)
                  .join(", ")}`
            )
            .join("\n")
      ),
    });
  }
);

// ── Tool: get-layover-details ────────────────────────────────────────

server.tool(
  {
    name: "get-layover-details",
    description:
      "Get detailed information about a specific layover option including flight times, accommodation estimates, and booking links.",
    schema: z.object({
      city_code: z.string().describe("IATA code of the layover city"),
      stay_duration: z.number().describe("Number of nights to stay"),
      origin: z.string().describe("Origin IATA code"),
      destination: z.string().describe("Destination IATA code"),
      departure_date: z.string().describe("Departure date YYYY-MM-DD"),
    }),
  },
  async ({ city_code, stay_duration, origin, destination, departure_date }) => {
    const city = getCityByCode(city_code);
    if (!city) return text(`Unknown city code: ${city_code}`);

    return text(
      `Layover details for ${stay_duration} nights in ${city.name}:\n` +
        `Leg 1: ${origin} → ${city_code} on ${departure_date}\n` +
        `Stay: ${stay_duration} nights in ${city.name}\n` +
        `Leg 2: ${city_code} → ${destination} on ${addDays(departure_date, stay_duration)}\n` +
        `Estimated accommodation: $${stay_duration * estimateNightlyRate(city_code)}/night`
    );
  }
);

// ── Helpers ──────────────────────────────────────────────────────────

interface CityInfo {
  code: string;
  name: string;
  coordinates: [number, number];
  tourismScore: number;
  country: string;
}

interface LayoverOptionData {
  id: string;
  cityCode: string;
  stayDuration: number;
  stayLabel: string;
  legA: {
    airline: string;
    flightNumber: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    bookingUrl: string;
  };
  legB: {
    airline: string;
    flightNumber: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    bookingUrl: string;
  };
  totalFlightPrice: number;
  estimatedAccommodation: number;
  totalEstimatedPrice: number;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function estimateNightlyRate(cityCode: string): number {
  const rates: Record<string, number> = {
    FCO: 120, CDG: 150, IST: 60, LHR: 160, FRA: 110, AMS: 130,
    MAD: 100, BCN: 110, ATH: 80, DXB: 140, DOH: 130, JFK: 180,
    ORD: 120, DEN: 100, LAX: 160, MIA: 140, BOS: 150, NRT: 100,
    ICN: 90, SIN: 130, BKK: 50, HKG: 120, LIS: 90, KEF: 140,
  };
  return rates[cityCode] || 100;
}

const AIRLINES = [
  "Lufthansa", "ITA Airways", "Turkish Airlines", "Emirates", "KLM",
  "Air France", "British Airways", "Delta", "United", "Swiss",
  "Austrian", "Iberia", "TAP Portugal", "Qatar Airways",
  "Singapore Airlines", "ANA", "Icelandair",
];

const AIRLINE_CODES = [
  "LH", "AZ", "TK", "EK", "KL", "AF", "BA", "DL", "UA", "LX",
  "OS", "IB", "TP", "QR", "SQ", "NH", "FI",
];

function pickAirline(seed: number): string {
  const idx = Math.abs(seed) % AIRLINES.length;
  return AIRLINES[idx];
}

function generateFlightNumber(seed: number): string {
  const idx = Math.abs(seed) % AIRLINE_CODES.length;
  return `${AIRLINE_CODES[idx]}${100 + (Math.abs(seed * 7) % 900)}`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

function findLayoverCities(origin: CityInfo, dest: CityInfo): CityInfo[] {
  const midLng = (origin.coordinates[0] + dest.coordinates[0]) / 2;
  const midLat = (origin.coordinates[1] + dest.coordinates[1]) / 2;
  const routeLength = Math.sqrt(
    (dest.coordinates[0] - origin.coordinates[0]) ** 2 +
      (dest.coordinates[1] - origin.coordinates[1]) ** 2
  );

  return Object.values(CITIES)
    .filter((c) => c.code !== origin.code && c.code !== dest.code)
    .map((c) => {
      const distFromMid = Math.sqrt(
        (c.coordinates[0] - midLng) ** 2 + (c.coordinates[1] - midLat) ** 2
      );
      const corridorScore = Math.max(0, 1 - distFromMid / (routeLength * 0.8));
      const score = corridorScore * 0.4 + (c.tourismScore / 10) * 0.6;
      return { city: c, score };
    })
    .filter((c) => c.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((c) => c.city);
}

function generateLayoverOptions(
  origin: CityInfo,
  dest: CityInfo,
  departureDate: string,
  maxNights: number
): { cities: CityInfo[]; options: LayoverOptionData[] } {
  const cities = findLayoverCities(origin, dest);
  const options: LayoverOptionData[] = [];

  for (const city of cities) {
    const seed = hashCode(`${origin.code}-${city.code}-${dest.code}`);
    const basePrice = 150 + (Math.abs(seed) % 300);

    const durations = [0, 1, 3, Math.min(5, maxNights)].filter(
      (d, i, arr) => d <= maxNights && arr.indexOf(d) === i
    );

    for (const nights of durations) {
      const priceVariation = 0.8 + ((Math.abs(seed + nights) % 40) / 100);
      const legAPrice = Math.round(basePrice * priceVariation);
      const legBPrice = Math.round(
        (basePrice * 0.8 + (Math.abs(seed * 3) % 200)) * priceVariation
      );
      const accommodation = nights > 0 ? nights * estimateNightlyRate(city.code) : 0;

      const depDate = new Date(departureDate);
      depDate.setHours(6 + (Math.abs(seed) % 14), (Math.abs(seed * 5) % 4) * 15);

      const arrDate = new Date(depDate.getTime() + (3 + (Math.abs(seed) % 8)) * 3600000);

      const legBDepart = new Date(departureDate);
      legBDepart.setDate(legBDepart.getDate() + Math.max(nights, 0));
      legBDepart.setHours(8 + (Math.abs(seed * 2) % 12), (Math.abs(seed * 3) % 4) * 15);

      const legBArrive = new Date(
        legBDepart.getTime() + (4 + (Math.abs(seed * 4) % 10)) * 3600000
      );

      const stayLabel =
        nights === 0
          ? `${2 + (Math.abs(seed) % 10)}h layover`
          : nights === 1
          ? "1 day"
          : `${nights} days`;

      options.push({
        id: `${city.code}-${nights}`,
        cityCode: city.code,
        stayDuration: nights,
        stayLabel,
        legA: {
          airline: pickAirline(seed),
          flightNumber: generateFlightNumber(seed),
          origin: origin.code,
          destination: city.code,
          departureTime: depDate.toISOString(),
          arrivalTime: arrDate.toISOString(),
          price: legAPrice,
          bookingUrl: `https://skiplagged.com/flights/${origin.code}/${city.code}/${departureDate}`,
        },
        legB: {
          airline: pickAirline(seed + nights + 1),
          flightNumber: generateFlightNumber(seed + nights + 1),
          origin: city.code,
          destination: dest.code,
          departureTime: legBDepart.toISOString(),
          arrivalTime: legBArrive.toISOString(),
          price: legBPrice,
          bookingUrl: `https://skiplagged.com/flights/${city.code}/${dest.code}/${addDays(departureDate, nights)}`,
        },
        totalFlightPrice: legAPrice + legBPrice,
        estimatedAccommodation: accommodation,
        totalEstimatedPrice: legAPrice + legBPrice + accommodation,
      });
    }
  }

  options.sort((a, b) => a.totalEstimatedPrice - b.totalEstimatedPrice);
  return { cities, options };
}

server.listen().then(() => {
  console.log("Enjoy Your Flights server running");
});
