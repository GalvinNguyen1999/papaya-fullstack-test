// INFRASTRUCTURE — LLM narrator. Provider chain: OpenAI → Jina (free) → template.
// The LLM only writes a human summary; it never changes the verdict (computed
// deterministically in the domain layer), so the app runs fully without any key.

import { Injectable, Logger } from "@nestjs/common";
import type { AssessmentReport, ToolCallLog } from "../domain/types";

interface Provider {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ChatResult {
  text: string;
  provider: string; // "openai:...", "jina:...", or "none"
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  /** Build the ordered provider chain from env. OpenAI first, then Jina (free). */
  private providers(): Provider[] {
    const list: Provider[] = [];

    if (process.env.OPENAI_API_KEY) {
      list.push({
        name: "openai",
        baseUrl: "https://api.openai.com/v1",
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      });
    }

    if (process.env.JINA_API_KEY) {
      list.push({
        name: "jina",
        baseUrl: process.env.JINA_BASE_URL || "https://deepsearch.jina.ai/v1",
        apiKey: process.env.JINA_API_KEY,
        model: process.env.JINA_MODEL || "jina-deepsearch-v1",
      });
    }

    return list;
  }

  /** Try each provider in order; returns the first success, or provider "none". */
  async chat(prompt: string): Promise<ChatResult> {
    for (const provider of this.providers()) {
      try {
        const text = await this.callProvider(provider, prompt);
        return { text, provider: `${provider.name}:${provider.model}` };
      } catch (err) {
        this.logger.warn(`LLM provider ${provider.name} failed: ${(err as Error).message}`);
      }
    }

    return { text: "", provider: "none" };
  }

  /** Narrate an assessment for a human reviewer (falls back to a template). */
  async narrate(report: AssessmentReport, logs: ToolCallLog[]): Promise<{ narrative: string; provider: string }> {
    const prompt =
      "You are a senior insurance claims assessor. Based ONLY on the grounded assessment " +
      "data below (do not invent policy terms, amounts, or clauses), write a concise 3-5 " +
      "sentence summary for a human reviewer explaining the recommendation.\n\n" +
      `ASSESSMENT:\n${JSON.stringify(report, null, 2)}\n\nTOOL TRACE:\n${JSON.stringify(logs, null, 2)}`;

    const { text, provider } = await this.chat(prompt);

    if (text) return { narrative: text, provider };

    return { narrative: this.template(report), provider: "template" };
  }

  private async callProvider(provider: Provider, prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const res = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.apiKey}` },
        body: JSON.stringify({ model: provider.model, messages: [{ role: "user", content: prompt }], max_tokens: 400 }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      const data: any = await res.json();
      const text = data?.choices?.[0]?.message?.content;

      if (!text) throw new Error("empty response");

      return String(text).trim();
    } finally {
      clearTimeout(timeout);
    }
  }

  private template(report: AssessmentReport): string {
    const b = report.benefit_calculation;

    if (report.recommendation === "APPROVE") {
      return (
        `Claim ${report.claim_id} is recommended for APPROVAL. All required documents are complete, ` +
        `the policy is active and in-period, and the treatment is medically necessary. Payable: ` +
        `${b.covered_amount} (member copay ${b.copay_amount}), within the remaining annual limit.`
      );
    }

    if (report.recommendation === "REQUEST_MORE_INFO") {
      return (
        `Claim ${report.claim_id} cannot be finalised yet: one or more required documents are missing, ` +
        `incomplete, or the wrong type. The claim is otherwise valid, so the recommendation is to ` +
        `REQUEST MORE INFORMATION rather than reject.`
      );
    }

    return `Claim ${report.claim_id} is recommended for REJECTION. ${report.reasoning}`;
  }
}
