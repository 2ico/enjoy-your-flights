import Anthropic from "@anthropic-ai/sdk";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { getSkiplaggedTools, callSkiplaggedTool } from "./skiplagged-client.js";

const MAX_ITERATIONS = 30;

const SYSTEM_PROMPT = `You are a flight research agent. Your job is to find cheap flights from an origin to a destination with extended layovers (1-5 days) in interesting cities for tourism.

WORKFLOW:
1. First search flights from A to B using sk_flights_search to find routes with layovers. Identify the most interesting layover cities (consider tourism appeal, not just transit hubs). Pick up to 3 interesting layover cities.
2. For each promising layover city L, search separate one-way flights A→L and L→B with date flexibility using sk_flex_departure_calendar (check at least 7 days around the departure date).
3. Find combinations where A→L arrives 0-5 days before L→B departs, so the user can explore the city.
4. Use sk_hotels_search to estimate accommodation costs for the layover stay.
5. Provide multiple duration options per city (e.g., "1 day in Rome", "3 days in Rome", "5 days in Rome").

RULES:
- Search for one-way flights unless told otherwise.
- If no departure date is given, assume tomorrow.
- Always show total cost: flights + estimated accommodation.
- Pick up to 3 of the most touristically interesting layover cities.
- For each city, try to provide 2-3 different stay duration options.

When you have gathered all the data, output your final answer as a single JSON object (and nothing else) with this exact structure:

{
  "origin": { "code": "IATA", "name": "City Name", "coordinates": [lng, lat], "tourismScore": N, "country": "XX" },
  "destination": { "code": "IATA", "name": "City Name", "coordinates": [lng, lat], "tourismScore": N, "country": "XX" },
  "departureDate": "YYYY-MM-DD",
  "maxLayoverNights": N,
  "layoverCities": [
    { "code": "IATA", "name": "City Name", "coordinates": [lng, lat], "tourismScore": N, "country": "XX" }
  ],
  "options": [
    {
      "id": "unique-id",
      "cityCode": "IATA",
      "stayDuration": N,
      "stayLabel": "N days",
      "legA": {
        "airline": "Airline",
        "flightNumber": "XX123",
        "origin": "IATA",
        "destination": "IATA",
        "departureTime": "ISO8601",
        "arrivalTime": "ISO8601",
        "price": N,
        "bookingUrl": "https://skiplagged.com/..."
      },
      "legB": {
        "airline": "Airline",
        "flightNumber": "XX456",
        "origin": "IATA",
        "destination": "IATA",
        "departureTime": "ISO8601",
        "arrivalTime": "ISO8601",
        "price": N,
        "bookingUrl": "https://skiplagged.com/..."
      },
      "totalFlightPrice": N,
      "estimatedAccommodation": N,
      "totalEstimatedPrice": N
    }
  ]
}

Output ONLY the JSON object at the end. No markdown, no code fences, just raw JSON.`;

export interface AgentResult {
  origin: { code: string; name: string; coordinates: number[]; tourismScore: number; country: string };
  destination: { code: string; name: string; coordinates: number[]; tourismScore: number; country: string };
  departureDate: string;
  maxLayoverNights: number;
  layoverCities: Array<{ code: string; name: string; coordinates: number[]; tourismScore: number; country: string }>;
  options: Array<{
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
  }>;
}

export async function runFlightAgent(
  params: {
    origin: string;
    destination: string;
    departureDate?: string;
    maxLayoverNights?: number;
    preferences?: string;
  },
  skiplaggedClient: Client
): Promise<AgentResult> {
  console.log("[agent] Starting flight agent with params:", JSON.stringify(params));
  const anthropic = new Anthropic();

  // Convert MCP tools to Anthropic tool format
  console.log("[agent] Fetching Skiplagged tools...");
  const mcpTools = await getSkiplaggedTools(skiplaggedClient);
  console.log(`[agent] Got ${mcpTools.length} tools: ${mcpTools.map(t => t.name).join(", ")}`);
  const tools: Anthropic.Messages.Tool[] = mcpTools.map((t) => ({
    name: t.name,
    description: t.description ?? "",
    input_schema: t.inputSchema as Anthropic.Messages.Tool.InputSchema,
  }));

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const departureDate = params.departureDate || tomorrow;
  const maxNights = params.maxLayoverNights ?? 3;

  const userMessage = [
    `Find layover tourism options for flying from ${params.origin} to ${params.destination}.`,
    `Departure date: ${departureDate}.`,
    `Maximum layover stay: ${maxNights} nights.`,
    params.preferences ? `Preferences: ${params.preferences}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  console.log("[agent] User message:", userMessage);

  let messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: userMessage }];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(`[agent] Iteration ${i + 1}/${MAX_ITERATIONS} — calling Claude...`);
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    console.log(`[agent] Response: stop_reason=${response.stop_reason}, content_blocks=${response.content.length}, usage=${JSON.stringify(response.usage)}`);

    // Log any text blocks
    for (const block of response.content) {
      if (block.type === "text") {
        console.log(`[agent] Text: ${block.text.slice(0, 200)}${block.text.length > 200 ? "..." : ""}`);
      } else if (block.type === "tool_use") {
        console.log(`[agent] Tool call: ${block.name}(${JSON.stringify(block.input).slice(0, 150)})`);
      }
    }

    // Check if done
    if (response.stop_reason === "end_turn") {
      const textBlocks = response.content.filter(
        (b): b is Anthropic.Messages.TextBlock => b.type === "text"
      );
      const fullText = textBlocks.map((b) => b.text).join("\n");
      console.log(`[agent] Done! Final text length: ${fullText.length}`);
      return parseResult(fullText);
    }

    // Handle tool calls
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) {
      console.log("[agent] No tool calls and not end_turn — extracting text anyway");
      const textBlocks = response.content.filter(
        (b): b is Anthropic.Messages.TextBlock => b.type === "text"
      );
      const fullText = textBlocks.map((b) => b.text).join("\n");
      console.log(`[agent] Fallback text length: ${fullText.length}`);
      return parseResult(fullText);
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const toolBlock of toolUseBlocks) {
      console.log(`[agent] Calling Skiplagged: ${toolBlock.name}(${JSON.stringify(toolBlock.input).slice(0, 200)})`);
      try {
        const result = await callSkiplaggedTool(
          skiplaggedClient,
          toolBlock.name,
          toolBlock.input as Record<string, unknown>
        );
        console.log(`[agent] Tool result (${toolBlock.name}): ${result.slice(0, 300)}${result.length > 300 ? "..." : ""}`);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolBlock.id,
          content: result,
        });
      } catch (err: any) {
        console.error(`[agent] Tool error (${toolBlock.name}):`, err.message);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolBlock.id,
          content: `Error: ${err.message}`,
          is_error: true,
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  console.error("[agent] Exceeded maximum iterations!");
  throw new Error("Agent exceeded maximum iterations without producing a result.");
}

function parseResult(text: string): AgentResult {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Agent did not produce valid JSON output.");
  }
  return JSON.parse(jsonMatch[0]) as AgentResult;
}
