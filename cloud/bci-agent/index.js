/**
 * Cloudbase Cloud Function: BCI Agent
 * Receives brain state from frontend, calls Ark Agent Plan, returns response.
 */

const DEFAULT_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/plan/v3";
const DEFAULT_ARK_CHAT_MODEL = "doubao-seed-2-0-code-preview-260215";

const SYSTEM_PROMPT = `你是一个脑机接口 AI Agent。你通过 BCI 设备接收用户的脑电信号，将解码后的意图转化为有用的响应和行动。

当前脑状态: {brain_state}
置信度: {confidence}
频带能量: {band_powers}

根据用户的脑状态和解码意图，提供有帮助的中文响应。保持回复简洁（2-3句话）。

你还可以根据脑状态推荐活动：
- focused: 专注度高，适合处理复杂任务：编程、写作、学习新概念
- relaxed: 状态放松，适合：创意思考、头脑风暴、轻松阅读
- fatigued: 检测到疲劳，建议：休息5分钟、深呼吸、喝水、站起来走动
- command: 已准备好接收指令，请下达命令`;

const INTENT_TEXT = {
  focused: "用户进入高度专注状态，可能正在集中注意力思考某个问题",
  relaxed: "用户处于放松状态，可能在休息或冥想",
  fatigued: "检测到认知疲劳信号，用户可能需要休息",
  command: "检测到意图命令信号，用户想要执行某个操作",
  idle: "用户处于空闲状态",
};

const ALLOWED_ORIGINS = [
  "https://bci.rxcloud.group",
  "http://localhost:3000",
];

const VALID_STATES = ["focused", "relaxed", "fatigued", "command", "idle"];
const BAND_NAMES = ["delta", "theta", "alpha", "beta", "gamma"];
const MAX_MESSAGE_LENGTH = 500;
const MAX_BODY_SIZE = 10240; // 10KB
const HOURLY_LIMIT = readPositiveInteger("BCI_AGENT_HOURLY_LIMIT", 20, 1, 1000);
const DAILY_LIMIT = readPositiveInteger("BCI_AGENT_DAILY_LIMIT", 500, 1, 100000);
const UPSTREAM_TIMEOUT_MS = readPositiveInteger("BCI_AGENT_UPSTREAM_TIMEOUT_MS", 20000, 1000, 60000);
const MAX_OUTPUT_TOKENS = readPositiveInteger("BCI_AGENT_MAX_OUTPUT_TOKENS", 256, 32, 1024);
const hourlyBuckets = new Map();
const dailyBuckets = new Map();

function readPositiveInteger(name, fallback, min, max) {
  const parsed = Number.parseInt(process.env[name] || "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function getCorsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  return headers;
}

function validateRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Request body must be a JSON object");
  }

  const { state, confidence, bands } = body;

  if (typeof state !== "string" || !VALID_STATES.includes(state)) {
    throw new Error(`Invalid state. Must be one of: ${VALID_STATES.join(", ")}`);
  }
  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error("Confidence must be between 0 and 1");
  }
  if (!bands || typeof bands !== "object" || Array.isArray(bands)) {
    throw new Error("Bands must be an object");
  }

  const validatedBands = {};
  for (const name of BAND_NAMES) {
    const value = bands[name];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new Error(`Band ${name} must be a non-negative number`);
    }
    validatedBands[name] = value;
  }

  if (body.message !== undefined && typeof body.message !== "string") {
    throw new Error("Message must be a string");
  }
  const message = body.message || "";
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message must be at most ${MAX_MESSAGE_LENGTH} characters`);
  }

  return {
    state,
    confidence,
    bands: validatedBands,
    message,
  };
}

function getClientId(event) {
  const headers = event.headers || {};
  const forwarded = headers["x-forwarded-for"] || headers["X-Forwarded-For"] || "";
  return (
    headers["x-real-ip"] ||
    headers["X-Real-IP"] ||
    String(forwarded).split(",")[0].trim() ||
    event.requestContext?.sourceIp ||
    "unknown"
  );
}

function consumeBucket(store, key, windowMs, limit, now) {
  const current = store.get(key);
  if (!current || now >= current.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }
  current.count += 1;
  return { allowed: true, remaining: limit - current.count, resetAt: current.resetAt };
}

function consumeRateLimit(event, now = Date.now()) {
  const clientId = getClientId(event);
  const hour = consumeBucket(hourlyBuckets, clientId, 60 * 60 * 1000, HOURLY_LIMIT, now);
  if (!hour.allowed) return hour;

  const dayKey = new Date(now).toISOString().slice(0, 10);
  const day = consumeBucket(dailyBuckets, dayKey, 24 * 60 * 60 * 1000, DAILY_LIMIT, now);
  if (!day.allowed) return day;
  return hour;
}

function getChatCompletionsUrl() {
  const baseUrl = (process.env.ARK_BASE_URL || DEFAULT_ARK_BASE_URL).replace(/\/$/, "");
  return `${baseUrl}/chat/completions`;
}

async function callArk(systemPrompt, userMessage) {
  const apiKey = process.env.ARK_API_KEY;

  if (!apiKey) {
    throw new Error("ARK_API_KEY not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(getChatCompletionsUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.ARK_CHAT_MODEL || DEFAULT_ARK_CHAT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: MAX_OUTPUT_TOKENS,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!resp.ok) {
    await resp.text();
    throw new Error(`Ark API error ${resp.status}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "无法生成回复";
}

exports.main = async (event, context) => {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const corsHeaders = getCorsHeaders(origin);
  const isHttp = typeof event.httpMethod === "string";

  if (isHttp && !ALLOWED_ORIGINS.includes(origin)) {
    return {
      statusCode: 403,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Origin not allowed" }),
    };
  }

  // CORS preflight
  if (isHttp && event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }
  if (isHttp && event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, Allow: "POST, OPTIONS" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Check body size
  const bodySize = Buffer.byteLength(event.body || "", "utf8");
  if (bodySize > MAX_BODY_SIZE) {
    return {
      statusCode: 413,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Request entity too large" }),
    };
  }

  // Parse body
  let body = {};
  try {
    if (typeof event.body === "string") {
      body = JSON.parse(event.body);
    } else if (event.body && typeof event.body === "object") {
      body = event.body;
    } else if (event.state) {
      body = event;
    }
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  // Validate input
  let validated;
  try {
    validated = validateRequest(body);
  } catch (err) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message }),
    };
  }

  const rateLimit = consumeRateLimit(event);
  if (!rateLimit.allowed) {
    return {
      statusCode: 429,
      headers: {
        ...corsHeaders,
        "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))),
      },
      body: JSON.stringify({ error: "Rate limit exceeded" }),
    };
  }

  const { state, confidence, bands, message } = validated;
  // Build prompts
  const system = SYSTEM_PROMPT
    .replace("{brain_state}", state)
    .replace("{confidence}", `${Math.round(confidence * 100)}%`)
    .replace("{band_powers}", JSON.stringify(bands));

  let intentText = INTENT_TEXT[state] || "未知状态";
  if (message) {
    intentText += `\n\n用户消息: ${message}`;
  }
  const userContent = `[BCI 意图解码] ${intentText}`;

  try {
    const response = await callArk(system, userContent);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ response }),
    };
  } catch (err) {
    console.error("Internal error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Internal server error",
        requestId: context?.requestId,
      }),
    };
  }
};

exports.__testing = {
  getCorsHeaders,
  validateRequest,
  consumeRateLimit,
  resetRateLimits() {
    hourlyBuckets.clear();
    dailyBuckets.clear();
  },
};
