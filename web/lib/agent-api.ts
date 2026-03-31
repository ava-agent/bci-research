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

export async function callAgent(req: AgentRequest): Promise<string> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    throw new Error(`Agent API error: ${res.status}`);
  }

  const data: AgentResponse = await res.json();
  return data.response;
}
