const request = require("supertest");
const assert = require("assert");

const app = require("../../config/app");

describe("Contract API v2 - Agent List", function () {
  this.timeout(20000);

  it("returns 200, JSON and array of agents", async () => {
    const res = await request(app).get("/dataset/api/v2/agent/list");

    assert.strictEqual(res.status, 200);
    assert.ok(
        (res.headers["content-type"] || "").includes("application/json"),
        `Expected JSON content-type, got: ${res.headers["content-type"]}`
    );
    assert.ok(Array.isArray(res.body), "Expected response to be an array");

    if(res.body.length > 0){
        const first = res.body[0];
        assert.strictEqual(typeof first, "object");
        assert.strictEqual(typeof first.name, "string");
        assert.ok(first.name.length > 0, "Expected agent.name to be non-empty");
    }
  });
});
