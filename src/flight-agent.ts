import Anthropic from "@anthropic-ai/sdk";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { getSkiplaggedTools, callSkiplaggedTool } from "./skiplagged-client.js";

const MAX_ITERATIONS = 12;

const SYSTEM_PROMPT = `You are a flight research agent. Your job is to find cheap flights from an origin to a destination with extended layovers (1-5 days) in interesting cities for tourism.

IMPORTANT: You have a STRICT LIMIT of 10 tool calls total. Be efficient.

WORKFLOW:
1. Search flights from A to B using sk_flights_search (1 call). From the results, pick up to 3 interesting layover cities based on tourism appeal.
2. For the top 1-2 layover cities, search A→L and L→B using sk_flex_departure_calendar (2-4 calls). Look for combinations where A→L arrives 1-5 days before L→B departs.
3. Optionally use sk_hotels_search for 1-2 cities to estimate accommodation (1-2 calls).
4. Assemble the results and output JSON.

RULES:
- You MUST use 10 or fewer tool calls total. Do NOT make extra searches.
- Search for one-way flights unless told otherwise.
- If no departure date is given, assume tomorrow.
- Always show total cost: flights + estimated accommodation (estimate $80/night if you can't search hotels).
- Pick up to 3 layover cities. For each, provide 2-3 stay duration options by combining the flights you found.
- Reuse flight data creatively: the same A→L flight can pair with different L→B flights for different stay durations.

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
