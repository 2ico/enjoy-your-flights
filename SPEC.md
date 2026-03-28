# Enjoy Your Flights -- Spec & Implementation Plan

## Context

Hackathon project (Turin, 2026-03-28). **"Enjoy Your Flights"** is a web app that helps users find cheap flights from A to B where they can **extend layovers** at interesting cities for 1-5 days of tourism. Instead of rushing through connections, the app searches for split-ticket options that let users explore layover cities while often saving money.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | TypeScript |
| Frontend | React 19 + Vite |
| Map | Mapbox GL JS v3 (globe projection) |
| MCP Client | `mcp-use` npm package (`useMcp` React hook) |
| Data Source | Skiplagged MCP (`https://mcp.skiplagged.com/mcp`) |
| Validation | Zod 4 |

---

## Architecture Overview

**MCP App scaffolded with `create-mcp-use-app`.** The app is built as an MCP application with built-in hooks for both **ChatGPT** and **Claude**, allowing it to be used as a conversational flight planning assistant within either platform. The `mcp-use` framework provides the MCP server infrastructure, React hooks for tool integration, and widget support.

The app connects to the **Skiplagged MCP** as a data source for flight/hotel searches, and exposes its own tools and UI widgets to ChatGPT/Claude clients.

```
ChatGPT / Claude (MCP Clients)
  |
  +-- Enjoy Your Flights MCP App (mcp-use server + React UI)
        |
        +-- Tools: plan_layover_trip, search_flights, etc.
        +-- Widgets: Mapbox globe map + sidebar UI
        |
        +-- Skiplagged MCP (upstream data source)
              +-- sk_flights_search
              +-- sk_flex_departure_calendar
              +-- sk_hotels_search
```

---

## Core Algorithm (Search Orchestrator)

### Phase 1: Discover Layovers
1. Call `sk_flights_search(A, B, date)` to get connecting flights
2. Extract layover cities from itineraries
3. Rank by: frequency as layover, tourism appeal (hardcoded scores), price
4. Select top 3 cities (L_1, L_2, L_3)

### Phase 2: Search Segments with Date Flexibility
For each L_i, fire parallel searches:
- `sk_flex_departure_calendar(A, L_i, date)` -- prices across date window
- `sk_flex_departure_calendar(L_i, B, date)` -- prices across date window
- `sk_flights_search(A, L_i, cheapest_date)` and `sk_flights_search(L_i, B, cheapest_date)` for flight details

Date window: A->L_i searches `[date-3, date+7]`, L_i->B searches `[date, date+12]`.

### Phase 3: Combine & Filter
For each L_i, find valid (legA, legB) pairs where legA arrives 0-5 days before legB departs. Group by stay duration ("12h", "1 day", "2 days", ..., "5 days"). Pick cheapest per duration bucket.

### Phase 4: Accommodation Estimates
For options with stay >= 1 night, call `sk_hotels_search(L_i, checkin, checkout)` for median hotel price. Lazy-loaded when user selects a city.

---

## Data Models

```typescript
// src/types/flights.ts
interface FlightSegment {
  airline: string;
  flightNumber: string;
  origin: string;           // IATA code
  destination: string;
  departureTime: string;    // ISO 8601
  arrivalTime: string;
  duration: number;         // minutes
  price: number;            // USD
  bookingUrl?: string;
}

interface LayoverCity {
  code: string;             // IATA code
  name: string;
  coordinates: [number, number]; // [lng, lat]
  tourismScore: number;     // 1-10
}

interface LayoverOption {
  id: string;
  city: LayoverCity;
  stayDuration: number;     // nights
  stayLabel: string;        // "12h", "1 day", "3 days"
  legA: FlightSegment;      // A -> L_i
  legB: FlightSegment;      // L_i -> B
  totalFlightPrice: number;
  estimatedAccommodation: number;
  totalEstimatedPrice: number;
}

interface SearchResult {
  origin: string;
  destination: string;
  layoverCities: LayoverCity[];
  options: Map<string, LayoverOption[]>; // city code -> options
}
```

---

## Project Structure

```
enjoy-your-flights/
  .env                          # VITE_MAPBOX_TOKEN
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  src/
    main.tsx                    # React entry
    App.tsx                     # Root: map + sidebar layout
    types/
      flights.ts                # FlightSegment, LayoverCity, LayoverOption, SearchResult
      search.ts                 # SearchParams, SearchPhase
    hooks/
      useSkiplagged.ts          # Typed wrapper around useMcp for Skiplagged tools
      useLayoverSearch.ts       # Orchestrates full search, manages SearchPhase state
    services/
      searchOrchestrator.ts     # Core algorithm (Phases 1-4)
    components/
      Map.tsx                   # Mapbox globe, markers, arc lines
      LayoverMarker.tsx         # Custom marker with duration labels ("12h, 1d, 3d")
      Sidebar.tsx               # Left modal panel (45% width, outer gaps)
      SearchForm.tsx            # Origin/destination/date inputs
      CityCard.tsx              # Layover city summary header
      LayoverOption.tsx         # Single option card (flights, price, booking links)
      LoadingState.tsx          # Progress indicator per search phase
    utils/
      dates.ts                  # Date arithmetic, formatting
      cities.ts                 # Hardcoded ~100 airports: name, coords, tourismScore
      pricing.ts                # Price aggregation helpers
    styles/
      global.css
```

