import { execa } from "execa";

/**
 * Cuenta contenedores en ejecución vía CLI `docker` (socket montado en el contenedor API).
 * Devuelve null si docker no está disponible o falla el comando.
 */
export async function countRunningDockerContainers(): Promise<number | null> {
  try {
    const result = await execa("docker", ["ps", "-q"], {
      reject: false,
    });
    if (result.exitCode !== 0 || typeof result.stdout !== "string") {
      return null;
    }
    const lines = result.stdout
      .trim()
      .split("\n")
      .filter((line) => line.length > 0);
    return lines.length;
  } catch {
    return null;
  }
}
