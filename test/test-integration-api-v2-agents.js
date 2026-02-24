const request = require("supertest");
const assert = require("assert");

const app = require("../config/app");

describe("Integration API v2 - Agents and Logs", function () {
  this.timeout(20000);

  function expectNotServerError(res) {
    const allowedWhenBackendIsDown = [502, 503];
    assert.ok(
      res.status < 500 || allowedWhenBackendIsDown.includes(res.status),
      `Expected < 500 or 502/503 backend-unavailable, got ${res.status}`
    );
  }

  function expectJsonContractOn200(res) {
    if (res.status !== 200) return;
    assert.ok(
      (res.headers["content-type"] || "").includes("application/json"),
      `Expected JSON content-type, got ${res.headers["content-type"]}`
    );
    assert.ok(res.body !== null && res.body !== undefined, "Expected non-empty JSON body");
  }

  function expectSearchContractOn200(res){
    if(res.status !== 200) return;

    assert.ok(
      (res.headers["content-type"] || "").includes("application/json"),
      `Expected JSON content-type, got ${res.headers["content-type"]}`
    );
    assert.strictEqual(typeof res.body, "object");
    assert.ok(!Array.isArray(res.body), "Expected object response for search");
    assert.ok(Array.isArray(res.body.results), "Expected body.results to be an array");

    if(res.body.total_results !== undefined){
      assert.ok(
        Number.isFinite(Number(res.body.total_results)),
        "Expected body.total_results to be numeric"
      );
    }
  }

  it("GET /dataset/api/v2/agent/list", async () => {
    const res = await request(app).get("/dataset/api/v2/agent/list");
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/agent/search without q -> 400", async () => {
    const res = await request(app).get("/dataset/api/v2/agent/search");
    assert.strictEqual(res.status, 400);
  });

  it("GET /dataset/api/v2/agent/search?q=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/agent/search")
      .query({ q: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
    expectSearchContractOn200(res);
  });

  it("GET /dataset/api/v2/agent/info?agent=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/agent/info")
      .query({ agent: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/log/queryEvent with minimal params", async () => {
    const res = await request(app).get("/dataset/api/v2/log/queryEvent").query({
      date: new Date().toISOString(),
      sessionId: "test-session",
      searchWords: "test",
      page: "1",
      nbResults: "0",
      results: "[]",
    });
    expectNotServerError(res);
    if (res.status === 200) {
      assert.strictEqual(typeof res.text, "string");
    }
  });
});
