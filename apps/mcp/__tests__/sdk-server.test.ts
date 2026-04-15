import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/api-client.js", () => ({
  opslyFetch: vi.fn(async (path: string) => {
    if (path === "/api/tenants") {
      return [{ slug: "alpha", status: "active" }];
    }
    if (path === "/api/health") {
      return { ok: true, service: "api" };
    }
    return { ok: true, path };
  }),
}));

import { createMcpSdkServer } from "../src/mcp-sdk-bridge.js";
import { createServer, getAllToolDefinitions } from "../src/server.js";

describe("MCP SDK bridge", () => {
  beforeEach(() => {
    process.env.MCP_JWT_SECRET = "unit-test-mcp-jwt-secret-32chars!";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function connectClientAndServer() {
    const server = createMcpSdkServer(createServer(), getAllToolDefinitions());
    const client = new Client(
      { name: "opsly-mcp-test-client", version: "1.0.0" },
      { capabilities: {} },
    );
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    return { client, server };
  }

  it("expone tools, resources y prompts por MCP", async () => {
    const { client, server } = await connectClientAndServer();

    const tools = await client.listTools();
    const resources = await client.listResources();
    const prompts = await client.listPrompts();

    expect(tools.tools.some((tool) => tool.name === "get_tenants")).toBe(true);
    expect(resources.resources.some((resource) => resource.uri === "opsly://context/agents")).toBe(true);
    expect(prompts.prompts.some((prompt) => prompt.name === "opsly_startup")).toBe(true);

    await Promise.all([client.close(), server.close()]);
  });

  it("permite leer contexto estático y ADRs vía resources", async () => {
    const { client, server } = await connectClientAndServer();

    const systemState = await client.readResource({ uri: "opsly://context/system-state" });
    const templates = await client.listResourceTemplates();
    const adr = await client.readResource({ uri: "opsly://adr/ADR-009-openclaw-mcp-architecture.md" });

    expect(systemState.contents[0]).toMatchObject({
      uri: "opsly://context/system-state",
      mimeType: "application/json",
    });
    expect(systemState.contents[0] && "text" in systemState.contents[0] && systemState.contents[0].text).toContain(
      "\"knowledge_system\"",
    );
    expect(templates.resourceTemplates.some((template) => template.uriTemplate === "opsly://adr/{slug}")).toBe(
      true,
    );
    expect(adr.contents[0] && "text" in adr.contents[0] && adr.contents[0].text).toContain("ADR-009");

    await Promise.all([client.close(), server.close()]);
  });

  it("ejecuta tools a través del bridge MCP", async () => {
    const { client, server } = await connectClientAndServer();

    const result = await client.callTool({ name: "get_tenants", arguments: {} });
    const content = Array.isArray(result.content) ? result.content : [];
    const first = content[0];
    const firstText =
      first !== undefined &&
      typeof first === "object" &&
      "text" in first &&
      typeof (first as { text?: unknown }).text === "string"
        ? (first as { text: string }).text
        : "";

    expect(result.isError).not.toBe(true);
    expect(first).toMatchObject({ type: "text" });
    expect(firstText).toContain("\"alpha\"");

    await Promise.all([client.close(), server.close()]);
  });
});
