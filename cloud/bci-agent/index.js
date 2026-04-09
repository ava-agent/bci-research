/**
 * Cloudbase Cloud Function: BCI Agent
 * Receives brain state from frontend, calls GLM-4-Flash, returns response.
 */

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
  "https://bci-agent-demo.vercel.app",
  "https://bci-agent-demo-k25yltdyi-kevintens-projects.vercel.app",
  "http://localhost:3000",
];

const VALID_STATES = ["focused", "relaxed", "fatigued", "command", "idle"];
const MAX_MESSAGE_LENGTH = 500;
const MAX_BODY_SIZE = 10240; // 10KB

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };
}

function validateRequest(body) {
  const state = body.state || "idle";
  const confidence = parseFloat(body.confidence) || 0.5;
  const message = String(body.message || "").substring(0, MAX_MESSAGE_LENGTH);

  if (!VALID_STATES.includes(state)) {
    throw new Error(`Invalid state. Must be one of: ${VALID_STATES.join(", ")}`);
  }
  if (confidence < 0 || confidence > 1) {
    throw new Error("Confidence must be between 0 and 1");
  }

  return {
    state,
    confidence: Math.min(Math.max(confidence, 0), 1),
    bands: body.bands || {},
    message,
  };
}

async function callGLM(systemPrompt, userMessage, apiKey) {
  if (!apiKey) {
    throw new Error("GLM_API_KEY not configured");
  }

  const resp = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "glm-4-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GLM API error ${resp.status}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "无法生成回复";
}

exports.main = async (event, context) => {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const corsHeaders = getCorsHeaders(origin);

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
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

  const { state, confidence, bands, message } = validated;
  const apiKey = process.env.GLM_API_KEY;

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
    const response = await callGLM(system, userContent, apiKey);
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
        requestId: context.requestId,
      }),
    };
  }
};
