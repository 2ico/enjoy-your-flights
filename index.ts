import { MCPServer, text, widget } from "mcp-use/server";
import { z } from "zod";
import { getCityByCode, getCityByName } from "./src/utils/cities.js";

const server = new MCPServer({
  name: "enjoy-your-flights",
  title: "Enjoy Your Flights",
  version: "1.0.0",
  description: `Help users find cheap flights from A to B with extended layovers (1-5 days) in interesting cities for tourism.

WORKFLOW:
1. When a user asks to fly from A to B, use sk_flights_search to find routes with layovers.
2. Identify the most interesting layover cities (consider tourism appeal, not just transit hubs).
3. For each promising layover city L, search separate flights A→L and L→B with date flexibility using sk_flex_departure_calendar.
4. Find combinations where A→L arrives 0-5 days before L→B departs, so the user can explore the city.
5. Use sk_hotels_search to estimate accommodation costs for the layover stay.
6. Call show-layover-map to display the results on an interactive globe map.

Provide multiple duration options per city (e.g., "1 day in Rome", "3 days in Rome", "5 days in Rome").
Always show the total cost: flights + estimated accommodation.`,
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

// ── Proxy all Skiplagged MCP tools ───────────────────────────────────
// This gives ChatGPT/Claude full access to Skiplagged's flight search,
// flex calendars, hotel search, etc. The LLM reasons about which tools
// to call and in what order.

async function connectSkiplagged(retries = 3, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      await server.proxy({
        skiplagged: {
          url: "https://mcp.skiplagged.com/mcp",
        },
      });
      console.log("Connected to Skiplagged MCP");
      return;
    } catch (err: any) {
      const isRateLimit = err?.message?.includes("429");
      console.warn(
        `Skiplagged connection attempt ${i + 1}/${retries} failed${isRateLimit ? " (rate limited)" : ""}. ${i < retries - 1 ? `Retrying in ${delay / 1000}s...` : "Giving up."}`
      );
      if (i < retries - 1) await new Promise((r) => setTimeout(r, delay));
    }
  }
  console.error(
    "Could not connect to Skiplagged MCP after retries. Server will start without proxied tools."
  );
}

await connectSkiplagged();

// ── Tool: show-layover-map ───────────────────────────────────────────
// Visualization tool — the LLM calls this after gathering flight data
// from Skiplagged tools to render results on an interactive globe map.

const flightSegmentSchema = z.object({
  airline: z.string().describe("Airline name"),
  flightNumber: z.string().describe("Flight number (e.g., LH123)"),
  origin: z.string().describe("Origin IATA code"),
  destination: z.string().describe("Destination IATA code"),
  departureTime: z.string().describe("Departure time ISO 8601"),
  arrivalTime: z.string().describe("Arrival time ISO 8601"),
  price: z.number().describe("Price in USD"),
  bookingUrl: z.string().describe("URL to book this flight on skiplagged.com"),
});

const layoverOptionSchema = z.object({
  id: z.string().describe("Unique ID for this option (e.g., 'FCO-3')"),
  cityCode: z.string().describe("IATA code of the layover city"),
  stayDuration: z.number().describe("Number of nights (0 = quick layover, 1-5 = tourism stop)"),
  stayLabel: z.string().describe("Human-readable label (e.g., '3 days', '5h layover')"),
  legA: flightSegmentSchema.describe("Flight from origin to layover city"),
  legB: flightSegmentSchema.describe("Flight from layover city to destination"),
  totalFlightPrice: z.number().describe("Combined price of both flights"),
  estimatedAccommodation: z.number().describe("Estimated hotel cost for the stay (0 if no overnight)"),
  totalEstimatedPrice: z.number().describe("Total: flights + accommodation"),
});

const citySchema = z.object({
  code: z.string().describe("IATA airport code"),
  name: z.string().describe("City name"),
  coordinates: z.array(z.number()).describe("[longitude, latitude] — exactly 2 numbers"),
  tourismScore: z.number().describe("Tourism appeal 1-10"),
  country: z.string().describe("ISO country code"),
});

server.tool(
  {
    name: "show-layover-map",
    description:
      "Display layover trip options on an interactive globe map with a sidebar showing flight details, prices, and booking links. Call this AFTER you have gathered flight data from the sk_ tools and assembled layover options.",
    schema: z.object({
      origin: citySchema.describe("Origin city"),
      destination: citySchema.describe("Destination city"),
      departureDate: z.string().describe("Departure date YYYY-MM-DD"),
      maxLayoverNights: z.number().describe("Max nights the user wants to stay"),
      layoverCities: z.array(citySchema).describe("Up to 3 layover cities to show on the map"),
      options: z.array(layoverOptionSchema).describe("All layover options across all cities"),
    }),
    widget: {
      name: "layover-map",
      invoking: "Building your trip map...",
      invoked: "Trip map ready!",
    },
  },
  async ({ origin, destination, departureDate, maxLayoverNights, layoverCities, options }) => {
    // Resolve coordinates for any cities the LLM might not have
    const resolvedCities = layoverCities.map((c) => {
      if (c.coordinates[0] !== 0 && c.coordinates[1] !== 0) return c;
      const known = getCityByCode(c.code) || getCityByName(c.name);
      return known
        ? { ...c, coordinates: known.coordinates, tourismScore: known.tourismScore, country: known.country }
        : c;
    });

    const resolvedOrigin = origin.coordinates[0] !== 0
      ? origin
      : { ...origin, ...(getCityByCode(origin.code) || getCityByName(origin.name) || {}) };

    const resolvedDest = destination.coordinates[0] !== 0
      ? destination
      : { ...destination, ...(getCityByCode(destination.code) || getCityByName(destination.name) || {}) };

    return widget({
      props: {
        origin: resolvedOrigin,
        destination: resolvedDest,
        departureDate,
        maxLayoverNights,
        layoverCities: resolvedCities,
        options,
        mapboxToken: process.env.MAPBOX_TOKEN || "",
      },
      output: text(
        `Showing ${resolvedCities.length} layover cities between ${resolvedOrigin.name} and ${resolvedDest.name} with ${options.length} options:\n` +
          resolvedCities
            .map(
              (c) =>
                `- ${c.name} (${c.code}): ${options
                  .filter((o) => o.cityCode === c.code)
                  .map((o) => o.stayLabel)
                  .join(", ")}`
            )
            .join("\n")
      ),
    });
  }
);

server.listen().then(() => {
  console.log("Enjoy Your Flights server running");
});
