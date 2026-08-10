const { afterEach, beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");

const handlerModule = require("./index.js");
const { main, __testing } = handlerModule;

const originalFetch = global.fetch;
const originalApiKey = process.env.ARK_API_KEY;

function validBody(overrides = {}) {
  return {
    state: "focused",
    confidence: 0.8,
    bands: {
      delta: 0.1,
      theta: 0.2,
      alpha: 0.3,
      beta: 0.4,
      gamma: 0.5,
    },
    ...overrides,
  };
}

function request(body, overrides = {}) {
  return {
    httpMethod: "POST",
    headers: {
      origin: "https://bci.rxcloud.group",
      "x-real-ip": "203.0.113.10",
      ...(overrides.headers || {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
    ...overrides,
  };
}

beforeEach(() => {
  __testing.resetRateLimits();
  process.env.ARK_API_KEY = "test-key";
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: "测试回复" } }] }),
  });
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.ARK_API_KEY;
  else process.env.ARK_API_KEY = originalApiKey;
});

describe("BCI Agent HTTP protection", () => {
  it("rejects an untrusted browser origin before calling Ark", async () => {
    let fetchCalls = 0;
    global.fetch = async () => {
      fetchCalls += 1;
      throw new Error("must not be called");
    };

    const response = await main(request(validBody(), {
      headers: { origin: "https://attacker.invalid" },
    }), {});

    assert.equal(response.statusCode, 403);
    assert.equal(response.headers["Access-Control-Allow-Origin"], undefined);
    assert.equal(fetchCalls, 0);
  });

  it("accepts preflight only from an allowed origin", async () => {
    const response = await main(request("", { httpMethod: "OPTIONS" }), {});

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers["Access-Control-Allow-Origin"], "https://bci.rxcloud.group");
    assert.equal(response.headers.Vary, "Origin");
  });

  it("rejects non-POST methods", async () => {
    const response = await main(request("", { httpMethod: "GET" }), {});

    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.Allow, "POST, OPTIONS");
  });

  it("rejects an empty object without calling Ark", async () => {
    let fetchCalls = 0;
    global.fetch = async () => {
      fetchCalls += 1;
      throw new Error("must not be called");
    };

    const response = await main(request({}), {});

    assert.equal(response.statusCode, 400);
    assert.match(JSON.parse(response.body).error, /Invalid state/);
    assert.equal(fetchCalls, 0);
  });

  it("rejects oversized bodies", async () => {
    const response = await main(request("x".repeat(10241)), {});

    assert.equal(response.statusCode, 413);
  });

  it("limits each client to twenty accepted requests per hour", async () => {
    for (let index = 0; index < 20; index += 1) {
      const response = await main(request(validBody()), {});
      assert.equal(response.statusCode, 200);
    }

    const response = await main(request(validBody()), {});
    assert.equal(response.statusCode, 429);
    assert.ok(Number(response.headers["Retry-After"]) > 0);
  });
});
