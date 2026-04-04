import { join } from "node:path";
import { execa } from "execa";

type ContainerState = "running" | "stopped" | "error";

type DockerComposePsRow = {
  Service?: string;
  Name?: string;
  State?: string;
  Status?: string;
};

function parseComposePsJson(stdout: string): DockerComposePsRow[] {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return [];
  }

  const lines = trimmed.split("\n").filter((line) => line.length > 0);
  const rows: DockerComposePsRow[] = [];

  for (const line of lines) {
    try {
      rows.push(JSON.parse(line) as DockerComposePsRow);
    } catch {
      return [];
    }
  }

  return rows;
}

function mapDockerState(state: string | undefined): ContainerState {
  if (!state) {
    return "error";
  }
  const normalized = state.toLowerCase();
  if (normalized.includes("running") || normalized === "up") {
    return "running";
  }
  if (normalized.includes("exited") || normalized.includes("dead")) {
    return "stopped";
  }
  return "error";
}

export function getTenantComposePath(slug: string): string {
  return join("/opt/opsly/tenants", slug, "docker-compose.yml");
}

export async function startTenant(
  slug: string,
  composePath: string,
): Promise<void> {
  void slug;
  await execa("docker", ["compose", "-f", composePath, "up", "-d"], {
    stdio: "pipe",
  });
}

export async function stopTenant(
  slug: string,
  composePath: string,
): Promise<void> {
  void slug;
  await execa("docker", ["compose", "-f", composePath, "down"], {
    stdio: "pipe",
  });
}

export async function getTenantStatus(
  slug: string,
): Promise<Record<string, ContainerState>> {
  const composePath = getTenantComposePath(slug);

  let stdout: string;
  try {
    const result = await execa(
      "docker",
      ["compose", "-f", composePath, "ps", "--format", "json"],
      { stdio: "pipe" },
    );
    stdout = result.stdout;
  } catch {
    return {};
  }

  const rows = parseComposePsJson(stdout);
  const statuses: Record<string, ContainerState> = {};

  for (const row of rows) {
    const key = row.Service ?? row.Name;
    if (!key) {
      continue;
    }
    statuses[key] = mapDockerState(row.State ?? row.Status);
  }

  return statuses;
}
