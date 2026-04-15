import { describe, expect, it } from "vitest";
import { createServer, getAllToolDefinitions } from "../src/server.js";

describe("createServer", () => {
  it("getAllToolDefinitions coincide con listTools", () => {
    const server = createServer();
    const defs = getAllToolDefinitions();
    expect(defs.map((d) => d.name).sort()).toEqual([...server.listTools()].sort());
  });

  it("registra herramientas esperadas", () => {
    const server = createServer();
    const tools = server.listTools();

    expect(tools).toContain("get_tenants");
    expect(tools).toContain("get_tenant");
    expect(tools).toContain("onboard_tenant");
    expect(tools).toContain("send_invitation");
    expect(tools).toContain("get_health");
    expect(tools).toContain("get_metrics");
    expect(tools).toContain("suspend_tenant");
    expect(tools).toContain("resume_tenant");
    expect(tools).toContain("execute_prompt");
    expect(tools).toContain("notebooklm");
    expect(tools).toContain("check_service_health");
    expect(tools).toContain("restart_container");
    expect(tools).toContain("list_ai_integrations");
    expect(tools).toContain("probe_platform_component");
    expect(tools).toContain("get_docker_containers");
  });

  it("lanza error si la tool no existe", async () => {
    const server = createServer();
    await expect(server.callTool("unknown_tool", {})).rejects.toThrow(
      "Tool not found: unknown_tool",
    );
  });

  it("valida inputSchema y rechaza payload invalido", async () => {
    const server = createServer();
    await expect(server.callTool("get_tenant", {})).rejects.toThrow(
      "Invalid input for get_tenant",
    );
  });
});
