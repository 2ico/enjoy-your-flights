import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const SKIPLAGGED_URL = "https://mcp.skiplagged.com/mcp";

let client: Client | null = null;

export async function connectToSkiplagged(retries = 3, delay = 5000): Promise<Client> {
  if (client) return client;

  for (let i = 0; i < retries; i++) {
    try {
      const c = new Client({ name: "enjoy-your-flights-agent", version: "1.0.0" });
      const transport = new StreamableHTTPClientTransport(new URL(SKIPLAGGED_URL));
      await c.connect(transport);
      console.log("Connected to Skiplagged MCP");
      client = c;
      return c;
    } catch (err: any) {
      const isRateLimit = err?.message?.includes("429");
      console.warn(
        `Skiplagged connection attempt ${i + 1}/${retries} failed${isRateLimit ? " (rate limited)" : ""}. ${i < retries - 1 ? `Retrying in ${delay / 1000}s...` : "Giving up."}`
      );
      if (i < retries - 1) await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Could not connect to Skiplagged MCP after retries.");
}

export async function getSkiplaggedTools(c: Client) {
  const { tools } = await c.listTools();
  return tools;
}

export async function callSkiplaggedTool(
  c: Client,
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  console.log(`[skiplagged] Calling ${name} with args:`, JSON.stringify(args).slice(0, 300));
  const result = await c.callTool({ name, arguments: args });
  const texts = (result.content as Array<{ type: string; text?: string }>)
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text!);
  const output = texts.join("\n");
  console.log(`[skiplagged] ${name} returned ${output.length} chars${result.isError ? " (ERROR)" : ""}`);
  return output;
}
