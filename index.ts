import { MCPServer, text, widget } from "mcp-use/server";
import { z } from "zod";
import { getCityByCode, getCityByName } from "./src/utils/cities.js";
import { connectToSkiplagged } from "./src/skiplagged-client.js";
import { runFlightAgent } from "./src/flight-agent.js";

const server = new MCPServer({
  name: "enjoy-your-flights",
  title: "Enjoy Your Flights",
  version: "1.0.0",
  description: "Find cheap flights with extended tourism layovers in interesting cities. Just say where you want to go and the app handles the rest.",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.png",
  websiteUrl: "https://github.com/2ico/enjoy-your-flights",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

// ── Connect to Skiplagged MCP as a client ────────────────────────────
const skiplaggedClient = await connectToSkiplagged();

// ── Single tool: search-layover-flights ──────────────────────────────
// Internally runs a Claude agent that calls Skiplagged tools,
// then returns results as both a widget and structured JSON.

server.tool(
  {
    name: "search-layover-flights",
    description:
      "Search for cheap flights from origin to destination with extended tourism layovers (1-5 days) in interesting cities. Returns flight options with layover cities, prices, and booking links. Shows results on an interactive globe map. ALWAYS call this tool when the user asks about flights.",
    schema: z.object({
      origin: z.string().describe("Origin city name or IATA code (e.g., 'Milan' or 'MXP')"),
      destination: z.string().describe("Destination city name or IATA code (e.g., 'San Francisco' or 'SFO')"),
      departureDate: z.string().optional().describe("Preferred departure date YYYY-MM-DD. Defaults to tomorrow if not specified."),
      maxLayoverNights: z.number().optional().describe("Maximum nights for a tourism layover (1-5). Default: 3."),
      preferences: z.string().optional().describe("Any user preferences (e.g., 'prefer European cities', 'budget-friendly')"),
    }),
    widget: {
      name: "layover-map",
      invoking: "Searching for layover flight options...",
      invoked: "Trip options ready!",
    },
  },
  async ({ origin, destination, departureDate, maxLayoverNights, preferences }) => {
    console.log(`Searching flights: ${origin} → ${destination}`);

    try {
      const result = await runFlightAgent(
        { origin, destination, departureDate, maxLayoverNights, preferences },
        skiplaggedClient
      );

      // Resolve coordinates from our city database for any missing ones
      const resolveCity = (c: typeof result.origin) => {
        if (c.coordinates[0] !== 0 && c.coordinates[1] !== 0) return c;
        const known = getCityByCode(c.code) || getCityByName(c.name);
        return known
          ? { ...c, coordinates: known.coordinates, tourismScore: known.tourismScore, country: known.country }
          : c;
      };

      const resolvedOrigin = resolveCity(result.origin);
      const resolvedDest = resolveCity(result.destination);
      const resolvedCities = result.layoverCities.map(resolveCity);

      const jsonOutput = {
        origin: resolvedOrigin,
        destination: resolvedDest,
        departureDate: result.departureDate,
        maxLayoverNights: result.maxLayoverNights,
        layoverCities: resolvedCities,
        options: result.options,
      };

      return widget({
        props: {
          ...jsonOutput,
          mapboxToken: process.env.MAPBOX_TOKEN || "",
        },
        output: text(JSON.stringify(jsonOutput, null, 2)),
      });
    } catch (err: any) {
      console.error("Flight agent error:", err);
      return text(`Error searching flights: ${err.message}`);
    }
  }
);

server.listen().then(() => {
  console.log("Enjoy Your Flights server running");
});
