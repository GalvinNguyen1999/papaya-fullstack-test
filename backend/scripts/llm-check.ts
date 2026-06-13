// Smoke test for the real LLM provider chain (OpenAI → Jina → none).
// Run:  npm run llm:check        (uses backend/.env)
//       npm run llm:check -- "your custom prompt"
//
// Lets you confirm a real Jina (or OpenAI) key works end-to-end, in isolation
// from the database and the rest of the app.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { LlmService } from "../src/llm/llm.service";

// Minimal .env loader (avoids an extra dependency).
function loadEnv(): void {
  const envPath = resolve(__dirname, "../.env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

async function main(): Promise<void> {
  loadEnv();

  const prompt = process.argv.slice(2).join(" ") || "Reply with one short sentence confirming you can be reached.";
  const llm = new LlmService();

  console.log("→ Sending a test prompt to the configured LLM provider…\n");
  const result = await llm.chat(prompt);

  if (result.provider === "none") {
    console.log("No LLM provider configured.");
    console.log("Set JINA_API_KEY (free at https://jina.ai) or OPENAI_API_KEY in backend/.env.");
    console.log("The app still works without a key — it uses the deterministic template narrator.");
    return;
  }

  console.log(`Provider: ${result.provider}`);
  console.log(`Response: ${result.text}`);
}

main().catch((err) => {
  console.error("LLM check failed:", err.message);
  process.exit(1);
});