---

## UI Design

### Map (fullscreen)
- Mapbox GL JS, `projection: 'globe'`, dark style (`mapbox://styles/mapbox/dark-v11`)
- Up to 3 layover city markers with custom HTML elements showing duration labels (e.g., "12h, 1d, 3d")
- Great-circle arc lines: A -> each L_i -> B (GeoJSON line layers)
- Click marker -> select city -> sidebar shows options
- Fly-to animation on city select

### Sidebar (left, modal-style)
- `position: fixed; left: 16px; top: 16px; bottom: 16px; width: 45%; max-width: 500px; border-radius: 12px;`
- App title "Enjoy Your Flights" at the top of the sidebar
- **Default state** (no city selected): shows the list of all layover cities, each in a card:
  - City name + country flag
  - Price range (cheapest to most expensive option through that city)
  - Available stay durations as tags (e.g., "12h", "1 day", "3 days", "5 days")
  - Tourism score indicator (stars)
  - Number of options available
  - Click a card -> selects that city (same as clicking the map marker)
- **City selected**: Back button + city header + layover options grouped by duration
- Each option shows:
  - Title: "3 days in Rome"
  - Flights: "1. Monday 23 May ITA Airways XY123 HH:MM -> HH:MM" etc.
  - Stay: "3 nights in Rome"
  - Price: flights + accommodation estimate
  - Booking link buttons
- Options separated by divider lines

---

## Implementation Steps

### Step 1: Project Scaffold
- Run `npx create-mcp-use-app@latest` to scaffold the project (provides MCP hooks for ChatGPT and Claude out of the box)
- Install additional deps: `mapbox-gl`
- Configure env vars: add `VITE_MAPBOX_TOKEN` to `.env`
- The mcp-use app template includes React, Vite, TypeScript, Zod, and MCP client hooks for both ChatGPT and Claude

### Step 2: Map + Sidebar Shell
- `Map.tsx`: Initialize Mapbox globe with dark style
- `Sidebar.tsx`: Fixed-position panel with styling
- `App.tsx`: Compose both, verify globe renders

### Step 3: Search Form
- `SearchForm.tsx`: Origin, destination, date inputs
- Wire to parent state, style in sidebar

### Step 4: MCP Connection + Flight Search
- `useSkiplagged.ts`: Connect to Skiplagged MCP via `useMcp`
- Test `sk_flights_search` call, log raw responses
- Build response parsing utilities (adapt after seeing real data)

### Step 5: Search Orchestrator (Core Algorithm)
- `searchOrchestrator.ts`: Implement Phases 1-4
- `useLayoverSearch.ts`: Hook tying orchestrator to React state
- Parse layover cities from A->B results
- Parallel segment searches for top 3 cities
- Date combination logic, duration bucketing

### Step 6: Map Markers + Arc Lines
- `LayoverMarker.tsx`: Custom HTML markers with duration labels
- Arc lines (A -> L_i -> B) via GeoJSON
- Click handler -> `onCitySelect`

### Step 7: Sidebar Results Display
- `CityCard.tsx`, `LayoverOption.tsx` components
- Wire selected city state from map to sidebar
- Group options by duration with section headers

### Step 8: Hotel Estimates
- Lazy `sk_hotels_search` on city select
- Show accommodation cost in options
- Update total price

### Step 9: Polish
- Loading states per search phase
- Error handling
- Fly-to animations
- Responsive tweaks

---

## Key Files

| File | Purpose |
|------|---------|
| `src/services/searchOrchestrator.ts` | Core search algorithm -- most complex logic |
| `src/hooks/useSkiplagged.ts` | MCP connection + typed tool wrappers |
| `src/components/Map.tsx` | Mapbox globe with markers and arcs |
| `src/types/flights.ts` | Shared data model interfaces |
| `src/App.tsx` | Root component wiring everything together |
| `src/utils/cities.ts` | Hardcoded airport database (~100 cities) |

---

## Verification

1. **Dev server**: `npm run dev` -- globe map renders with Mapbox token
2. **MCP connection**: Browser console shows successful `useMcp` connection to Skiplagged
3. **Search flow**: Enter "MXP" -> "SFO", date -> results appear on map with 3 layover markers
4. **Click marker**: Sidebar populates with duration-grouped options (flights, prices, booking links)
5. **Hotel estimates**: Selecting a city with multi-day options shows accommodation price estimates

---

## Risks & Mitigations

- **Unknown MCP response format**: Log raw responses in Step 4, keep parsing isolated for quick adaptation
- **CORS issues**: `useMcp` auto-proxy fallback + Vite `server.proxy` as backup
- **Rate limiting**: Use flex calendar tools (batch date queries) instead of individual flight searches per date
- **LLM integration**: ChatGPT and Claude act as the conversational interface via MCP hooks; the search orchestrator is deterministic (no separate LLM calls for flight logic)
