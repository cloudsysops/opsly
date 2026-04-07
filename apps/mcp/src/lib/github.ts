const GITHUB_API = "https://api.github.com";
const REPO = "cloudsysops/opsly";
const ACTIVE_PROMPT_PATH = "docs/ACTIVE-PROMPT.md";

interface GithubContentResponse {
  sha: string;
}

export async function writeActivePrompt(content: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN_N8N || "";
  if (!token) {
    throw new Error("GITHUB_TOKEN_N8N is required");
  }

  const getUrl = `${GITHUB_API}/repos/${REPO}/contents/${ACTIVE_PROMPT_PATH}`;
  const getResponse = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!getResponse.ok) {
    throw new Error(`GitHub GET failed: ${getResponse.status}`);
  }

  const current = (await getResponse.json()) as GithubContentResponse;
  const updateResponse = await fetch(getUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `chore(prompt): task from OpenClaw ${new Date().toISOString()}`,
      content: Buffer.from(content).toString("base64"),
      sha: current.sha
    })
  });

  if (!updateResponse.ok) {
    throw new Error(`GitHub PUT failed: ${updateResponse.status}`);
  }
}
