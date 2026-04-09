import type { BandPowers } from "./band-analyzer";

interface AgentRequest {
  state: string;
  confidence: number;
  bands: BandPowers;
  message?: string;
}

interface AgentResponse {
  response: string;
}

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL ?? "/api/agent";
const TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("请求超时或已取消");
    }
    throw error;
  }
}

export async function callAgent(
  req: AgentRequest,
  signal?: AbortSignal,
  retries = MAX_RETRIES
): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetchWithTimeout(
        API_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        },
        TIMEOUT_MS,
        signal
      );

      if (!res.ok) {
        throw new Error(`Agent API error: ${res.status}`);
      }

      const data: AgentResponse = await res.json();
      return data.response;
    } catch (error) {
      if (signal?.aborted || i === retries) {
        throw error;
      }
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error("Unexpected error");
}
