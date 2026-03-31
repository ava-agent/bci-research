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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

async function callGLM(systemPrompt, userMessage) {
  const apiKey = process.env.GLM_API_KEY || "";
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
    throw new Error(`GLM API error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "无法生成回复";
}

exports.main = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
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
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const state = body.state || "idle";
  const confidence = body.confidence || 0.5;
  const bands = body.bands || {};
  const userMessage = body.message || "";

  // Build prompts
  const system = SYSTEM_PROMPT
    .replace("{brain_state}", state)
    .replace("{confidence}", `${Math.round(confidence * 100)}%`)
    .replace("{band_powers}", JSON.stringify(bands));

  let intentText = INTENT_TEXT[state] || "未知状态";
  if (userMessage) {
    intentText += `\n\n用户消息: ${userMessage}`;
  }
  const userContent = `[BCI 意图解码] ${intentText}`;

  try {
    const response = await callGLM(system, userContent);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ response }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
